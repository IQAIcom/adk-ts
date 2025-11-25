import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import type { Logger } from "@nestjs/common";
import { findProjectRoot } from "../../../common/find-project-root";

export function loadEnvironmentVariables(
	agentFilePath: string,
	logger?: Logger,
): void {
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

	for (const envFile of envFiles) {
		const envPath = join(projectRoot, envFile);
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
							if (!process.env[key.trim()]) {
								process.env[key.trim()] = value.trim();
							}
						}
					}
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				logger?.warn(`Warning: Could not load ${envFile} file: ${msg}`);
			}
		}
	}
}
