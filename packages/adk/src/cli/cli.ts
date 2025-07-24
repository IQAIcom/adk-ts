#!/usr/bin/env node
import {
	intro,
	outro,
	select,
	text,
	confirm,
	note,
	spinner,
} from "@clack/prompts";
import chalk from "chalk";
import * as fs from "node:fs";
import * as path from "node:path";
import { runCmd } from "./cli-create";
import { runCli } from "./cli-operations";
import { createApiServer } from "./api-server";
import { startWebServer } from "./web-server";
import { VERSION } from "../index";

/**
 * Interactive-first CLI using clack
 */
export class AdkCli {
	async run(): Promise<void> {
		intro(chalk.magenta.bold(`🚀 ADK - Agent Development Kit v${VERSION}`));

		try {
			const action = await this.selectMainAction();
			await this.executeAction(action);
		} catch (error: any) {
			if (error.message !== "User cancelled") {
				outro(chalk.red.bold(`❌ Error: ${error.message}`));
			}
		}

		outro(chalk.magenta.bold("👋 Thanks for using ADK!"));
	}

	private async selectMainAction(): Promise<string> {
		return (await select({
			message: "What would you like to do?",
			options: [
				{
					value: "create",
					label: "🏗️  Create new agent",
					hint: "Generate a new agent from template",
				},
				{
					value: "run",
					label: "▶️  Run agent",
					hint: "Start interactive chat session",
				},
				{
					value: "web",
					label: "🌐 Launch web UI",
					hint: "Start browser-based interface",
				},
				{
					value: "api",
					label: "🔌 Start API server",
					hint: "Run headless API server",
				}
			],
		})) as string;	
	}

	private async executeAction(action: string): Promise<void> {
		switch (action) {
			case "create":
				await this.createFlow();
				break;
			case "run":
				await this.runFlow();
				break;
			case "web":
				await this.webFlow();
				break;
			case "api":
				await this.apiFlow();
				break;
			default:
				throw new Error(`Unknown action: ${action}`);
		}
	}

	private async createFlow(): Promise<void> {
		note(chalk.magenta.bold("🏗️ Creating a new agent"));

		const agentName = await text({
			message: "What's your agent's name?",
			placeholder: "my-awesome-agent",
			validate: (value) => {
				if (!value) return "Agent name is required";
				if (!/^[a-zA-Z0-9-_]+$/.test(value))
					return "Use only letters, numbers, hyphens, and underscores";
				return undefined;
			},
		});

		if (typeof agentName !== "string") return;

		const sanitizedAgentName = agentName.replace(/[^a-zA-Z0-9_]/g, "_");

		const agentPath = path.join(process.cwd(), sanitizedAgentName);
		if (fs.existsSync(agentPath)) {
			const overwrite = await confirm({
				message: `Directory "${sanitizedAgentName}" already exists. Overwrite?`,
				initialValue: false,
			});

			if (!overwrite) {
				note(chalk.yellow.bold("✋ Agent creation cancelled"));
				return;
			}
		}

		const s = spinner();
		s.start("Creating your agent...");

		try {
			await runCmd({
				agentName,
			});
			s.stop("✅ Agent created successfully!");

			const nextStep = await select({
				message: "What would you like to do next?",
				options: [
					{ value: "run", label: "▶️ Run the agent now" },
					{ value: "done", label: "✨ I'm done for now" },
				],
			});

			if (nextStep === "run") {
				// Run the newly created agent directly
				const agentParentDir = path.dirname(agentPath);
				const agentFolderName = path.basename(agentPath);

				await runCli({
					agentParentDir,
					agentFolderName,
					saveSession: false,
				});
			}
		} catch (error: any) {
			s.stop("❌ Failed to create agent");
			throw error;
		}
	}

