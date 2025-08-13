import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import type { LlmAgent } from "@iqai/adk";
import { AgentBuilder, InMemorySessionService } from "@iqai/adk";
import type { EnhancedRunner } from "@iqai/adk";
import { Hono } from "hono";
import { cors } from "hono/cors";

interface Agent {
	relativePath: string;
	name: string;
	absolutePath: string;
	instance?: LlmAgent; // Store the loaded agent instance
}

interface LoadedAgent {
	agent: LlmAgent;
	runner: EnhancedRunner; // AgentBuilder's enhanced runner
	sessionId: string; // Session ID for this agent instance
	userId: string; // User ID for session management
	appName: string; // App name for session management
}

export class ADKServer {
	private agents: Map<string, Agent> = new Map();
	private loadedAgents: Map<string, LoadedAgent> = new Map();
	private sessionService: InMemorySessionService;
	private app: Hono;
	private server: any;
	private agentsDir: string;
	private port: number;
	private host: string;
	private quiet: boolean;

	constructor(
		agentsDir: string,
		port = 8042,
		host = "localhost",
		quiet = false,
	) {
		this.agentsDir = agentsDir;
		this.port = port;
		this.host = host;
		this.quiet = quiet;
		this.sessionService = new InMemorySessionService();
		this.app = new Hono();
		this.setupRoutes();
		this.scanAgents();
	}

	private setupRoutes(): void {
		// CORS middleware
		this.app.use("/*", cors());

		// Health check
		this.app.get("/health", (c) => c.json({ status: "ok" }));

		// List agents
		this.app.get("/api/agents", (c) => {
			const agentsList = Array.from(this.agents.values()).map((agent) => ({
				path: agent.absolutePath,
				name: agent.name,
				directory: agent.absolutePath,
				relativePath: agent.relativePath,
			}));
			return c.json({ agents: agentsList });
		});

		// Refresh agents list
		this.app.post("/api/agents/refresh", (c) => {
			this.scanAgents();
			const agentsList = Array.from(this.agents.values()).map((agent) => ({
				path: agent.absolutePath,
				name: agent.name,
				directory: agent.absolutePath,
				relativePath: agent.relativePath,
			}));
			return c.json({ agents: agentsList });
		});

		// Removed explicit start/stop and running status endpoints; agents are auto-loaded on message

		// Get agent messages
		this.app.get("/api/agents/:id/messages", async (c) => {
			const agentPath = decodeURIComponent(c.req.param("id"));
			const loadedAgent = this.loadedAgents.get(agentPath);
			if (!loadedAgent) {
				return c.json({ messages: [] });
			}

			try {
				// Get session from session service
				const session = await this.sessionService.getSession(
					loadedAgent.appName,
					loadedAgent.userId,
					loadedAgent.sessionId,
				);

				if (!session || !session.events) {
					return c.json({ messages: [] });
				}

				// Convert session events to message format
				// TODO(adk-web/tool-calls): Enhance this endpoint to better represent tool activity.
				// - Option A: Do not persist or return assistant events with empty text (current web filters these client-side).
				// - Option B: Keep raw history but add a query flag like `includeEmpty=false` to suppress blanks for clients that want clean text-only history.
				// - Option C (preferred): Emit explicit tool events, e.g., { type: "tool", name, args, output, status, timestamps } derived from non-text parts.
				//   This enables the web UI to render compact "Used tool: <name>" chips and show outputs, instead of blank assistant messages.
				//   When implemented, maintain backward compatibility by keeping the current shape under a flag (e.g., `format=legacy`).
				const messages = session.events.map((event, index) => ({
					id: index + 1,
					type: event.author === "user" ? "user" : "assistant",
					content:
						event.content?.parts
							?.map((part) =>
								typeof part === "object" && "text" in part ? part.text : "",
							)
							.join("") || "",
					timestamp: new Date(event.timestamp || Date.now()).toISOString(),
				}));

				return c.json({ messages });
			} catch (error) {
				console.error("Error fetching messages:", error);
				return c.json({ messages: [] });
			}
		});

		// Send message to agent
		this.app.post("/api/agents/:id/message", async (c) => {
			const agentPath = decodeURIComponent(c.req.param("id"));
			const { message } = await c.req.json();
			const response = await this.sendMessageToAgent(agentPath, message);
			return c.json({ response });
		});
	}

