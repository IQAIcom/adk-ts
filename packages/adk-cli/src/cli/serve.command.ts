import chalk from "chalk";
import { Command, CommandRunner, Option } from "nest-commander";
import { startHttpServer } from "../http/bootstrap";
import { createGracefulShutdownHandler } from "../utils/graceful-shutdown";

interface ServeCommandOptions {
	port?: number;
	host?: string;
	dir?: string;
	quiet?: boolean;
	swagger?: boolean;
	noSwagger?: boolean;
}

@Command({
	name: "serve",
	description: "Start an API server for agent management",
})
export class ServeCommand extends CommandRunner {
	async run(
		_passedParams: string[],
		options?: ServeCommandOptions,
	): Promise<void> {
		const port = options?.port ?? 8042;
		const host = options?.host ?? "localhost";
		const agentsDir = options?.dir ?? process.cwd();
		const quiet = !!options?.quiet;
		let swagger: boolean | undefined;
		if (options?.swagger) swagger = true;
		else if (options?.noSwagger) swagger = false;

		if (!quiet) {
			console.log(
				chalk.blue(`🚀 ADK Server starting on http://${host}:${port}`),
			);
		}

		const server = await startHttpServer({
			port,
			host,
			agentsDir,
			quiet,
			swagger,
		});

		if (!quiet) {
			console.log(chalk.green("✅ Server ready"));
			console.log(chalk.cyan("Press Ctrl+C to stop the server"));
		}

		// Graceful shutdown with single-invocation guard and force-exit fallback
		const cleanup = createGracefulShutdownHandler(server, {
			quiet,
			name: "server",
		});

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		// Keep process running
		await new Promise(() => {});
	}

	@Option({
		flags: "-p, --port <port>",
		description: "Port for the server",
	})
	parsePort(val: string): number {
		return Number(val);
	}

	@Option({
		flags: "-h, --host <host>",
		description: "Host for the server",
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
		flags: "-q, --quiet",
		description: "Reduce logging output",
		defaultValue: false,
	})
	parseQuiet(): boolean {
		return true;
	}

	@Option({
		flags: "--swagger",
		description:
			"Force enable OpenAPI docs (overrides default NODE_ENV-based behavior)",
	})
	parseSwagger(): boolean {
		return true;
	}

	@Option({
		flags: "--no-swagger",
		description: "Disable OpenAPI docs (even in non-production)",
	})
	parseNoSwagger(): boolean {
		return true;
	}
}
