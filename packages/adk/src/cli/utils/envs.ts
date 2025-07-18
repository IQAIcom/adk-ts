import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Walk up directory structure until the specified file is found
 *
 * @param folder Starting folder to search from
 * @param filename Filename to look for
 * @returns Path to the file if found, empty string if not found
 */
function walkToRootUntilFound(folder: string, filename: string): string {
	const checkpath = path.join(folder, filename);
	if (fs.existsSync(checkpath) && fs.statSync(checkpath).isFile()) {
		return checkpath;
	}

	const parentFolder = path.dirname(folder);
	if (parentFolder === folder) {
		// reached the root
		return "";
	}

	return walkToRootUntilFound(parentFolder, filename);
}

/**
 * Loads the .env file for the agent module
 *
 * @param agentName Name of the agent
 * @param agentParentFolder Parent folder of the agent
 * @param filename Name of the environment file, defaults to .env
 */
export function loadDotenvForAgent(
	agentName: string,
	agentParentFolder: string,
	filename = ".env",
): void {
	// Get the absolute path of the agent folder as starting point
	const startingFolder = path.resolve(path.join(agentParentFolder, agentName));

	const dotenvFilePath = walkToRootUntilFound(startingFolder, filename);

	if (dotenvFilePath) {
		dotenv.config({ path: dotenvFilePath, override: true });
		console.log(
			`Loaded ${filename} file for ${agentName} at ${dotenvFilePath}`,
		);
	} else {
		console.log(`No ${filename} file found for ${agentName}`);
	}
}
