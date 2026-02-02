import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 09. Memory System
 *
 * Demonstrates semantic memory search with embeddings:
 * 1. Create session with trigger: "session_end"
 * 2. User discusses "African Grey parrots"
 * 3. End session → triggers memory storage with embeddings
 * 4. Create NEW session (same memory service)
 * 5. Ask about "flying animal" - agent recalls parrots via semantic search
 *
 * Key concepts in agent.ts:
 * - MemoryService with semantic search via embeddings
 * - LlmSummaryProvider for session summarization
 * - OpenAIEmbedding for vector embeddings
 * - RecallMemoryTool for explicit memory search
 * - withMemory() to attach memory service to agent
 */
async function main() {
	console.log("\n🧠 Memory System Example\n");

	const { runner, session, sessionService, memoryService } =
		await getRootAgent();

	// =============================================
	// SESSION 1: Discuss parrots
	// =============================================
	console.log(`📍 Session 1: ${session.id}\n`);

	await ask(
		runner,
		"I love African Grey parrots! They can learn over 1000 words.",
	);

	// End session 1 - triggers memory storage
	console.log("\n🔚 Ending Session 1 → triggers memory storage...");
	const endedSession = await sessionService.endSession(
		session.appName,
		session.userId,
		session.id,
	);
	if (endedSession) {
		await memoryService.addSessionToMemory(endedSession);
		console.log("✅ Memory stored!\n");
	}

	// =============================================
	// SESSION 2: Test semantic recall
	// =============================================
	console.log("═".repeat(50));
	const session2 = await sessionService.createSession(
		session.appName,
		session.userId,
	);
	console.log(`\n📍 Session 2: ${session2.id}`);
	console.log('   (No word overlap with "African Grey parrot")\n');

	// Use runAsync with the new session
	for await (const event of runner.runAsync({
		userId: session2.userId,
		sessionId: session2.id,
		newMessage: {
			parts: [{ text: "What flying animal did I mention that I liked?" }],
		},
	})) {
		if (event.turnComplete && event.content?.parts?.[0]?.text) {
			console.log(`🤖 Agent: ${event.content.parts[0].text}\n`);
		}
	}

	console.log("✅ Semantic search found 'parrots' from 'flying animal'.\n");
}

main().catch(console.error);
