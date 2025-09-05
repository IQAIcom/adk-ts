import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { format } from "node:util";
import { Injectable, Logger } from "@nestjs/common";
import type { Agent, LoadedAgent } from "../../common/types";

const DIRECTORIES_TO_SKIP = [
	"node_modules",
	".git",
	".next",
	"dist",
	"build",
	".turbo",
	"coverage",
	".vscode",
	".idea",
] as const;

const AGENT_FILENAMES = ["agent.ts", "agent.js"] as const;

@Injectable()
export class AgentScanner {
	private logger: Logger;

	constructor(private quiet = false) {
		this.logger = new Logger("agent-scanner");
	}

	scanAgents(
		agentsDir: string,
		loadedAgents: Map<string, LoadedAgent>,
	): Map<string, Agent> {
		const agents = new Map<string, Agent>();

		// Use current directory if agentsDir doesn't exist or is empty
		const scanDir =
			!agentsDir || !existsSync(agentsDir) ? process.cwd() : agentsDir;

		const shouldSkipDirectory = (dirName: string): boolean => {
			return DIRECTORIES_TO_SKIP.includes(
				dirName as (typeof DIRECTORIES_TO_SKIP)[number],
			);
		};

		const scanDirectory = (dir: string): void => {
			const items = readdirSync(dir);
			for (const item of items) {
				const fullPath = join(dir, item);
				const stat = statSync(fullPath);

				if (stat.isDirectory()) {
					// Skip common build/dependency directories
					if (!shouldSkipDirectory(item)) {
						scanDirectory(fullPath);
					}
				} else if (
					AGENT_FILENAMES.includes(item as (typeof AGENT_FILENAMES)[number])
				) {
					const relativePath = relative(scanDir, dir);

					// Try to get the actual agent name if it's already loaded
					const loadedAgent = loadedAgents.get(relativePath);
					let agentName = relativePath.split("/").pop() || "unknown";

					// If agent is loaded, use its actual name
					if (loadedAgent?.agent?.name) {
						agentName = loadedAgent.agent.name;
					} else {
						// Try to quickly extract name from agent file if not loaded
						try {
							const agentFilePath = join(dir, item);
							agentName =
								this.extractAgentNameFromFile(agentFilePath) || agentName;
						} catch {
							// Fallback to directory name if extraction fails
						}
					}

					agents.set(relativePath, {
						relativePath,
						name: agentName,
						absolutePath: dir,
						instance: loadedAgent?.agent,
					});
				}
			}
		};

		scanDirectory(scanDir);
		this.logger.log(
			format(`Agent scan complete. Found ${agents.size} agents. ✨`),
		);

		return agents;
	}

	private extractAgentNameFromFile(filePath: string): string | null {
		try {
			const content = readFileSync(filePath, "utf-8");

			// Look for agent name in export statements
			// Match patterns like: name: "agent_name" or name:"agent_name"
			const nameMatch = content.match(/name\s*:\s*["']([^"']+)["']/);
			if (nameMatch?.[1]) {
				return nameMatch[1];
			}

			return null;
		} catch {
			return null;
		}
	}
}
