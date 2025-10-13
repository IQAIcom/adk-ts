import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { findProjectRoot } from "../../common/find-project-root";
import type { Agent, LoadedAgent } from "../../common/types";

export const DIRECTORIES_TO_SKIP = [
	"node_modules",
	".adk-cache",
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

	/**
	 * Find the project root by traversing up from the given directory
	 * looking for package.json, tsconfig.json, or .env files
	 */
	private findProjectRoot(startDir: string) {
		return findProjectRoot(startDir);
	}

	scanAgents(
		agentsDir: string,
		loadedAgents: Map<string, LoadedAgent>,
	): Map<string, Agent> {
		const agents = new Map<string, Agent>();

		// Use current directory if agentsDir doesn't exist or is empty
		const scanDir =
			!agentsDir || !existsSync(agentsDir)
				? process.cwd()
				: normalize(resolve(agentsDir));

		// Find the actual project root (where tsconfig.json, package.json live)
		const projectRoot = this.findProjectRoot(scanDir);

		if (!this.quiet) {
			this.logger.log(`Scan directory: ${scanDir}`);
			this.logger.log(`Project root: ${projectRoot}`);
		}

		const shouldSkipDirectory = (dirName: string): boolean => {
			return DIRECTORIES_TO_SKIP.includes(
				dirName as (typeof DIRECTORIES_TO_SKIP)[number],
			);
		};

		const scanDirectory = (dir: string): void => {
			try {
				const items = readdirSync(dir);
				for (const item of items) {
					const fullPath = normalize(join(dir, item));
					const stat = statSync(fullPath);

					if (stat.isDirectory()) {
						// Skip common build/dependency directories
						if (!shouldSkipDirectory(item)) {
							scanDirectory(fullPath);
						}
					} else if (
						AGENT_FILENAMES.includes(item as (typeof AGENT_FILENAMES)[number])
					) {
						// Calculate relative path from PROJECT ROOT to agent directory
						// Normalize to use forward slashes for consistency across platforms
						let relativePath = relative(projectRoot, dir).replace(/\\/g, "/");

						// Handle case where agent is directly in the project root
						if (!relativePath || relativePath === ".") {
							const rootDirName = projectRoot.split(/[\\/]/).pop() || "root";
							relativePath = rootDirName;
						}

						// Remove any leading "./" from the path
						relativePath = relativePath.replace(/^\.\//, "");

						// Try to get the actual agent name if it's already loaded
						const loadedAgent = loadedAgents.get(relativePath);
						let agentName = relativePath.split(/[/\\]/).pop() || "unknown";

						if (loadedAgent?.agent?.name) {
							agentName = loadedAgent.agent.name;
						} else {
							// Try to quickly extract name from agent file if not loaded
							try {
								const agentFilePath = normalize(join(dir, item));
								agentName =
									this.extractAgentNameFromFile(agentFilePath) || agentName;
							} catch (error) {
								if (!this.quiet) {
									this.logger.warn(
										`Failed to extract agent name from ${join(dir, item)}: ${
											error instanceof Error ? error.message : String(error)
										}`,
									);
								}
							}
						}

						// Store the agent with consistent keys
						if (relativePath) {
							agents.set(relativePath, {
								relativePath,
								name: agentName,
								absolutePath: normalize(resolve(dir)),
								projectRoot,
								instance: loadedAgent?.agent,
							});

							if (!this.quiet) {
								this.logger.log(`Found agent: ${relativePath} -> ${dir}`);
							}
						} else {
							this.logger.warn(
								`Skipping agent with invalid relativePath at ${dir}`,
							);
						}
					}
				}
			} catch (error) {
				this.logger.warn(
					`Error reading directory ${dir}: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		};

		if (!this.quiet) {
			this.logger.log("Starting agent scan...");
		}

		scanDirectory(scanDir);

		this.logger.log(`Agent scan complete. Found ${agents.size} agents.`);

		if (!this.quiet && agents.size > 0) {
			this.logger.log("Found agents:");
			for (const [key, agent] of agents.entries()) {
				this.logger.log(`  ${key} -> ${agent.absolutePath}`);
			}
		}

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
		} catch (_error) {
			// Return null instead of throwing to allow fallback to directory name
			return null;
		}
	}
}
