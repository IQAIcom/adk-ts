import chalk from "chalk";
import { Command, CommandRunner, Option } from "nest-commander";
import { startHttpServer } from "../http/bootstrap";
import { createGracefulShutdownHandler } from "../utils/graceful-shutdown";

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
		const apiPort = options?.port ?? 8042;
		const host = options?.host ?? "localhost";
		const webUrl = options?.webUrl ?? "https://adk-web.iqai.com";

		console.log(chalk.blue("🌐 Starting ADK Web Interface..."));

		// Start the API server first (quiet)
		const server = await startHttpServer({
			port: apiPort,
			host,
			agentsDir: options?.dir ?? process.cwd(),
			quiet: true,
		});

		// Build the web app URL - add port param if not using default
		const url = new URL(webUrl);
		if (apiPort !== 8042) {
			url.searchParams.set("port", apiPort.toString());
		}
		const webAppUrl = url.toString();

		console.log(chalk.cyan(`🔗 Open this URL in your browser: ${webAppUrl}`));
		console.log(chalk.gray(`   API Server: http://${host}:${apiPort}`));
		console.log(chalk.cyan("Press Ctrl+C to stop the API server"));

		// Graceful shutdown with single-invocation guard and force-exit fallback
		const cleanup = createGracefulShutdownHandler(server, {
			quiet: false, // web command always shows output
			name: "API server",
		});

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		// Keep the process running
		await new Promise(() => {});
	}

	@Option({
		flags: "-p, --port <port>",
		description: "Port for API server",
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
		description: "URL of the web application",
	})
	parseWebUrl(val: string): string {
		return val;
	}
}
