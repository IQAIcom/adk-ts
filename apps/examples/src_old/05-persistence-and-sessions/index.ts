import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	InMemoryArtifactService,
	LoadArtifactsTool,
	createDatabaseSessionService,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import { ask } from "../utils";

/**
 * 05 - Persistence and Sessions
 *
 * Learn how to persist data across agent interactions using sessions
 * and artifacts for file storage.
 *
 * Concepts covered:
 * - Database session services
 * - Artifact services for file management
 * - Different persistence strategies
 * - Cross-session data retrieval
 * - File versioning and updates
 */

const APP_NAME = "persistence-example";
const USER_ID = uuidv4();

// Helper function to get SQLite connection string
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite:${dbPath}`;
}

// Artifact management tools
const saveArtifactTool = createTool({
	name: "save_artifact",
	description: "Save content as an artifact file",
	schema: z.object({
		filename: z.string().describe("Name of the file to save"),
		content: z.string().describe("Content to save in the file"),
		description: z
			.string()
			.optional()
			.describe("Optional description of the artifact"),
	}),
	fn: async ({ filename, content, description }, context) => {
		const artifactService = context.saveArtifact;
		if (!artifactService) {
			return { success: false, message: "Artifact service not available" };
		}

		try {
			const part = { text: content };
			const version = await context.saveArtifact(filename, part);

			return {
				success: true,
				version,
				message: `✅ Saved artifact: ${filename} (${content.length} characters)`,
			};
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to save artifact: ${error}`,
			};
		}
	},
});

