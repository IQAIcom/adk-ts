import { env } from "node:process";
import {
	AgentBuilder,
	InMemoryArtifactService,
	InMemorySessionService,
	LoadArtifactsTool,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod/v4";

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

		/**
		 * Create agent with artifact management capabilities
		 * The agent can save, load, and manage persistent files
		 */
		const { runner } = await AgentBuilder.create("file_assistant")
			.withModel(env.LLM_MODEL)
			.withDescription("Assistant that manages files using artifacts")
			.withInstruction(dedent`
				You help users save, load, and manage files using artifacts.

				Available functions:
				- saveArtifact(filename, content): Save content to a file
				- listArtifacts(): List all available artifacts
				- deleteArtifact(filename): Delete an artifact
				- load_artifacts: Load specific artifacts (via LoadArtifactsTool)

				When users ask to save files, use saveArtifact function.
				When users ask to see files, use listArtifacts or load_artifacts.
				Always confirm operations and provide helpful feedback about what was accomplished.`)
			.withTools(
				createTool({
					name: "saveArtifact",
					description:
						"Save text content to an artifact file with a specified filename",
					schema: z.object({
						filename: z.string().describe("Name of the file to save"),
						content: z.string().describe("Content to save in the file"),
					}),
					fn: ({ filename, content }, toolContext) =>
						saveArtifact(filename, content, toolContext),
					isLongRunning: true,
				}),
				createTool({
					name: "listArtifacts",
					description: "List all available artifacts in the current session",
					schema: z.object({}),
					fn: (_args, toolContext) => listArtifacts(toolContext),
					isLongRunning: true,
				}),
				createTool({
					name: "deleteArtifact",
					description: "Delete an artifact file by filename",
					schema: z.object({
						filename: z.string().describe("Name of the file to delete"),
					}),
					fn: ({ filename }, toolContext) =>
						deleteArtifact(filename, toolContext),
					isLongRunning: true,
				}),
				new LoadArtifactsTool(),
			)
			.withSession(sessionService, {
				userId: USER_ID,
				appName: APP_NAME,
			})
			.withArtifactService(artifactService)
			.build();

		/**
		 * Run comprehensive artifact demonstrations
		 * Shows file management operations and persistence capabilities
		 */
		await demonstrateFileOperations(runner);
		await demonstrateCrossSessionPersistence(
			runner,
			artifactService,
			sessionService,
		);

		console.log("\n✅ Artifact Management example completed!");
	} catch (error) {
		console.error("❌ Error in artifact example:", error);
		process.exit(1);
	}
}

/**
 * Runs file operation demonstrations
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateFileOperations(runner: any): Promise<void> {
	/**
	 * Example 1: Save a greeting file
	 * Demonstrates basic file saving capability
	 */
	console.log("\n💾 Saving greeting file...");
	const greeting = await runner.ask('Save "Hello World!" as "greeting.txt"');
	console.log("✅", greeting);

	/**
	 * Example 2: Save user preferences
	 * Shows saving structured data as artifacts
	 */
	console.log("\n⚙️ Saving user preferences...");
	const preferences = await runner.ask(
		'Save my preferences as "user_settings.json": {"theme": "dark", "language": "en"}',
	);
	console.log("✅", preferences);

	/**
	 * Example 3: List all files
	 * Demonstrates artifact enumeration
	 */
	console.log("\n📋 Listing all files...");
	const listFiles = await runner.ask("Show me all my files");
	console.log("✅", listFiles);

	/**
	 * Example 4: Load specific file
	 * Shows how to retrieve saved artifacts
	 */
	console.log("\n📄 Loading greeting file...");
	const loadFile = await runner.ask('Load "greeting.txt"');
	console.log("✅", loadFile);

	/**
	 * Example 5: Update existing file
	 * Demonstrates file modification capabilities
	 */
	console.log("\n🔄 Updating greeting file...");
	const updateFile = await runner.ask(
		'Update "greeting.txt" with "Hello Updated World!"',
	);
	console.log("✅", updateFile);
}

/**
 * Demonstrates cross-session persistence
 * @param runner The AgentBuilder runner for executing agent tasks
 * @param artifactService The artifact service for creating new sessions
 * @param sessionService The session service for creating new sessions
 */
async function demonstrateCrossSessionPersistence(
	_runner: any,
	artifactService: InMemoryArtifactService,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\n🔄 Testing cross-session persistence...");

	/**
	 * Create a new agent instance to test persistence
	 * Artifacts should be accessible across different sessions
	 */
	const { runner: newRunner } = await AgentBuilder.create("file_assistant_new")
		.withModel(env.LLM_MODEL)
		.withDescription("Assistant that manages files using artifacts")
		.withInstruction(
			dedent`
				You help users save, load, and manage files using artifacts.
				When users ask to load files, use the load_artifacts tool.
				Always confirm operations and provide helpful feedback about what was found.`,
		)
		.withTools(new LoadArtifactsTool())
		.withArtifactService(artifactService)
		.withSession(sessionService, { userId: USER_ID, appName: APP_NAME })
		.build();

	const crossSession = await newRunner.ask(
		'Load my user settings from "user_settings.json"',
	);
	console.log("✅", crossSession);
}

/**
 * Custom function to save content as an artifact
 * @param filename Name of the file to save
 * @param content Content to save in the file
 * @param context Tool execution context with artifact capabilities
 * @returns Success or error message
 */
async function saveArtifact(
	filename: string,
	content: string,
	toolContext: any,
): Promise<string> {
	try {
		const part = {
			text: content,
		};

		// Save the artifact using context
		const version = await toolContext.saveArtifact(filename, part);

		return `Successfully saved "${content}" to "${filename}" (version ${version})`;
	} catch (error) {
		return `Error saving artifact: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Custom function to list available artifacts
 * @param context Tool execution context
 * @returns Status message
 */
async function listArtifacts(toolContext: any): Promise<string> {
	try {
		const artifactNames = await toolContext.listArtifacts();
		if (artifactNames.length === 0) {
			return "No artifacts found in the current session.";
		}
		return `Available artifacts: ${artifactNames.join(", ")}`;
	} catch (error) {
		return `Error listing artifacts: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Custom function to delete an artifact
 * @param filename Name of the file to delete
 * @param context Tool execution context
 * @returns Status message
 */
async function deleteArtifact(
	filename: string,
	toolContext: any,
): Promise<string> {
	try {
		if (!toolContext._invocationContext.artifactService) {
			return "Artifact service is not available.";
		}

		await toolContext._invocationContext.artifactService.deleteArtifact({
			appName: toolContext._invocationContext.appName,
			userId: toolContext._invocationContext.userId,
			sessionId: toolContext._invocationContext.session.id,
			filename,
		});

		return `Successfully deleted artifact "${filename}"`;
	} catch (error) {
		return `Error deleting artifact: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
