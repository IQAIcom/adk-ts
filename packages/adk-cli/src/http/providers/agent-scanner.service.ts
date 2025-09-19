import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { format } from "node:util";
import { Injectable, Logger } from "@nestjs/common";
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
	private findProjectRoot(startDir: string): string {
		let projectRoot = resolve(startDir);

		while (projectRoot !== "/" && projectRoot !== dirname(projectRoot)) {
			// Look for common project root indicators
			if (
				existsSync(join(projectRoot, "package.json")) ||
				existsSync(join(projectRoot, "tsconfig.json")) ||
				existsSync(join(projectRoot, ".env")) ||
				existsSync(join(projectRoot, ".git"))
			) {
				break;
			}
			projectRoot = dirname(projectRoot);
		}

		// If we reached the filesystem root without finding markers,
		// use the original directory
		if (projectRoot === "/" || projectRoot === dirname(projectRoot)) {
			projectRoot = resolve(startDir);
		}

		return projectRoot;
	}

	scanAgents(
		agentsDir: string,
		loadedAgents: Map<string, LoadedAgent>,
	): Map<string, Agent> {
		const agents = new Map<string, Agent>();

		// Use current directory if agentsDir doesn't exist or is empty
		const scanDir =
			!agentsDir || !existsSync(agentsDir) ? process.cwd() : resolve(agentsDir);

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
						// Calculate relative path from PROJECT ROOT to agent directory
						// This ensures consistent agent keys regardless of scan directory
						let relativePath = relative(projectRoot, dir);

						// Normalize path separators
						relativePath = relativePath.replace(/\\/g, "/");

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
								const agentFilePath = join(dir, item);
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
								absolutePath: resolve(dir),
								projectRoot, // Add project root to the agent info
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

		try {
			scanDirectory(scanDir);
		} catch (error) {
			this.logger.error(
				`Error during agent scan: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			throw error;
		}

		this.logger.log(
			format(`Agent scan complete. Found ${agents.size} agents.`),
		);

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
		} catch (error) {
			// Return null instead of throwing to allow fallback to directory name
			return null;
		}
	}
}