	private async runFlow(): Promise<void> {
		note(chalk.cyan.bold("▶️ Running an agent"));

		const agentPath = await text({
			message: "Enter agent directory path:",
			placeholder: "./my-agent or /full/path/to/agent",
			validate: (value) => {
				if (!value.trim()) return "Agent path is required";

				const resolvedPath = path.resolve(value.trim());
				if (!fs.existsSync(resolvedPath)) {
					return "Directory does not exist";
				}

				const stat = fs.statSync(resolvedPath);
				if (!stat.isDirectory()) {
					return "Path must be a directory";
				}

				// Check if it's a valid agent directory
				if (!this.isAgentDirectory(resolvedPath)) {
					return "Directory does not contain a valid agent file (agent.ts or index.ts)";
				}

				return undefined;
			},
		});

		if (typeof agentPath !== "string") return;

		const resolvedAgentPath = path.resolve(agentPath.trim());
		const agentName = path.basename(resolvedAgentPath);
		const agentFilePath = this.getAgentFilePath(resolvedAgentPath);

		const s = spinner();
		s.start(`Starting ${agentName}...`);

		try {
			// Calculate the correct agent directory from the agent file path
			const agentFileDir = path.dirname(agentFilePath);
			const agentDirectory =
				path.basename(agentFileDir) === "src"
					? path.dirname(agentFileDir) // Agent file is in src/, so agent directory is one level up
					: agentFileDir; // Agent file is directly in the agent directory

			const agentParentDir = path.dirname(agentDirectory);
			const agentFolderName = path.basename(agentDirectory);

			// Stop spinner before starting interactive chat
			s.stop(`🚀 Launching ${agentName}`);

			await runCli({
				agentParentDir: agentParentDir,
				agentFolderName: agentFolderName,
				saveSession: false,
			});

			// Note: No spinner stop here since it's already stopped above
		} catch (error: any) {
			s.stop("❌ Agent failed to run");
			throw error;
		}
	}

	private async webFlow(): Promise<void> {
		note(chalk.cyan.bold("🌐 Starting web interface"));

		const agentPath = await text({
			message: "Enter agent directory path:",
			placeholder: "./my-agent or /full/path/to/agent",
			validate: (value) => {
				if (!value.trim()) return "Agent path is required";

				const resolvedPath = path.resolve(value.trim());
				if (!fs.existsSync(resolvedPath)) {
					return "Directory does not exist";
				}

				const stat = fs.statSync(resolvedPath);
				if (!stat.isDirectory()) {
					return "Path must be a directory";
				}

				// Check if it's a valid agent directory
				if (!this.isAgentDirectory(resolvedPath)) {
					return "Directory does not contain a valid agent file (agent.ts or index.ts)";
				}

				return undefined;
			},
		});

		if (typeof agentPath !== "string") return;

		const port = await text({
			message: "Port for web server?",
			placeholder: "3000",
			defaultValue: "3000",
			validate: (value) => {
				const num = Number.parseInt(value);
				if (Number.isNaN(num) || num < 1 || num > 65535) {
					return "Please enter a valid port number (1-65535)";
				}
				return undefined;
			},
		});

		if (typeof port !== "string") return;

		const resolvedAgentPath = path.resolve(agentPath.trim());
		const agentName = path.basename(resolvedAgentPath);

		const s = spinner();
		s.start(`Starting web server on port ${port}...`);

		try {
			startWebServer({
				agentDir: resolvedAgentPath,
				port: Number.parseInt(port),
				allowOrigins: ["*"],
			});

			s.stop(`🌐 Web UI running at http://localhost:${port}`);
		} catch (error: any) {
			s.stop("❌ Failed to start web server");
			throw error;
		}
	}

