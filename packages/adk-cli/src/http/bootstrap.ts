import "reflect-metadata";
import type { FSWatcher } from "node:fs";
import { existsSync, readFileSync, watch } from "node:fs";
import { resolve, sep } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import z from "zod";
import { environmentEnum, envSchema } from "../common/schema";
import { HttpModule } from "./http.module";
import { AgentManager } from "./providers/agent-manager.service";
import { DIRECTORIES_TO_SKIP } from "./providers/agent-scanner.service";
import { HotReloadService } from "./reload/hot-reload.service";
import type { RuntimeConfig } from "./runtime-config";

function pathHasSkippedDir(p: string): boolean {
	const parts = p.split(sep).filter(Boolean);
	return parts.some((part) =>
		(DIRECTORIES_TO_SKIP as readonly string[]).includes(part),
	);
}

function loadGitignorePrefixes(rootDir: string): string[] {
	try {
		const igPath = resolve(rootDir, ".gitignore");
		if (!existsSync(igPath)) return [];
		const lines = readFileSync(igPath, "utf8").split("\n");
		const prefixes: string[] = [];
		for (const raw of lines) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) continue;
			if (/[?*[\]]/.test(line)) continue;
			const normalized = line.replace(/\/+$/, "");
			const abs = resolve(rootDir, normalized);
			prefixes.push(abs + sep);
		}
		return prefixes;
	} catch {
		return [];
	}
}

function shouldIgnorePath(fullPath: string, prefixes: string[]): boolean {
	if (pathHasSkippedDir(fullPath)) return true;
	for (const pref of prefixes) {
		if (fullPath.startsWith(pref)) return true;
	}
	return false;
}

/**
 * Setup hot reload file watching with .gitignore filtering and well-known directory skips.
 * Returns watcher/timeout references and a teardown function to close resources.
 */
