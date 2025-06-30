import { env } from "node:process";
import {
	FunctionTool,
	InMemoryArtifactService,
	InMemorySessionService,
	LlmAgent,
	LoadArtifactsTool,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "artifact-example";
const USER_ID = uuidv4();

/**
 * Artifact Management Example
 *
 * This example demonstrates how to use the ADK artifact system to enable
 * agents to save, load, and manage persistent files across sessions.
 * Artifacts provide a way to store and retrieve data that persists beyond
 * individual conversations.
 *
 * The example:
 * 1. Creates custom function tools for artifact management
 * 2. Sets up an agent with artifact capabilities
 * 3. Demonstrates saving, loading, and updating artifacts
 * 4. Shows cross-session persistence
 * 5. Illustrates file versioning and updates
 *
 * Expected Output:
 * - File saving and loading operations
 * - Artifact listing and management
 * - Cross-session data persistence
 * - File update operations
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to model from registry)
 */

async function main() {
	console.log("🗃️ Starting Artifact Management example...");

	try {
		/**
		 * Set up artifact and session services
		 * Artifact service provides persistent storage for files
		 */
		const artifactService = new InMemoryArtifactService();
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create agent with artifact management capabilities
		 * The agent can save, load, and manage persistent files
		 */
		const agent = createArtifactAgent();

		/**
		 * Set up runner with artifact service integration
		 * The runner coordinates artifact operations with agent interactions
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
			artifactService,
		});

		/**
		 * Run comprehensive artifact demonstrations
		 * Shows file management operations and persistence capabilities
		 */
		await demonstrateFileOperations(runner, session.id);
		await demonstrateCrossSessionPersistence(runner, sessionService);

		console.log("\n✅ Artifact Management example completed!");
	} catch (error) {
		console.error("❌ Error in artifact example:", error);
		process.exit(1);
	}
}

/**
 * Creates and configures the LLM agent with artifact management tools
 * @returns Configured LlmAgent with artifact capabilities
 */
function createArtifactAgent(): LlmAgent {
	return new LlmAgent({
		name: "file_assistant",
		model: env.LLM_MODEL,
		description: "Assistant that manages files using artifacts",
		instruction: `You help users save, load, and manage files using artifacts.

Available functions:
- saveArtifact(filename, content): Save content to a file
- listArtifacts(): List all available artifacts
- deleteArtifact(filename): Delete an artifact
- load_artifacts: Load specific artifacts (via LoadArtifactsTool)

When users ask to save files, use saveArtifact function.
When users ask to see files, use listArtifacts or load_artifacts.
Always confirm operations and provide helpful feedback about what was accomplished.`,
		tools: [
			new FunctionTool(saveArtifact, {
				name: "saveArtifact",
				description:
					"Save text content to an artifact file with a specified filename",
			}),
			new FunctionTool(listArtifacts, {
				name: "listArtifacts",
				description: "List all available artifacts in the current session",
			}),
			new FunctionTool(deleteArtifact, {
				name: "deleteArtifact",
				description:
					"Delete an artifact file by filename (not implemented yet)",
			}),
			new LoadArtifactsTool(),
		],
	});
}

/**
 * Runs file operation demonstrations
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function demonstrateFileOperations(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	/**
	 * Example 1: Save a greeting file
	 * Demonstrates basic file saving capability
	 */
	console.log("\n💾 Saving greeting file...");
	await runAgentTask(
		runner,
		sessionId,
		'Save "Hello World!" as "greeting.txt"',
	);

	/**
	 * Example 2: Save user preferences
	 * Shows saving structured data as artifacts
	 */
	console.log("\n⚙️ Saving user preferences...");
	await runAgentTask(
		runner,
		sessionId,
		'Save my preferences as "user_settings.json": {"theme": "dark", "language": "en"}',
	);

	/**
	 * Example 3: List all files
	 * Demonstrates artifact enumeration
	 */
	console.log("\n📋 Listing all files...");
	await runAgentTask(runner, sessionId, "Show me all my files");

	/**
	 * Example 4: Load specific file
	 * Shows how to retrieve saved artifacts
	 */
	console.log("\n📄 Loading greeting file...");
	await runAgentTask(runner, sessionId, 'Load "greeting.txt"');

	/**
	 * Example 5: Update existing file
	 * Demonstrates file modification capabilities
	 */
	console.log("\n🔄 Updating greeting file...");
	await runAgentTask(
		runner,
		sessionId,
		'Update "greeting.txt" with "Hello Updated World!"',
	);
}

/**
 * Demonstrates cross-session persistence
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for creating new sessions
 */
async function demonstrateCrossSessionPersistence(
	runner: Runner,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\n🔄 Testing cross-session persistence...");

	/**
	 * Create a new session to test persistence
	 * Artifacts should be accessible across different sessions
	 */
	const newSession = await sessionService.createSession(APP_NAME, USER_ID);

	await runAgentTask(
		runner,
		newSession.id,
		'Load my user settings from "user_settings.json"',
	);
}

/**
 * Executes a user message through the agent and displays the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param message The user message to send
 */
async function runAgentTask(
	runner: Runner,
	sessionId: string,
	message: string,
): Promise<void> {
	try {
		const userMessage = {
			parts: [{ text: message }],
		};

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId,
			newMessage: userMessage,
		})) {
			if (event.author === "file_assistant" && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					console.log("✅", content);
				}
			}
		}
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

/**
 * Custom function to save content as an artifact
 * @param filename Name of the file to save
 * @param content Content to save in the file
 * @param context Tool execution context with artifact capabilities
 * @returns Success or error message
 */
function saveArtifact(filename: string, content: string, context: any): string {
	try {
		const part = {
			text: content,
		};

		// Save the artifact using context
		context.saveArtifact(filename, part);
		return `Successfully saved "${content}" to "${filename}"`;
	} catch (error) {
		return `Error saving artifact: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Custom function to list available artifacts
 * @param context Tool execution context
 * @returns Status message
 */
function listArtifacts(context: any): string {
	try {
		// This will be handled by LoadArtifactsTool automatically
		return "Artifacts listed via LoadArtifactsTool";
	} catch (error) {
		return `Error listing artifacts: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Custom function to delete an artifact (placeholder)
 * @param filename Name of the file to delete
 * @param context Tool execution context
 * @returns Status message
 */
function deleteArtifact(filename: string, context: any): string {
	return `Artifact deletion not implemented yet for "${filename}"`;
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
