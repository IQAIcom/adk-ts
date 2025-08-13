import { existsSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { ADKServer } from "../server/index.js";

export interface ServeOptions {
	port?: number;
	dir?: string;
	host?: string;
	quiet?: boolean;
}

export async function serveCommand(
	options: ServeOptions = {},
): Promise<ADKServer> {
	const port = options.port || 8042; // Default to port 8042 to avoid common conflicts
	const host = options.host || "localhost";
	const agentsDir = resolve(options.dir || ".");

	if (!existsSync(agentsDir)) {
		console.error(chalk.red(`❌ Directory not found: ${agentsDir}`));
		process.exit(1);
	}

	if (!options.quiet) {
		console.log(chalk.blue(`🚀 ADK Server starting on http://${host}:${port}`));
	}

	const server = new ADKServer(agentsDir, port, host, options.quiet);

	try {
		await server.start();

		if (!options.quiet) {
			console.log(chalk.green("✅ Server ready"));
		}

		// Handle shutdown gracefully
		const cleanup = async () => {
			if (!options.quiet) {
				console.log(chalk.yellow("\n🛑 Stopping server..."));
			}
			await server.stop();
			process.exit(0);
		};

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		return server;
	} catch (error) {
		console.error(chalk.red("❌ Failed to start ADK server:"), error);
		process.exit(1);
	}
}
