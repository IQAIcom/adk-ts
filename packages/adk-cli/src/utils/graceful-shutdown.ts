import chalk from "chalk";

export interface GracefulShutdownOptions {
	quiet?: boolean;
	name: string;
}

export function createGracefulShutdownHandler(
	server: { stop: () => Promise<void> },
	options: GracefulShutdownOptions,
): () => Promise<void> {
	let shuttingDown = false;

	return async () => {
		if (shuttingDown) return;
		shuttingDown = true;

		if (!options.quiet) {
			console.log(chalk.yellow(`\n🛑 Stopping ${options.name}...`));
		}

		const FORCE_EXIT_MS = Number(process.env.ADK_FORCE_EXIT_MS || 5000);
		const timeout = setTimeout(() => {
			if (!options.quiet) {
				console.error(
					chalk.red(
						`Force exiting after ${FORCE_EXIT_MS}ms. Some resources may not have closed cleanly.`,
					),
				);
			}
			process.exit(1);
		}, FORCE_EXIT_MS);
		timeout.unref?.();

		let exitCode = 0;
		try {
			await server.stop();
		} catch (e) {
			if (!options.quiet) {
				console.error(chalk.red("Error during shutdown:"), e);
			}
			exitCode = 1;
		} finally {
			clearTimeout(timeout);
			process.exit(exitCode);
		}
	};
}
