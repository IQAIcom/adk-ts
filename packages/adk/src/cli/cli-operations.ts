import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { text } from "@clack/prompts";
import chalk from "chalk";
import type { LlmAgent } from "../agents/llm-agent";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import { InMemoryArtifactService } from "../artifacts/in-memory-artifact-service";
import type { Content, Part } from "@google/genai";
import { Runner } from "../runners";
import type { BaseSessionService } from "../sessions/base-session-service";
import { InMemorySessionService } from "../sessions/in-memory-session-service";
import type { Session } from "../sessions";

import * as envs from "./utils/envs";

// Import ts-node programmatically to register TypeScript support
import { register } from "ts-node";

interface InputFile {
	state: Record<string, any>;
	queries: string[];
}

/**
 * Run an agent using input from a file
 *
 * @param appName Name of the application
 * @param userId User ID to create the session with
 * @param rootAgent The root agent to run
 * @param artifactService Service for managing artifacts
 * @param sessionService Service for managing sessions
 * @param inputPath Path to the input file
 * @returns The created session
 */
export async function runInputFile(
	appName: string,
	userId: string,
	rootAgent: LlmAgent,
	artifactService: BaseArtifactService,
	sessionService: BaseSessionService,
	inputPath: string,
): Promise<Session> {
	const runner = new Runner({
		appName,
		agent: rootAgent,
		artifactService,
		sessionService,
	});

	const inputFileRaw = await promisify(fs.readFile)(inputPath, "utf-8");
	const inputFile: InputFile = JSON.parse(inputFileRaw);

	// Add time to state
	const state = { ...inputFile.state, _time: new Date() };

	// Create a new session with the state
	const session = await sessionService.createSession(appName, userId, state);

	for (const query of inputFile.queries) {
		console.log(
			`${chalk.green.bold("[User]")}${chalk.gray(":")} ${chalk.white(query)}`,
		);
		const content: Content = {
			role: "user",
			parts: [{ text: query } as Part],
		};

		for await (const event of runner.runAsync({
			userId: session.userId,
			sessionId: session.id,
			newMessage: content,
		})) {
			if (event.content?.parts) {
				const text = event.content.parts
					.map((part: Part) => part.text || "")
					.join("");

				if (text) {
					console.log(
						`${chalk.blue.bold("🤖")} ${chalk.cyan.bold(appName)}${chalk.gray(":")} ${chalk.white(text)}`,
					);
					console.log("");
				}
			}
		}
	}

	return session;
}

/**
 * Run an agent interactively via CLI
 *
 * @param rootAgent The root agent to run
 * @param artifactService Service for managing artifacts
 * @param session The session to use
 * @param sessionService Service for managing sessions
 */
