import chalk from "chalk";
import { Command, CommandRunner, Option } from "nest-commander";
import { DEFAULT_API_PORT } from "../common/constants";
import { startHttpServer } from "../http/bootstrap";
import { createGracefulShutdownHandler } from "../utils/graceful-shutdown";

// Default hosted web app URL (fallback when bundled assets unavailable or --web-url provided)
const HOSTED_WEB_URL = "https://adk-web.iqai.com";

interface WebCommandOptions {
	port?: number;
	dir?: string;
	host?: string;
	webUrl?: string;
}

@Command({
	name: "web",
	description: "Start a web interface for testing agents",
})
export class WebCommand extends CommandRunner {
	async run(
		_passedParams: string[],
		options?: WebCommandOptions,
	): Promise<void> {
		const apiPort = options?.port ?? DEFAULT_API_PORT;
		const host = options?.host ?? "localhost";
		const agentsDir = options?.dir ?? process.cwd();

		// Determine mode: bundled (default) vs hosted (when --web-url provided)
		const useHostedMode = !!options?.webUrl;
		const webUrl = options?.webUrl ?? HOSTED_WEB_URL;

		console.log(chalk.blue("🌐 Starting ADK-TS Web Interface..."));

		// Start the server with web serving enabled in bundled mode
		const server = await startHttpServer({
			port: apiPort,
			host,
			agentsDir,
			quiet: true,
			serveWeb: !useHostedMode, // Only serve bundled web UI if not using hosted mode
		});

		// Determine what URL to show the user
		if (!useHostedMode && server.webAssetsAvailable) {
			// BUNDLED MODE: Web UI is served on the same port as API
			const localUrl = `http://${host}:${apiPort}`;
			console.log(chalk.green("✅ Web UI and API running on the same server"));
			console.log(chalk.cyan(`🔗 Open in your browser: ${localUrl}`));
		} else {
			// HOSTED MODE: Either explicitly requested or bundled assets not available
			if (!useHostedMode && !server.webAssetsAvailable) {
				console.log(
					chalk.yellow(
						"⚠️  Bundled web assets not found. Falling back to hosted version.",
					),
				);
				console.log(
					chalk.gray(
						"   Run 'pnpm build' in the adk-cli package to enable bundled mode.",
					),
				);
			}

			// Build the web app URL - add port param if not using default
			const url = new URL(webUrl);
			if (apiPort !== DEFAULT_API_PORT) {
				url.searchParams.set("port", apiPort.toString());
			}
			const webAppUrl = url.toString();

			console.log(chalk.cyan(`🔗 Open this URL in your browser: ${webAppUrl}`));
			console.log(chalk.gray(`   API Server: http://${host}:${apiPort}`));
		}

		console.log(chalk.cyan("Press Ctrl+C to stop the server"));

		// Graceful shutdown with single-invocation guard and force-exit fallback
		const cleanup = createGracefulShutdownHandler(server, {
			quiet: false, // web command always shows output
			name: "server",
		});

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		// Keep the process running
		await new Promise(() => {});
	}

	@Option({
		flags: "-p, --port <port>",
		description: "Port for API server (and web UI in bundled mode)",
	})
	parsePort(val: string): number {
		return Number(val);
	}

	@Option({
		flags: "-h, --host <host>",
		description: "Host for servers",
	})
	parseHost(val: string): string {
		return val;
	}

	@Option({
		flags: "-d, --dir <directory>",
		description: "Directory to scan for agents (default: current directory)",
	})
	parseDir(val: string): string {
		return val;
	}

	@Option({
		flags: "--web-url <url>",
		description:
			"Use hosted web UI instead of bundled (e.g., https://adk-web.iqai.com)",
	})
	parseWebUrl(val: string): string {
		return val;
	}
}