	private scanAgents(): void {
		this.agents.clear();

		// Use current directory if agentsDir doesn't exist or is empty
		const scanDir =
			!this.agentsDir || !existsSync(this.agentsDir)
				? process.cwd()
				: this.agentsDir;

		const shouldSkipDirectory = (dirName: string): boolean => {
			const skipDirs = [
				"node_modules",
				".git",
				".next",
				"dist",
				"build",
				".turbo",
				"coverage",
				".vscode",
				".idea",
			];
			return skipDirs.includes(dirName);
		};

		const scanDirectory = (dir: string): void => {
			if (!existsSync(dir)) return;

			const items = readdirSync(dir);
			for (const item of items) {
				const fullPath = join(dir, item);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					// Skip common build/dependency directories
					if (!shouldSkipDirectory(item)) {
						scanDirectory(fullPath);
					}
				} else if (item === "agent.ts" || item === "agent.js") {
					const relativePath = relative(scanDir, dir);

					// Try to get the actual agent name if it's already loaded
					const loadedAgent = this.loadedAgents.get(relativePath);
					let agentName = relativePath.split("/").pop() || "unknown";

					// If agent is loaded, use its actual name
					if (loadedAgent?.agent?.name) {
						agentName = loadedAgent.agent.name;
					} else {
						// Try to quickly extract name from agent file if not loaded
						try {
							const agentFilePath = join(dir, item);
							agentName =
								this.extractAgentNameFromFile(agentFilePath) || agentName;
						} catch {
							// Fallback to directory name if extraction fails
						}
					}

					this.agents.set(relativePath, {
						relativePath,
						name: agentName,
						absolutePath: dir,
						instance: loadedAgent?.agent,
					});
				}
			}
		};

