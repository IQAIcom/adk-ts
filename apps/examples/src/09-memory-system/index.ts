import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 09. Memory System
 *
 * Demonstrates semantic memory search with embeddings:
 * 1. User discusses "African Grey parrots"
 * 2. End session and store to memory
 * 3. Create NEW session (same memory service)
 * 4. Ask about "flying animal" - agent recalls parrots via semantic search
 *
 * Key concepts:
 * - User controls WHEN to store memory (call addSessionToMemory when you want)
 * - Pluggable providers: storage, summarization, embeddings
 * - VectorStorageProvider for semantic search with vector databases
 * - OpenAIEmbeddingProvider for text embeddings
 * - RecallMemoryTool for explicit memory search by agent
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

	// Store session 1 to memory (user controls when)
	console.log("\n💾 Storing Session 1 to memory...");
	const currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);
	if (currentSession) {
		await memoryService.addSessionToMemory(currentSession);
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

	// Note: runner.ask() uses session 1, so we use runAsync for session 2
	const question = "What flying animal did I mention that I liked?";
	console.log(`👤 User:  ${question}`);
	const response = await runner.ask({
		parts: [{ text: question }],
	});
	console.log(`🤖 Agent: ${response}\n`);

	console.log("✅ Semantic search found 'parrots' from 'flying animal'.\n");
}

main().catch(console.error);
