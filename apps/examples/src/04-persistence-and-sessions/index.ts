import {
	AgentBuilder,
	type BaseSessionService,
	InMemoryArtifactService,
	LoadArtifactsTool,
	type Session,
	createDatabaseSessionService,
	createTool,
} from "@iqai/adk";
import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import { ask } from "../utils";

const APP_NAME = "persistence-example";
const USER_ID = uuidv4();

function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite:${dbPath}`;
}

const saveArtifactTool = createTool({
	name: "save_artifact",
	description: "Save content as an artifact file",
	schema: z.object({
		filename: z.string().describe("Name of the file to save"),
		content: z.string().describe("Content to save in the file"),
	}),
	fn: async ({ filename, content }, context) => {
		const part = { text: content };
		const version = await context.saveArtifact(filename, part);
		return {
			success: true,
			version,
			message: `Saved artifact: ${filename}`,
		};
	},
});

async function demonstrateSessionPersistence() {
	console.log("💾 Part 1: Session Persistence\n");

	const sessionService = createDatabaseSessionService(
		getSqliteConnectionString("sessions"),
	);

	const counterTool = createTool({
		name: "increment_counter",
		description: "Increment a named counter",
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
			};
		},
	});

	const { runner, session } = await AgentBuilder.create("persistent_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that remembers conversation state across runs")
		.withInstruction(
			"You are a persistent agent. Help users track metrics using counters.",
		)
		.withTools(counterTool)
		.withSessionService(sessionService, {
			userId: USER_ID,
			appName: APP_NAME,
		})
		.build();

	console.log(`Session ID: ${session.id}`);

	await ask(runner, "Increment the 'examples_run' counter by 1");
	await ask(runner, "Increment the 'coffee_breaks' counter by 2");
	await ask(runner, "Show me all my counters and their values");
}

async function demonstrateArtifactPersistence() {
	console.log("\n📄 Part 2: Artifact Persistence\n");

	const artifactService = new InMemoryArtifactService();

	const { runner } = await AgentBuilder.create("artifact_manager")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that can manage persistent files")
		.withInstruction(
			"You are a file management assistant. Save and load files as requested.",
		)
		.withTools(saveArtifactTool, new LoadArtifactsTool())
		.withArtifactService(artifactService)
		.build();

	await ask(
		runner,
		'Save a shopping list with: Apples, Bread, Milk, Cheese, Coffee as "shopping-list.txt"',
	);
	await ask(runner, "Show me all my saved files and their contents");
}

async function demonstrateSessionRewind() {
	console.log("\n⏪ Part 3: Session Rewind\n");

	const { runner, sessionService, session } = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	).build();

	const questions = [
		"What is a function in JavaScript?",
		"How do you declare a variable in TypeScript?",
		"How do you create an array?",
	];

	const chat: { q: string; a: string; i: string }[] = [];

	for (const question of questions) {
		const answer = await runner.ask(question);
		const invocationId = await getLatestInvocationId(sessionService, session);
		chat.push({ q: question, a: answer, i: invocationId });
		console.log(`💬 Q: ${question}`);
		console.log(`🤖 A: ${answer}\n`);
	}

	await ask(runner, "what is my last question?");

	console.log("Rewinding to 2nd question...");
	await runner.rewind({
		userId: session.userId,
		sessionId: session.id,
		rewindBeforeInvocationId: chat[1].i,
	});
	await ask(runner, "what is my last question?");
}

async function demonstrateEventCompaction() {
	console.log("\n🗜️ Part 4: Event Compaction\n");

	const { runner, sessionService, session } = await AgentBuilder.create(
		"assistant",
	)
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction("You are a helpful assistant. Be brief.")
		.withEventsCompaction({
			compactionInterval: 3,
			overlapSize: 1,
		})
		.build();

	const questions = [
		"What is TypeScript?",
		"How does it differ from JavaScript?",
		"What are type guards?",
		"Explain generics briefly",
	];

	for (const [i, question] of questions.entries()) {
		console.log(`Q${i + 1}: ${question}`);
		await ask(runner, question);
		await logCompactions(sessionService, session);
	}
}

async function getLatestInvocationId(
	sessionService: BaseSessionService,
	session: Session,
) {
	const currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);
	return currentSession.events[currentSession.events.length - 1]?.invocationId;
}

async function logCompactions(
	sessionService: BaseSessionService,
	session: Session,
) {
	const updatedSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);

	const compactions = updatedSession.events
		.filter((e) => e.actions?.compaction)
		.map((e) => e.actions.compaction);

	if (compactions.length === 0) return;

	for (const [i, c] of compactions.entries()) {
		const parts = c.compactedContent?.parts ?? [];
		const text = parts.map((p: any) => p.text).join("\n");
		console.log(`📦 Compaction ${i + 1}: ${text.substring(0, 100)}...\n`);
	}
}

async function main() {
	console.log("💾 Persistence and Sessions\n");

	await demonstrateSessionPersistence();
	await demonstrateArtifactPersistence();
	await demonstrateSessionRewind();
	await demonstrateEventCompaction();

	console.log("\n✅ Complete! Next: 05-planning-and-code-execution\n");
}

main().catch(console.error);
