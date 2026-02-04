import { join } from "node:path";
import {
	AgentBuilder,
	FileVectorStore,
	InMemorySessionService,
	LlmSummaryProvider,
	MemoryService,
	OpenAIEmbeddingProvider,
	RecallMemoryTool,
	VectorStorageProvider,
} from "@iqai/adk";

export async function getRootAgent() {
	const sessionService = new InMemorySessionService();

	const vectorStore = new FileVectorStore({
		basePath: join(process.cwd(), "data", "memories"),
		writeSummaries: true,
		format: "json",
	});

	const memoryService = new MemoryService({
		storage: new VectorStorageProvider({
			vectorStore,
			searchMode: "vector",
		}),
		summaryProvider: new LlmSummaryProvider({
			model: "gpt-4o-mini",
		}),
		embeddingProvider: new OpenAIEmbeddingProvider({
			model: "text-embedding-3-small",
		}),
	});

	return AgentBuilder.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction(
			"You are a helpful assistant. When asked about previous conversations or user preferences, use the recall_memory tool to search your memory. Only use tools that are provided to you.",
		)
		.withTools(new RecallMemoryTool())
		.withSessionService(sessionService)
		.withMemory(memoryService)
		.build();
}
