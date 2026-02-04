import {
	AgentBuilder,
	InMemorySessionService,
	InMemoryVectorStore,
	MemoryService,
	OpenAIEmbeddingProvider,
	PassthroughSummaryProvider,
	RecallMemoryTool,
	VectorStorageProvider,
} from "@iqai/adk";

export async function getRootAgent() {
	const sessionService = new InMemorySessionService();

	const memoryService = new MemoryService({
		storage: new VectorStorageProvider({
			vectorStore: new InMemoryVectorStore(),
			searchMode: "vector",
		}),
		summaryProvider: new PassthroughSummaryProvider(),
		embeddingProvider: new OpenAIEmbeddingProvider({
			model: "text-embedding-3-small",
		}),
	});

	return AgentBuilder.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction(
			"You are a helpful assistant with memory. Use recall_memory to search past conversations when relevant.",
		)
		.withTools(new RecallMemoryTool())
		.withSessionService(sessionService)
		.withMemory(memoryService)
		.build();
}
