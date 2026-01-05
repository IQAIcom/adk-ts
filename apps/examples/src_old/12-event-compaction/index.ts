import {
	AgentBuilder,
	BaseSessionService,
	LLMRegistry,
	LlmEventSummarizer,
	Session,
} from "@iqai/adk";
import dedent from "dedent";
import { ask } from "../utils";

/**
 * 12 - Event Compaction
 *
 * Automatically manage long conversation histories by replacing ranges of events
 * with LLM-generated summaries to reduce token usage.
 *
 * Concepts covered:
 * - Event compaction configuration (compactionInterval, overlapSize)
 * - Automatic summarization of conversation history
 * - Custom summarizers with custom prompts
 * - Accessing session and compaction events
 */
async function main() {
	await basicCompaction();
	await customSummarizer();
	console.log("\n✅ All examples complete");
}

async function basicCompaction() {
	console.log("🗜️ Event Compaction:\n");

	const { runner, sessionService, session } = await AgentBuilder.create(
		"assistant",
	)
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
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
		"What about interfaces?",
	];

	for (const [i, question] of questions.entries()) {
		console.log(`Q${i + 1}: ${question}`);
		await ask(runner, question);
		await logCompactions(sessionService, session);
	}

	console.log("✅ Basic compaction complete");
}

async function customSummarizer() {
	console.log("\n🎨 Custom Summarizer:\n");

	const customModel = LLMRegistry.newLLM(
		process.env.LLM_MODEL || "gemini-2.5-flash",
	);
	const customPrompt = dedent`
	Summarize the following events as concise bullet points:

	{events}

	• Topic: [brief summary]
	• Details: [detailed summary]
	`;

	const customSummarizer = new LlmEventSummarizer(customModel, customPrompt);

	const { runner, session, sessionService } = await AgentBuilder.create(
		"custom",
	)
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withEventsCompaction({
			summarizer: customSummarizer,
			compactionInterval: 2,
			overlapSize: 1,
		})
		.build();

	await ask(runner, "Tell me about Python");
	await ask(runner, "And about Go");
	await ask(runner, "And about Rust");

	logCompactions(sessionService, session);

	console.log("\n✅ Custom summarizer complete");
}
const logCompactions = async (
	sessionService: BaseSessionService,
	session: Session,
) => {
	const updatedSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);

	const compactions = updatedSession.events
		.filter((e) => e.actions?.compaction)
		.map((e) => e.actions.compaction);

	if (compactions.length === 0) {
		console.log("ℹ️ No compactions found");
		return updatedSession;
	}

	for (const [i, c] of compactions.entries()) {
		const start = new Date(c.startTimestamp * 1000).toISOString();
		const end = new Date(c.endTimestamp * 1000).toISOString();
		const parts = c.compactedContent?.parts ?? [];
		const text = parts.map((p: any) => p.text).join("\n\n");
		console.log(
			`📦 Compaction ${i + 1} (${start} → ${end})\nRole: ${c.compactedContent?.role}\n${text}\n`,
		);
	}
	return updatedSession;
};

main().catch(console.error);
