import chalk from "chalk";
import { Command, CommandRunner, Option } from "nest-commander";
import { startHttpServer } from "../http/bootstrap";

interface WebCommandOptions {
	port?: number;
	dir?: string;
	host?: string;
	webPort?: number;
	local?: boolean;
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
		const webPort = options?.webPort ?? 3000;
		const host = options?.host ?? "localhost";
		const useLocal = options?.local ?? false;
		const webUrl = options?.webUrl ?? "https://adk-web.iqai.com";

		console.log(chalk.blue("🌐 Starting ADK Web Interface..."));

		// Start the API server first (quiet)
		const server = await startHttpServer({
			port: apiPort,
			host,
			agentsDir: options?.dir ?? process.cwd(),
			quiet: true,
		});

		let webAppUrl: string;
		if (useLocal) {
			// Local development: assume web app is already running on webPort
			if (apiPort === 8042) {
				webAppUrl = `http://${host}:${webPort}`;
			} else {
				webAppUrl = `http://${host}:${webPort}?port=${apiPort}`;
			}
		} else {
			// Production hosted UI
			if (apiPort === 8042) {
				webAppUrl = webUrl;
			} else {
				webAppUrl = `${webUrl}?port=${apiPort}`;
			}
		}

		console.log(chalk.cyan(`🔗 Open this URL in your browser: ${webAppUrl}`));
		console.log(chalk.gray(`   API Server: http://${host}:${apiPort}`));
		console.log(chalk.cyan("Press Ctrl+C to stop the API server"));

		const cleanup = async () => {
			console.log(chalk.yellow("\n🛑 Stopping API server..."));
			await server.stop();
			process.exit(0);
		};

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
		flags: "--web-port <port>",
		description: "Port for web app (when using --local)",
	})
	parseWebPort(val: string): number {
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
		flags: "--local",
		description: "Run local web app instead of opening production URL",
	})
	parseLocal(): boolean {
		return true;
	}

	@Option({
		flags: "--web-url <url>",
		description: "URL of the web application (used when not --local)",
	})
	parseWebUrl(val: string): string {
		return val;
	}
}