export async function runInteractively(
	rootAgent: LlmAgent,
	artifactService: BaseArtifactService,
	session: Session,
	sessionService: BaseSessionService,
): Promise<void> {
	const runner = new Runner({
		appName: session.appName,
		agent: rootAgent,
		artifactService,
		sessionService,
	});

	const agentName = session.appName;
	const boxWidth = Math.max(40, agentName.length + 20);

	console.log("");
	console.log(chalk.magenta.bold(`┌${"─".repeat(boxWidth - 2)}┐`));
	console.log(
		chalk.magenta.bold(
			`│ 🤖 Chatting with ${chalk.yellow.bold(agentName)}${" ".repeat(boxWidth - agentName.length - 19)} │`,
		),
	);
	console.log(chalk.magenta.bold(`└${"─".repeat(boxWidth - 2)}┘`));
	console.log("");
	console.log(chalk.gray(`💡 Type ${chalk.cyan.italic("exit")} to quit\n`));

	let isRunning = true;
	let isFirstPrompt = true;
	while (isRunning) {
		const query = await text({
			message: chalk.green.bold("[User]:"),
			placeholder: isFirstPrompt
				? "What can I help you with?"
				: "Type your message...",
			validate: (value) => {
				if (value === "exit") return undefined; // Allow exit
				return value.length === 0 ? "Please enter a message" : undefined;
			},
		});

		if (typeof query !== "string" || !query.trim()) continue;
		if (query.trim() === "exit") {
			isRunning = false;
			break;
		}

		// After first interaction, use shorter prompts
		isFirstPrompt = false;

		const content: Content = {
			role: "user",
			parts: [{ text: query.trim() } as Part],
		};

		// Show immediate thinking indicator with color
		process.stdout.write(chalk.cyan("🤔 "));

		let hasResponse = false;
		let responseText = "";

		try {
			for await (const event of runner.runAsync({
				userId: session.userId,
				sessionId: session.id,
				newMessage: content,
			})) {
				if (event.content?.parts) {
					const text = event.content.parts
						.map((part: Part) => part.text || "")
						.join("");

					if (text && text !== responseText) {
						if (!hasResponse) {
							process.stdout.write(`\r${" ".repeat(10)}\r`);
							hasResponse = true;
						}

						responseText = text;
						console.log(
							`${chalk.blue.bold("🤖")} ${chalk.cyan.bold(session.appName)}${chalk.gray(":")} ${chalk.white(text)}`,
						);
						console.log("");
					}
				}
			}
		} catch (error) {
			if (!hasResponse) {
				process.stdout.write(`\r${" ".repeat(10)}\r`);
			}
			console.log(
				chalk.red.bold(
					`❌ Error: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
			console.log("");
		}

		if (!hasResponse) {
			process.stdout.write(`\r${" ".repeat(10)}\r`);
			console.log(chalk.yellow.bold("🤷 No response received"));
			console.log("");
		}
	}

	console.log(chalk.magenta.bold("👋 Thanks for chatting! See you later.\n"));
}

/**
 * Extract conversation contents from session events
 *
 * @param session The session to extract contents from
 * @returns Array of conversation contents
 */
function getSessionContents(session: Session): Content[] {
	if (!session.events) return [];

	return session.events
		.filter((event) => event.content?.parts && event.content.parts.length > 0)
		.map((event) => event.content as Content);
}

/**
 * Run the CLI for a specific agent
 *
 * @param options Configuration options
 * @param options.agentParentDir The parent directory of the agent
 * @param options.agentFolderName The folder name of the agent
 * @param options.replayFile Optional path to a replay JSON file with initial state and queries
 * @param options.resumeFile Optional path to a previously saved session file
 * @param options.saveSession Whether to save the session after running
 * @param options.sessionId Optional session ID to save the session to on exit
 */
export async function runCli({
	agentParentDir,
	agentFolderName,
	replayFile,
	resumeFile,
	saveSession = false,
	sessionId,
}: {
	agentParentDir: string;
	agentFolderName: string;
	replayFile?: string;
	resumeFile?: string;
	saveSession: boolean;
	sessionId?: string;
}): Promise<void> {
	// Initialize services
	const artifactService = new InMemoryArtifactService();
	const sessionService = new InMemorySessionService();
	const userId = "test_user";

	// Create a default session
	let session = await sessionService.createSession(agentFolderName, userId);

	// Resolve the agent path more carefully
	let agentModulePath: string;

	// Check if we're in the agent directory or parent directory
	const currentDir = process.cwd();

	// Standard locations for agent files (both agent.ts and index.ts)
	const agentPathInCurrentDir = path.resolve(
		currentDir,
		agentFolderName,
		"agent.ts",
	);
	const indexPathInCurrentDir = path.resolve(
		currentDir,
		agentFolderName,
		"index.ts",
	);
	const agentPathWithSrcInCurrentDir = path.resolve(
		currentDir,
		agentFolderName,
		"src",
		"agent.ts",
	);
	const indexPathWithSrcInCurrentDir = path.resolve(
		currentDir,
		agentFolderName,
		"src",
		"index.ts",
	);
	const agentPathInParentDir = path.resolve(
		agentParentDir,
		agentFolderName,
		"agent.ts",
	);
	const indexPathInParentDir = path.resolve(
		agentParentDir,
		agentFolderName,
		"index.ts",
	);
	const agentPathWithSrcInParentDir = path.resolve(
		agentParentDir,
		agentFolderName,
		"src",
		"agent.ts",
	);
	const indexPathWithSrcInParentDir = path.resolve(
		agentParentDir,
		agentFolderName,
		"src",
		"index.ts",
	);

	if (fs.existsSync(agentPathInCurrentDir)) {
		agentModulePath = agentPathInCurrentDir;
	} else if (fs.existsSync(indexPathInCurrentDir)) {
		agentModulePath = indexPathInCurrentDir;
	} else if (fs.existsSync(agentPathWithSrcInCurrentDir)) {
		agentModulePath = agentPathWithSrcInCurrentDir;
	} else if (fs.existsSync(indexPathWithSrcInCurrentDir)) {
		agentModulePath = indexPathWithSrcInCurrentDir;
	} else if (fs.existsSync(agentPathInParentDir)) {
		agentModulePath = agentPathInParentDir;
	} else if (fs.existsSync(indexPathInParentDir)) {
		agentModulePath = indexPathInParentDir;
	} else if (fs.existsSync(agentPathWithSrcInParentDir)) {
		agentModulePath = agentPathWithSrcInParentDir;
	} else if (fs.existsSync(indexPathWithSrcInParentDir)) {
		agentModulePath = indexPathWithSrcInParentDir;
	} else {
		// If not found, throw a clear error.
		throw new Error(
			`Could not find agent file for '${agentFolderName}'.\n` +
				`Looked for agent in current directory ('${currentDir}') and parent directory ('${agentParentDir}').`,
		);
	}

	// Quietly load the agent

	try {
		// Load environment variables for the agent
		envs.loadDotenvForAgent(agentFolderName, agentParentDir);

		try {
			// Register TypeScript compiler with compatible options
			register({
				transpileOnly: true,
				compilerOptions: {
					module: "CommonJS",
					moduleResolution: "Node",
					target: "ES2020",
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
					skipLibCheck: true,
				},
			});

			// Load the agent module
			const agentModule = require(agentModulePath);

			// Get the rootAgent from the module
			const rootAgent = agentModule.rootAgent || agentModule.default?.rootAgent;

			if (!rootAgent) {
				throw new Error(
					`Could not find rootAgent in module ${agentModulePath}. Make sure it exports a 'rootAgent' property.`,
				);
			}

			if (replayFile) {
				// Run with replay file (creates a new session and runs queries)
				session = await runInputFile(
					agentFolderName,
					userId,
					rootAgent,
					artifactService,
					sessionService,
					replayFile,
				);
			} else if (resumeFile) {
				// Load session from file and replay events
				const sessionRaw = await promisify(fs.readFile)(resumeFile, "utf-8");
				const loadedSession = JSON.parse(sessionRaw);

				// Merge session data into our session object
				session.id = loadedSession.id || session.id;
				session.appName = loadedSession.appName || session.appName;
				session.userId = loadedSession.userId || session.userId;
				session.state = loadedSession.state || session.state;

				// Replay all events from the loaded session
				if (loadedSession.events && Array.isArray(loadedSession.events)) {
					for (const event of loadedSession.events) {
						await sessionService.appendEvent(session, event);

						// Display the content for each event
						if (event.content?.parts && event.content.parts.length > 0) {
							const text = event.content.parts[0].text;
							if (text) {
								if (event.author === "user") {
									console.log(
										`${chalk.green.bold("[User]")}${chalk.gray(":")} ${chalk.white(text)}`,
									);
								} else {
									console.log(
										`${chalk.blue.bold("🤖")} ${chalk.cyan.bold(agentFolderName)}${chalk.gray(":")} ${chalk.white(text)}`,
									);
									console.log("");
								}
							}
						}
					}
				}

				// Continue with interactive mode
				await runInteractively(
					rootAgent,
					artifactService,
					session,
					sessionService,
				);
			} else {
				// Run interactively without input file
				await runInteractively(
					rootAgent,
					artifactService,
					session,
					sessionService,
				);
			}

			// Save session if requested
			if (saveSession) {
				let sessionPath: string;
				if (replayFile) {
					sessionPath = replayFile.replace(".input.json", ".session.json");
				} else {
					// Use provided session ID or ask for one
					let finalSessionId = sessionId;
					if (!finalSessionId) {
						const result = await text({
							message: "Session ID to save",
							placeholder: "Enter session ID...",
							validate: (value) =>
								value.length === 0 ? "Please enter a session ID" : undefined,
						});
						finalSessionId = typeof result === "string" ? result : "session";
					}

					sessionPath = path.join(
						path.dirname(agentModulePath),
						`${finalSessionId}.session.json`,
					);
				}

				// Fetch updated session
				const updatedSession =
					(await sessionService.getSession(
						session.appName,
						session.userId,
						session.id,
					)) || session;

				// Save session to file
				await promisify(fs.writeFile)(
					sessionPath,
					JSON.stringify(updatedSession, null, 2),
				);

				console.log(
					`${chalk.green.bold("💾 Session saved to")} ${chalk.cyan(sessionPath)}`,
				);
			}
		} catch (error) {
			console.error(chalk.red.bold("❌ Error loading agent module:"), error);
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red.bold("❌ Error running CLI:"), error);
		process.exit(1);
	}
}
