import {
	InMemorySessionService,
	LlmAgent,
	LlmSummaryProvider,
	MemoryService,
	OpenAIEmbedding,
	RecallMemoryTool,
	Runner,
} from "@iqai/adk";

/**
 * 09. Memory System
 *
 * Demonstrates semantic memory search:
 * 1. Create session with trigger: "session_end"
 * 2. User discusses "African Grey parrots"
 * 3. End session → triggers memory storage
 * 4. Create NEW session (same memory service)
 * 5. Ask about "flying animal" - agent recalls parrots via semantic search
 */
async function main() {
	console.log("\n🧠 Memory System Example\n");

	// Shared services
	const sessionService = new InMemorySessionService();
	const memoryService = new MemoryService({
		trigger: { type: "session_end" },
		summarization: {
			provider: new LlmSummaryProvider({
				model: process.env.LLM_MODEL || "openrouter/openai/gpt-4o-mini",
			}),
		},
		embedding: {
			provider: new OpenAIEmbedding({ model: "text-embedding-3-small" }),
		},
		searchTopK: 3,
	});

	const model = process.env.LLM_MODEL || "gemini-2.5-flash";
	const appName = "memory-demo";
	const userId = "user-123";

	// =============================================
	// SESSION 1: Discuss parrots
	// =============================================
	console.log("📍 Session 1: Creating session...");
	const session1 = await sessionService.createSession(appName, userId);
	console.log(`   Created session: ${session1.id}\n`);

	// Build agent for session 1
	const agent1 = new LlmAgent({
		name: "assistant",
		description: "A helpful assistant",
		model,
		instruction: "You are a helpful assistant.",
	});

	const runner1 = new Runner({
		appName,
		agent: agent1,
		sessionService,
		memoryService,
	});

	console.log(
		"👤 User: I love African Grey parrots! They can learn over 1000 words.\n",
	);

	const events1 = runner1.runAsync({
		userId,
		sessionId: session1.id,
		newMessage: {
			role: "user",
			parts: [
				{
					text: "I love African Grey parrots! They can learn over 1000 words.",
				},
			],
		},
	});

	for await (const event of events1) {
		if (event.turnComplete && event.content?.parts?.[0]?.text) {
			console.log(
				`🤖 Agent: ${event.content.parts[0].text.slice(0, 200)}...\n`,
			);
		}
	}

	// End session 1 - this triggers memory storage
	console.log("🔚 Ending Session 1 → triggers memory storage...");
	const endedSession = await sessionService.endSession(
		appName,
		userId,
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
	console.log("\n📍 Session 2: Creating NEW session (same memory)...");
	const session2 = await sessionService.createSession(appName, userId);
	console.log(`   Created session: ${session2.id}\n`);

	// Build agent for session 2 with RecallMemoryTool
	const agent2 = new LlmAgent({
		name: "assistant_with_memory",
		description: "A helpful assistant with memory recall capabilities",
		model,
		instruction:
			"You are a helpful assistant with memory. Use recall_memory to search past conversations when relevant.",
		tools: [new RecallMemoryTool()],
	});

	const runner2 = new Runner({
		appName,
		agent: agent2,
		sessionService,
		memoryService,
	});

	const question = "What flying animal did I mention that I liked?";
	console.log(`👤 User: ${question}`);
	console.log('   (Note: No word overlap with "African Grey parrot")\n');

	const events2 = runner2.runAsync({
		userId,
		sessionId: session2.id,
		newMessage: {
			role: "user",
			parts: [{ text: question }],
		},
	});

	for await (const event of events2) {
		// Show tool calls
		for (const part of event.content?.parts || []) {
			if (part.functionCall?.name === "recall_memory") {
				console.log(
					`🔍 Tool: recall_memory("${part.functionCall.args?.query}")`,
				);
			}
			if (part.functionResponse?.name === "recall_memory") {
				const res = part.functionResponse.response as { count?: number };
				console.log(`   → Found ${res?.count || 0} memories\n`);
			}
		}

		if (event.turnComplete && event.content?.parts?.[0]?.text) {
			console.log(`🤖 Agent: ${event.content.parts[0].text}\n`);
		}
	}

	console.log(
		"✅ Done! Semantic search found 'parrots' from 'flying animal'.\n",
	);
}

main().catch(console.error);
