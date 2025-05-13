// Environment utilities for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the environment utility functionality from the Python SDK

import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

/**
 * Loads environment variables from a .env file for an agent
 *
 * @param agentFolderName The name of the agent folder
 * @param agentParentDir The parent directory of the agent folder
 */
export function loadDotEnvForAgent(
	agentFolderName: string,
	agentParentDir: string,
): void {
	const agentPath = path.join(agentParentDir, agentFolderName);
	const envFilePath = path.join(agentPath, ".env");

	if (fs.existsSync(envFilePath)) {
		console.log(`Loading environment variables from ${envFilePath}`);
		const envConfig = dotenv.parse(fs.readFileSync(envFilePath));

		// Apply the environment variables
		for (const key in envConfig) {
			process.env[key] = envConfig[key];
		}
	} else {
		console.log(`No .env file found at ${envFilePath}`);
	}
}
