import { ask } from "../utils";
import {
	createSharedServices,
	getBasicAgent,
	getMemoryAgent,
} from "./agents/agent";

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

	// Shared services persist memory across sessions
	const { sessionService, memoryService } = createSharedServices();

	// =============================================
	// SESSION 1: Discuss parrots
	// =============================================
	console.log("📍 Session 1: Creating agent...");
	const { runner: runner1, session: session1 } = await getBasicAgent(
		sessionService,
		memoryService,
	);
	console.log(`   Created session: ${session1.id}\n`);

	await ask(
		runner1,
		"I love African Grey parrots! They can learn over 1000 words.",
	);

	// End session 1 - this triggers memory storage
	console.log("\n🔚 Ending Session 1 → triggers memory storage...");
	const endedSession = await sessionService.endSession(
		session1.appName,
		session1.userId,
		session1.id,
	);
	if (endedSession) {
		await memoryService.addSessionToMemory(endedSession);
		console.log("✅ Memory stored!\n");
	}

	// =============================================
	// SESSION 2: Test semantic recall
	// =============================================
	console.log("═".repeat(50));
	console.log("\n📍 Session 2: Creating NEW agent (same memory)...");
	const { runner: runner2, session: session2 } = await getMemoryAgent(
		sessionService,
		memoryService,
	);
	console.log(`   Created session: ${session2.id}\n`);

	console.log('   (Note: No word overlap with "African Grey parrot")\n');
	await ask(runner2, "What flying animal did I mention that I liked?");

	console.log(
		"\n✅ Done! Semantic search found 'parrots' from 'flying animal'.\n",
	);
}

main().catch(console.error);