function setupHotReload(
	agentManager: AgentManager,
	hotReload: HotReloadService | undefined,
	config: RuntimeConfig,
	env: z.infer<typeof envSchema>,
): {
	watchers: FSWatcher[];
	debouncers: NodeJS.Timeout[];
	teardownHotReload: () => void;
} {
	const watchers: FSWatcher[] = [];
	const debouncers: NodeJS.Timeout[] = [];
	const shouldWatch =
		config.hotReload ?? env.NODE_ENV !== environmentEnum.enum.production;
	const debug = env.ADK_DEBUG;

	if (!shouldWatch) {
		return { watchers, debouncers, teardownHotReload: () => {} };
	}

	const rootDir = process.cwd();
	const gitignorePrefixes = loadGitignorePrefixes(rootDir);
	const rawPaths =
		Array.isArray(config.watchPaths) && config.watchPaths.length > 0
			? config.watchPaths
			: [rootDir];
	const paths = rawPaths.filter(Boolean).map((p) => resolve(p as string));

	for (const p of paths) {
		try {
			const watcher = watch(p, { recursive: true }, (_event, filename) => {
				const fullPath =
					typeof filename === "string" ? resolve(p, filename) : p;
				if (shouldIgnorePath(fullPath, gitignorePrefixes)) {
					if (!config.quiet && debug)
						console.log(`[hot-reload] Ignored change in ${fullPath}`);
					return;
				}
				while (debouncers.length) {
					const t = debouncers.pop();
					if (t) clearTimeout(t);
				}
				const t = setTimeout(async () => {
					try {
						const stateChanged = await agentManager.hasInitialStateChanged();
						if (stateChanged) {
							if (!config.quiet && debug)
								console.log(
									"[hot-reload] Initial state changed - performing full reload (sessions will be cleared)",
								);
							agentManager.stopAllAgents();
							agentManager.scanAgents(config.agentsDir);
							for (const agentPath of agentManager.getAgents().keys()) {
								try {
									await agentManager.startAgent(agentPath, undefined, true);
									if (!config.quiet && debug)
										console.log(
											`[hot-reload] Full reload completed for ${agentPath}`,
										);
								} catch (e) {
									if (!config.quiet)
										console.error(
											`[hot-reload] Failed to full reload agent ${agentPath}:`,
											e,
										);
								}
							}
						} else {
							const preservedSessions = agentManager.getLoadedAgentSessions();
							if (!config.quiet && debug)
								console.log(
									`[hot-reload] Code changed - preserving ${preservedSessions.size} session(s)`,
								);
							agentManager.stopAllAgents();
							agentManager.scanAgents(config.agentsDir);
							for (const [
								agentPath,
								sessionId,
							] of preservedSessions.entries()) {
								try {
									await agentManager.startAgent(agentPath, sessionId);
									if (!config.quiet && debug)
										console.log(
											`[hot-reload] Restored session ${sessionId} for ${agentPath}`,
										);
								} catch (e) {
									if (!config.quiet)
										console.error(
											`[hot-reload] Failed to restore agent ${agentPath}:`,
											e,
										);
								}
							}
						}
						if (!config.quiet && debug)
							console.log(
								`[hot-reload] Reloaded agents after change in ${filename ?? p}`,
							);
						try {
							hotReload?.broadcastReload(
								typeof filename === "string" ? filename : null,
							);
						} catch (e) {
							if (debug)
								console.warn(
									"[hot-reload] Failed to broadcast reload message",
									e,
								);
						}
					} catch (e) {
						console.error("[hot-reload] Error during reload:", e);
					}
				}, 300);
				debouncers.push(t);
			});
			watchers.push(watcher);
			if (!config.quiet && debug) console.log(`[hot-reload] Watching ${p}`);
		} catch (e) {
			console.warn(
				`[hot-reload] Failed to watch ${p}: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	const teardownHotReload = () => {
		for (const t of debouncers) clearTimeout(t);
		for (const w of watchers) {
			try {
				w.close();
			} catch {}
		}
		try {
			hotReload?.closeAll();
		} catch {}
	};

	return { watchers, debouncers, teardownHotReload };
}

export interface StartedHttpServer {
	app: NestExpressApplication;
	url: string;
	stop: () => Promise<void>;
}

/**
 * Start a Nest Express HTTP server with the ADK controllers and providers.
 * Mirrors previous Hono server endpoints:
 * - GET /health
 * - /api/agents ...
 * - /api/agents/:id/sessions ...
 */
export async function startHttpServer(
	config: RuntimeConfig,
): Promise<StartedHttpServer> {
	const env = envSchema.parse(process.env);
	const debug = env.ADK_DEBUG;

	const app = await NestFactory.create<NestExpressApplication>(
		HttpModule.register(config),
		{
			logger: debug
				? ["log", "error", "warn", "debug", "verbose"]
				: ["error", "warn"],
		},
	);

	app.enableCors({
		origin: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});

	const bodyLimit = env.ADK_HTTP_BODY_LIMIT;
	app.useBodyParser("json", { limit: bodyLimit });
	app.useBodyParser("urlencoded", { limit: bodyLimit, extended: true });

	const agentManager = app.get(AgentManager, { strict: false });
	const hotReload = app.get(HotReloadService, { strict: false });
	agentManager.scanAgents(config.agentsDir);

	const enableSwagger =
		config.swagger ?? env.NODE_ENV !== environmentEnum.enum.production;
	if (enableSwagger) {
		const builder = new DocumentBuilder()
			.setTitle("ADK HTTP API")
			.setDescription(
				"REST endpoints for managing and interacting with ADK agents",
			)
			.setVersion("1.0.0")
			.addTag("agents")
			.addTag("sessions")
			.addTag("events")
			.addTag("state")
			.addTag("messaging")
			.addTag("health")
			.build();
		const document = SwaggerModule.createDocument(app, builder, {
			deepScanRoutes: true,
		});
		SwaggerModule.setup("docs", app, document, {
			customSiteTitle: "ADK API Docs",
			jsonDocumentUrl: "/openapi.json",
		});
		if (!config.quiet && debug)
			console.log("[openapi] Docs available at /docs (json: /openapi.json)");
	}

	const { teardownHotReload } = setupHotReload(
		agentManager,
		hotReload,
		config,
		env,
	);

	await app.listen(config.port, config.host);
	const url = `http://${config.host}:${config.port}`;

	const stop = async () => {
		try {
			agentManager.stopAllAgents();
		} finally {
			try {
				teardownHotReload();
			} catch {}
			await app.close();
		}
	};

	return { app, url, stop };
}