const updateArtifactTool = createTool({
	name: "update_artifact",
	description: "Update an existing artifact file",
	schema: z.object({
		filename: z.string().describe("Name of the file to update"),
		content: z.string().describe("New content for the file"),
	}),
	fn: async ({ filename, content }, context) => {
		try {
			const part = { text: content };
			const version = await context.saveArtifact(filename, part);

			return {
				success: true,
				version,
				message: `📝 Updated artifact: ${filename} (version ${version})`,
			};
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to update artifact: ${error}`,
			};
		}
	},
});

async function demonstrateSessionPersistence() {
	console.log("📝 Part 1: Session Persistence (Conversational State)");
	console.log("════════════════════════════════════════════════════\n");

	// Create database session service
	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("sessions"),
	);

	// Counter tool that uses session state
	const counterTool = createTool({
		name: "increment_counter",
		description: "Increment a named counter in session state",
		schema: z.object({
			counterName: z.string().describe("Name of the counter"),
			amount: z.number().default(1).describe("Amount to increment"),
		}),
		fn: ({ counterName, amount }, context) => {
			const counters = context.state.get("counters", {});
			const oldValue = counters[counterName] || 0;
			const newValue = oldValue + amount;
			counters[counterName] = newValue;
			context.state.set("counters", counters);

			return {
				counterName,
				oldValue,
				newValue,
				increment: amount,
				allCounters: counters,
				message: `📊 ${counterName}: ${oldValue} → ${newValue} (+${amount})`,
			};
		},
	});

	// Create agent with persistent sessions
	const { runner, session } = await AgentBuilder.create("persistent_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that remembers conversation state across runs")
		.withInstruction(
			dedent`
			You are a persistent agent that can remember information across sessions.
			You have access to counters that persist between conversations.
			Help users track various metrics and provide insights about their usage patterns.
		`,
		)
		.withTools(counterTool)
		.withSessionService(sessionService, {
			userId: USER_ID,
			appName: APP_NAME,
		})
		.build();

	console.log(`🔑 Session ID: ${session.id}`);
	console.log(`👤 User ID: ${USER_ID}`);

	// Test session persistence
	console.log("🧮 Testing counter persistence:");
	await ask(runner, "Increment the 'examples_run' counter by 1");

	await ask(runner, "Increment the 'coffee_breaks' counter by 2");

	await ask(runner, "Show me all my counters and their values");

	// Demonstrate session retrieval
	console.log("💾 Current session state:");
	const currentSession = await sessionService.getSession(
		APP_NAME,
		USER_ID,
		session.id,
	);
	console.log(JSON.stringify(currentSession?.state, null, 2));

	console.log(
		"\n📚 Session persists between runs - try running this example again!",
	);
	console.log("Your counters will remember their values.\n");
}

async function demonstrateArtifactPersistence() {
	console.log("📝 Part 2: Artifact Persistence (File Storage)");
	console.log("═══════════════════════════════════════════════\n");

	// Create artifact service
	const artifactService = new InMemoryArtifactService();

	// Create agent with artifact capabilities
	const { runner } = await AgentBuilder.create("artifact_manager")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that can manage persistent files and documents")
		.withInstruction(
			dedent`
			You are a file management assistant with artifact capabilities.
			You can save, load, and update files that persist across sessions.

			When users ask you to save information, create appropriate filenames
			and organize content logically. Always confirm what you've saved.
		`,
		)
		.withTools(saveArtifactTool, updateArtifactTool, new LoadArtifactsTool())
		.withArtifactService(artifactService)
		.build();

	// Test artifact creation
	console.log("📄 Creating artifacts:");
	await ask(
		runner,
		dedent`
			Save a shopping list with these items:
			- Apples
			- Bread
			- Milk
			- Cheese
			- Coffee

			Save it as "shopping-list.txt"
		`,
	);

	await ask(
		runner,
		dedent`
			Create a meeting agenda for tomorrow:
			1. Project status update
			2. Budget review
			3. Next quarter planning
			4. Action items

			Save it as "meeting-agenda.md"
		`,
	);

	// Test artifact loading
	console.log("📖 Loading artifacts:");
	await ask(runner, "Show me all my saved files and their contents");

	// Test artifact updating
	console.log("✏️ Updating artifacts:");
	await ask(
		runner,
		dedent`
			Update the shopping list to add:
			- Bananas
			- Greek yogurt

			And remove milk from the list.
		`,
	);

	// Show final artifact state
	console.log("📋 Final artifact verification:");
	await ask(runner, "Show me the updated shopping list content");
}

async function demonstrateHybridPersistence() {
	console.log("📝 Part 3: Hybrid Persistence (Sessions + Artifacts)");
	console.log("═══════════════════════════════════════════════════\n");

	// Create both services
	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("hybrid"),
	);
	const artifactService = new InMemoryArtifactService();

	// Project management tool that uses both session state and artifacts
	const createProjectTool = createTool({
		name: "create_project",
		description: "Create a new project with metadata and files",
		schema: z.object({
			projectName: z.string().describe("Name of the project"),
			description: z.string().describe("Project description"),
			initialFiles: z
				.array(
					z.object({
						filename: z.string(),
						content: z.string(),
					}),
				)
				.optional()
				.describe("Initial project files"),
		}),
		fn: async ({ projectName, description, initialFiles }, context) => {
			// Store project metadata in session state
			const projects = context.state.get("projects", []);
			const project = {
				id: Date.now(),
				name: projectName,
				description,
				createdAt: new Date().toISOString(),
				fileCount: initialFiles?.length || 0,
			};
			projects.push(project);
			context.state.set("projects", projects);

			// Save initial files as artifacts
			const savedFiles = [];

			if (initialFiles) {
				for (const file of initialFiles) {
					try {
						const part = { text: file.content };
						const version = await context.saveArtifact(
							`${projectName}/${file.filename}`,
							part,
						);
						savedFiles.push({ filename: file.filename, version });
					} catch (error) {
						console.error(`Failed to save ${file.filename}:`, error);
					}
				}
			}

			return {
				success: true,
				project,
				savedFiles,
				totalProjects: projects.length,
				message: `🚀 Created project "${projectName}" with ${savedFiles.length} files`,
			};
		},
	});

	// Create hybrid agent
	const { runner } = await AgentBuilder.create("project_manager")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("A project manager that tracks projects and manages files")
		.withInstruction(
			dedent`
			You are a project management assistant that helps organize projects.
			You track project metadata in session state and store project files as artifacts.

			When creating projects, suggest appropriate initial files and organize
			everything clearly. Provide helpful summaries of project status.
		`,
		)
		.withTools(createProjectTool, saveArtifactTool, new LoadArtifactsTool())
		.withSessionService(sessionService, { userId: USER_ID, appName: APP_NAME })
		.withArtifactService(artifactService)
		.build();

	// Test hybrid persistence
	console.log("🏗️ Creating a project with hybrid persistence:");
	await ask(
		runner,
		dedent`
			Create a new project called "Website Redesign" with description
			"Modernize company website with new design and improved UX".

			Include these initial files:
			1. README.md with project overview
			2. requirements.txt with initial requirements
			3. timeline.md with project phases
		`,
	);

	console.log("📊 Checking project status:");
	await ask(runner, "Show me all my projects and their files");
}

async function demonstratePersistencePatterns() {
	console.log("📝 Part 4: Persistence Patterns Summary");
	console.log("═════════════════════════════════════\n");

	console.log(dedent`
		🎓 Persistence Patterns in ADK:

		1. **Session State** (Database/Memory)
		   - Conversational context and user preferences
		   - Counters, flags, and temporary data
		   - Structured data that needs querying
		   - Automatic serialization/deserialization

		2. **Artifacts** (File System/Storage)
		   - Documents, code files, and content
		   - Long-term file storage with versioning
		   - Binary data and large text content
		   - Cross-session file sharing

		3. **Hybrid Approach**
		   - Project metadata in sessions
		   - Project files as artifacts
		   - Reference artifacts from session data
		   - Best of both worlds

		📋 When to use each:
		- Sessions: User settings, conversation history, structured data
		- Artifacts: Documents, files, content that users create/edit
		- Hybrid: Complex applications with both metadata and files

		🔄 Data Lifecycle:
		- Temporary: In-memory during single interaction
		- Session: Persistent across conversations
		- Artifacts: Long-term file storage
		- Shared: Accessible across users/sessions
	`);
}

async function main() {
	console.log("💾 Persistence and sessions:");

	await demonstrateSessionPersistence();
	await demonstrateArtifactPersistence();
	await demonstrateHybridPersistence();
	await demonstratePersistencePatterns();
}

main().catch(console.error);
