import {
	AgentBuilder,
	InMemorySessionService,
	LlmSummaryProvider,
	MemoryService,
	OpenAIEmbedding,
	RecallMemoryTool,
} from "@iqai/adk";

export async function getRootAgent() {
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

	const result = await AgentBuilder.withModel(
		process.env.LLM_MODEL || "gemini-2.5-flash",
	)
		.withInstruction(
			"You are a helpful assistant with memory. Use recall_memory to search past conversations when relevant.",
		)
		.withTools(new RecallMemoryTool())
		.withSessionService(sessionService, {
			appName: "memory-demo",
			userId: "user-123",
		})
		.withMemory(memoryService)
		.build();

	return { ...result, memoryService };
}