	private async apiFlow(): Promise<void> {
		note(chalk.cyan.bold("🔌 Starting API server"));

		const agentPath = await text({
			message: "Enter agent directory path:",
			placeholder: "./my-agent or /full/path/to/agent",
			validate: (value) => {
				if (!value.trim()) return "Agent path is required";

				const resolvedPath = path.resolve(value.trim());
				if (!fs.existsSync(resolvedPath)) {
					return "Directory does not exist";
				}

				const stat = fs.statSync(resolvedPath);
				if (!stat.isDirectory()) {
					return "Path must be a directory";
				}

				// Check if it's a valid agent directory
				if (!this.isAgentDirectory(resolvedPath)) {
					return "Directory does not contain a valid agent file (agent.ts or index.ts)";
				}

				return undefined;
			},
		});

		if (typeof agentPath !== "string") return;

		const port = await text({
			message: "Port for API server?",
			placeholder: "8000",
			defaultValue: "8000",
			validate: (value) => {
				const num = Number.parseInt(value);
				if (Number.isNaN(num) || num < 1 || num > 65535) {
					return "Please enter a valid port number (1-65535)";
				}
				return undefined;
			},
		});

		if (typeof port !== "string") return;

		const resolvedAgentPath = path.resolve(agentPath.trim());
		const agentName = path.basename(resolvedAgentPath);

		const s = spinner();
		s.start(`Starting API server on port ${port}...`);

		try {
			const { server } = createApiServer({
				agentDir: resolvedAgentPath,
				web: false,
				port: Number.parseInt(port),
				allowOrigins: ["*"],
			});

			s.stop(`🔌 API server running at http://localhost:${port}`);

			note(
				chalk.green(
					"API Endpoints:\n  POST /chat - Send messages to agent\n  GET /health - Health check",
				),
			);

			// Keep the process running
			process.on("SIGINT", () => {
				note(chalk.yellow.bold("🛑 Shutting down API server..."));
				server.close(() => process.exit(0));
			});
		} catch (error: any) {
			s.stop("❌ Failed to start API server");
			throw error;
		}
	}

	private async exploreFlow(): Promise<void> {
		note(chalk.cyan.bold("🔍 Agent directory utilities"));

		const action = await select({
			message: "What would you like to do?",
			options: [
				{ value: "run", label: "▶️ Run an agent" },
				{ value: "web", label: "🌐 Start web interface" },
				{ value: "api", label: "🔌 Start API server" },
				{ value: "create", label: "🏗️ Create new agent" },
				{ value: "back", label: "⬅️ Back to main menu" },
			],
		});

		switch (action) {
			case "run":
				await this.runFlow();
				break;
			case "web":
				await this.webFlow();
				break;
			case "api":
				await this.apiFlow();
				break;
			case "create":
				await this.createFlow();
				break;
			case "back":
				await this.run();
				break;
		}
	}

	/**
	 * Checks if a directory is a valid agent directory (contains agent.ts or index.ts)
	 */
	private isAgentDirectory(dirPath: string): boolean {
		// Check multiple possible locations for the agent file
		const possibleAgentPaths = [
			// Check for src/agent.ts first (preferred structure)
			path.join(dirPath, "src", "agent.ts"),
			// Then direct agent.ts
			path.join(dirPath, "agent.ts"),
			// Then legacy src/index.ts
			path.join(dirPath, "src", "index.ts"),
			// Finally legacy index.ts
			path.join(dirPath, "index.ts"),
		];

		return possibleAgentPaths.some((filePath) => fs.existsSync(filePath));
	}

	/**
	 * Gets the actual agent file path from a directory
	 */
	private getAgentFilePath(dirPath: string): string {
		const possibleAgentPaths = [
			path.join(dirPath, "src", "agent.ts"),
			path.join(dirPath, "agent.ts"),
			path.join(dirPath, "src", "index.ts"),
			path.join(dirPath, "index.ts"),
		];

		for (const filePath of possibleAgentPaths) {
			if (fs.existsSync(filePath)) {
				return filePath;
			}
		}

		// This should never happen if isAgentDirectory returned true
		throw new Error(`Could not find agent file in ${dirPath}`);
	}
}

// Main entry point
export async function runAdkCli(): Promise<void> {
	const cli = new AdkCli();
	await cli.run();
}