		scanDirectory(scanDir);
		if (!this.quiet) {
			console.log(`✅ Agent scan complete. Found ${this.agents.size} agents.`);
		}
	}

	private async startAgent(agentPath: string): Promise<void> {
		const agent = this.agents.get(agentPath);
		if (!agent) {
			throw new Error(`Agent not found: ${agentPath}`);
		}

		if (this.loadedAgents.has(agentPath)) {
			return; // Already running
		}

		try {
			// Load the agent module dynamically
			// Try both .js and .ts files, prioritizing .js if it exists
			let agentFilePath = join(agent.absolutePath, "agent.js");
			if (!existsSync(agentFilePath)) {
				agentFilePath = join(agent.absolutePath, "agent.ts");
			}

			if (!existsSync(agentFilePath)) {
				throw new Error(
					`No agent.js or agent.ts file found in ${agent.absolutePath}`,
				);
			}

			// Load environment variables from the project directory before importing
			let projectRoot = dirname(agentFilePath);
			while (projectRoot !== "/" && projectRoot !== dirname(projectRoot)) {
				if (
					existsSync(join(projectRoot, "package.json")) ||
					existsSync(join(projectRoot, ".env"))
				) {
					break;
				}
				projectRoot = dirname(projectRoot);
			}

			const envPath = join(projectRoot, ".env");
			if (existsSync(envPath)) {
				try {
					const envContent = readFileSync(envPath, "utf8");
					const envLines = envContent.split("\n");
					for (const line of envLines) {
						const trimmedLine = line.trim();
						if (trimmedLine && !trimmedLine.startsWith("#")) {
							const [key, ...valueParts] = trimmedLine.split("=");
							if (key && valueParts.length > 0) {
								const value = valueParts.join("=").replace(/^"(.*)"$/, "$1");
								// Set environment variables in current process
								process.env[key.trim()] = value.trim();
							}
						}
					}
				} catch (error) {
					console.warn(
						`⚠️ Warning: Could not load .env file: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}

			const agentFileUrl = pathToFileURL(agentFilePath).href;

			// Use dynamic import to load the agent (TS path uses esbuild wrapper returning { agent })
			const agentModule: any = agentFilePath.endsWith(".ts")
				? await this.importTypeScriptFile(agentFilePath)
				: await import(agentFileUrl);

			const resolved = await this.resolveAgentExport(agentModule);
			const exportedAgent = resolved.agent;

			// Validate basic shape
			if (!exportedAgent?.name) {
				throw new Error(
					`Invalid agent export in ${agentFilePath}. Expected an LlmAgent instance with a name property.`,
				);
			}
			// Soft validation of optional fields (model/instruction not strictly required for all custom agents)

			// Build runner/session while preserving the exact exported agent (including subAgents, tools, callbacks, etc.)
			// We use withAgent() so we don't accidentally drop configuration like subAgents which was happening before
			const agentBuilder = AgentBuilder.create(exportedAgent.name)
				.withAgent(exportedAgent as any)
				.withSessionService(this.sessionService, {
					userId: `user_${agentPath}`,
					appName: "adk-server",
				});

			const { runner, session } = await agentBuilder.build();

			// Store the loaded agent with its runner
			const loadedAgent: LoadedAgent = {
				agent: exportedAgent,
				runner: runner,
				sessionId: session.id,
				userId: `user_${agentPath}`,
				appName: "adk-server",
			};

			this.loadedAgents.set(agentPath, loadedAgent);
			agent.instance = exportedAgent;
			agent.name = exportedAgent.name;
		} catch (error) {
			console.error(`❌ Failed to load agent "${agent.name}":`, error);
			throw new Error(
				`Failed to load agent: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async stopAgent(agentPath: string): Promise<void> {
		// Deprecated: explicit stop not needed; keep method no-op for backward compatibility
		this.loadedAgents.delete(agentPath);
		const agent = this.agents.get(agentPath);
		if (agent) {
			agent.instance = undefined;
		}
	}

	private async sendMessageToAgent(
		agentPath: string,
		message: string,
	): Promise<string> {
		// Auto-start the agent if it's not already running
		if (!this.loadedAgents.has(agentPath)) {
			await this.startAgent(agentPath);
		}

		const loadedAgent = this.loadedAgents.get(agentPath);
		if (!loadedAgent) {
			throw new Error("Agent failed to start");
		}

		try {
			// Send message to the agent using the runner with session service
			// The session service will automatically handle message persistence
			const response = await loadedAgent.runner.ask(message);
			return response;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`Error sending message to agent ${agentPath}:`,
				errorMessage,
			);
			throw new Error(`Failed to send message to agent: ${errorMessage}`);
		}
	}

	/**
	 * Import a TypeScript file by compiling it on-demand
	 */
	private async importTypeScriptFile(filePath: string): Promise<any> {
		// Determine project root (for tsconfig and resolving deps)
		const startDir = dirname(filePath);
		let projectRoot = startDir;
		while (projectRoot !== "/" && projectRoot !== dirname(projectRoot)) {
			if (
				existsSync(join(projectRoot, "package.json")) ||
				existsSync(join(projectRoot, ".env"))
			) {
				break;
			}
			projectRoot = dirname(projectRoot);
		}
		// If we reached root without finding markers, use the original start directory
		if (projectRoot === "/") {
			projectRoot = startDir;
		}

		// Transpile with esbuild and import (bundles local files, preserves tools)
		try {
			const { build } = await import("esbuild");
			const cacheDir = join(projectRoot, ".adk-cache");
			if (!existsSync(cacheDir)) {
				mkdirSync(cacheDir, { recursive: true });
			}
			const outFile = join(cacheDir, `agent-${Date.now()}.mjs`);
			// Externalize bare module imports (node_modules), bundle relative/local files
			const plugin = {
				name: "externalize-bare-imports",
				setup(build: any) {
					build.onResolve({ filter: /.*/ }, (args: any) => {
						if (
							args.path.startsWith(".") ||
							args.path.startsWith("/") ||
							args.path.startsWith("..")
						) {
							return; // use default resolve (to get bundled)
						}
						return { path: args.path, external: true };
					});
				},
			};

			const tsconfigPath = join(projectRoot, "tsconfig.json");
			await build({
				entryPoints: [filePath],
				outfile: outFile,
				bundle: true,
				format: "esm",
				platform: "node",
				target: ["node22"],
				sourcemap: false,
				logLevel: "silent",
				plugins: [plugin],
				absWorkingDir: projectRoot,
				// Use tsconfig if present for path aliases
				...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
			});

			const mod = await import(
				`${pathToFileURL(outFile).href}?t=${Date.now()}`
			);
			let agentExport = (mod as any)?.agent;
			if (!agentExport && (mod as any)?.default) {
				agentExport = (mod as any).default.agent ?? (mod as any).default;
			}
			try {
				unlinkSync(outFile);
			} catch {}
			if (agentExport) {
				const isPrimitive = (v: any) =>
					v == null || ["string", "number", "boolean"].includes(typeof v);
				if (isPrimitive(agentExport)) {
					// Primitive named 'agent' export (e.g., a string) isn't a real agent; fall through to full-module scan
					if (!this.quiet) {
						console.log(
							`ℹ️ Ignoring primitive 'agent' export in ${filePath}; scanning module for factory...`,
						);
					}
				} else {
					if (!this.quiet) {
						console.log(`✅ TS agent imported via esbuild: ${filePath}`);
					}
					return { agent: agentExport };
				}
			}
			// Fallback: return full module so downstream resolver can inspect named exports (e.g., getFooAgent)
			return mod;
		} catch (e) {
			throw new Error(
				`Failed to import TS agent via esbuild: ${e instanceof Error ? e.message : String(e)}`,
			);
		}

		// unreachable
	}

	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server = serve({
				fetch: this.app.fetch,
				port: this.port,
				hostname: this.host,
			});

			// Give the server a moment to start
			setTimeout(() => {
				resolve();
			}, 100);
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve) => {
			// Stop all running agents
			for (const [agentPath] of this.loadedAgents.entries()) {
				this.stopAgent(agentPath);
			}

			if (this.server) {
				this.server.close();
			}
			resolve();
		});
	}

	public getPort(): number {
		return this.port;
	}

	private extractAgentNameFromFile(filePath: string): string | null {
		try {
			const content = readFileSync(filePath, "utf-8");

			// Look for agent name in export statements
			// Match patterns like: name: "agent_name" or name:"agent_name"
			const nameMatch = content.match(/name\s*:\s*["']([^"']+)["']/);
			if (nameMatch?.[1]) {
				return nameMatch[1];
			}

			return null;
		} catch {
			return null;
		}
	}

	// Minimal resolution logic for agent exports: supports
	// 1) export const agent = new LlmAgent(...)
	// 2) export function agent() { return new LlmAgent(...) }
	// 3) export async function agent() { return new LlmAgent(...) }
	// 4) default export (object or function) returning or containing .agent
	private async resolveAgentExport(mod: any): Promise<{ agent: LlmAgent }> {
		let candidate = mod?.agent ?? mod?.default?.agent ?? mod?.default ?? mod;

		const isLikelyAgentInstance = (obj: any) =>
			obj && typeof obj === "object" && typeof obj.name === "string";
		const isPrimitive = (v: any) =>
			v == null || ["string", "number", "boolean"].includes(typeof v);

		const invokeMaybe = async (fn: any) => {
			let out = fn();
			if (out && typeof out === "object" && "then" in out) {
				out = await out;
			}
			return out;
		};

		// If initial candidate is invalid primitive (e.g., exported const agent = "foo"), or
		// the entire module namespace (no direct agent), then probe named exports.
		if (
			(!isLikelyAgentInstance(candidate) && isPrimitive(candidate)) ||
			(!isLikelyAgentInstance(candidate) && candidate && candidate === mod)
		) {
			candidate = mod; // ensure we iterate full namespace
			for (const [key, value] of Object.entries(mod)) {
				if (key === "default") continue;
				// Prefer keys containing 'agent'
				const keyLower = key.toLowerCase();
				if (isPrimitive(value)) continue; // skip obvious non-candidates
				if (isLikelyAgentInstance(value)) {
					candidate = value;
					break;
				}
				// Handle static container object: export const container = { agent: <LlmAgent> }
				if (
					value &&
					typeof value === "object" &&
					(value as any).agent &&
					isLikelyAgentInstance((value as any).agent)
				) {
					candidate = (value as any).agent;
					break;
				}
				if (
					typeof value === "function" &&
					(/(agent|build|create)/i.test(keyLower) ||
						(value.name &&
							/(agent|build|create)/i.test(value.name.toLowerCase())))
				) {
					try {
						const maybe = await invokeMaybe(value);
						if (isLikelyAgentInstance(maybe)) {
							candidate = maybe;
							break;
						}
						if (
							maybe &&
							typeof maybe === "object" &&
							maybe.agent &&
							isLikelyAgentInstance(maybe.agent)
						) {
							candidate = maybe.agent;
							break;
						}
					} catch (e) {
						// Swallow and continue trying other exports
					}
				}
			}
		}

		// If candidate is a function (sync or async), invoke it
		if (typeof candidate === "function") {
			try {
				candidate = await invokeMaybe(candidate);
			} catch (e) {
				throw new Error(
					`Failed executing exported agent function: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		}
		// Handle built structure { agent, runner, session }
		if (
			candidate &&
			typeof candidate === "object" &&
			candidate.agent &&
			isLikelyAgentInstance(candidate.agent)
		) {
			candidate = candidate.agent;
		}
		// Unwrap { agent: ... } pattern if present
		if (candidate?.agent && isLikelyAgentInstance(candidate.agent)) {
			candidate = candidate.agent;
		}
		if (!candidate || !isLikelyAgentInstance(candidate)) {
			throw new Error(
				"No agent export resolved (expected variable, function, or function returning an agent)",
			);
		}
		return { agent: candidate as LlmAgent };
	}
}
