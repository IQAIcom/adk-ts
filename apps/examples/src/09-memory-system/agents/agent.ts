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

	// Create embedding provider for semantic search
	const embeddingProvider = new OpenAIEmbeddingProvider({
		model: "text-embedding-3-small",
	});

	// Create memory service with pluggable providers
	const memoryService = new MemoryService({
		// Vector storage for semantic search
		storage: new VectorStorageProvider({
			vectorStore: new InMemoryVectorStore(),
			searchMode: "vector",
		}),
		// PassthroughSummaryProvider extracts raw text without LLM summarization
		// Use LlmSummaryProvider for intelligent summarization
		summaryProvider: new PassthroughSummaryProvider(),
		// OpenAI embeddings for semantic similarity
		embeddingProvider,
	});

	return AgentBuilder.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
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
}
