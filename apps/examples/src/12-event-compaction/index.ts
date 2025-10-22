import { AgentBuilder, LLMRegistry, LlmEventSummarizer } from "@iqai/adk";

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

	const { runner, session } = await AgentBuilder.create("assistant")
		.withModel("gemini-2.5-flash")
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
		await runner.ask(question);

		const compactionCount = session.events.filter(
			(e) => e.actions?.compaction,
		).length;
		console.log(`   Compactions: ${compactionCount}\n`);
	}

	console.log("✅ Basic compaction complete");
}

async function customSummarizer() {
	console.log("\n🎨 Custom Summarizer:\n");

	const customModel = LLMRegistry.newLLM("gemini-2.0-flash-lite");
	const customPrompt = `Summarize as bullet points:
{events}
• Topic: [summary]
• Details: [summary]`;

	const customSummarizer = new LlmEventSummarizer(customModel, customPrompt);

	const { runner, session } = await AgentBuilder.create("custom")
		.withModel("gemini-2.5-flash")
		.withEventsCompaction({
			summarizer: customSummarizer,
			compactionInterval: 2,
			overlapSize: 1,
		})
		.build();

	await runner.ask("Tell me about Python");
	await runner.ask("And about Go");
	await runner.ask("And about Rust");

	const compaction = session.events.find((e) => e.actions?.compaction);
	if (compaction?.actions?.compaction) {
		console.log("Custom summary:");
		console.log(
			compaction.actions.compaction.compactedContent.parts?.[0]?.text,
		);
	}

	console.log("\n✅ Custom summarizer complete");
}

main().catch(console.error);
