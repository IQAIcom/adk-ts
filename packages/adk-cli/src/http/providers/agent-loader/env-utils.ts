import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { Logger } from "@nestjs/common";
import { findProjectRoot } from "../../../common/find-project-root";

export class EnvUtils {
	constructor(
		private logger: Logger,
		private quiet = false,
	) {}

	/**
	 * Find which .env files exist in the project
	 */
	private findExistingEnvFiles(projectRoot: string): string[] {
		const envFiles = [
			".env.local",
			".env.development.local",
			".env.production.local",
			".env.development",
			".env.production",
			".env",
		];
		return envFiles.filter((file) => existsSync(join(projectRoot, file)));
	}

	/**
	 * Generate helpful error message for missing environment variables
	 */
	generateEnvErrorMessage(
		projectRoot: string,
		varName?: string,
		allMissing?: string[],
	): string {
		const existingEnvFiles = this.findExistingEnvFiles(projectRoot);
		const missingVars = allMissing || (varName ? [varName] : []);
		let message = `\n❌ MISSING ENVIRONMENT VARIABLE${missingVars.length > 1 ? "S" : ""}\n\n`;

		if (missingVars.length > 0) {
			message += `Required: ${missingVars.join(", ")}\n`;
		}

		message += `Project: ${projectRoot}\n\n`;

		if (existingEnvFiles.length > 0) {
			message += `📝 Found: ${existingEnvFiles.join(", ")}\n`;
			message += `💡 Add missing variable${missingVars.length > 1 ? "s" : ""} to one of these files\n\n`;
		} else {
			message += "💡 Create a .env file with:\n";
			for (const v of missingVars) message += `   ${v}=your_value_here\n`;
			message += "\n";
		}

		message += "Tip: Use .env.local (git-ignored) for sensitive values\n";
		return message;
	}

	/**
	 * Load environment variables from prioritized .env files
	 */
	loadEnvironmentVariables(agentFilePath: string): void {
		const normalizedAgentPath = normalize(resolve(agentFilePath));
		const projectRoot = findProjectRoot(dirname(normalizedAgentPath));

		const envFiles = [
			".env.local",
			".env.development.local",
			".env.production.local",
			".env.development",
			".env.production",
			".env",
		];

		let loadedAny = false;

		for (const envFile of envFiles) {
			const envPath = join(projectRoot, envFile);
			if (existsSync(envPath)) {
				try {
					const envContent = readFileSync(envPath, "utf8");
					const lines = envContent.split("\n");
					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith("#")) {
							const [key, ...valueParts] = trimmed.split("=");
							if (key && valueParts.length > 0) {
								const value = valueParts.join("=").replace(/^"(.*)"$/, "$1");
								if (!process.env[key.trim()]) {
									process.env[key.trim()] = value.trim();
								}
							}
						}
					}
					loadedAny = true;
				} catch (err) {
					this.logger.warn(
						`Warning: Could not load ${envFile} file: ${
							err instanceof Error ? err.message : String(err)
						}`,
					);
				}
			}
		}

		if (!loadedAny && !this.quiet) {
			this.logger.warn(
				`No .env files found in project root: ${projectRoot}\n` +
					"If your agent requires environment variables, please create a .env file.",
			);
		}
	}
}
