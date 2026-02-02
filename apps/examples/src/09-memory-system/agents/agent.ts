import {
	AgentBuilder,
	InMemorySessionService,
	LlmSummaryProvider,
	MemoryService,
	OpenAIEmbedding,
	RecallMemoryTool,
} from "@iqai/adk";

const model = process.env.LLM_MODEL || "gemini-2.5-flash";
const appName = "memory-demo";
const userId = "user-123";

/**
 * Creates shared services for memory persistence across sessions
 */
export function createSharedServices() {
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

	return { sessionService, memoryService };
}

/**
 * Creates a basic assistant agent (no memory recall)
 */
export async function getBasicAgent(
	sessionService: ReturnType<typeof createSharedServices>["sessionService"],
	memoryService: ReturnType<typeof createSharedServices>["memoryService"],
) {
	return AgentBuilder.withModel(model)
		.withInstruction("You are a helpful assistant.")
		.withSessionService(sessionService, { appName, userId })
		.withMemory(memoryService)
		.build();
}

/**
 * Creates an assistant agent with memory recall capabilities
 */
export async function getMemoryAgent(
	sessionService: ReturnType<typeof createSharedServices>["sessionService"],
	memoryService: ReturnType<typeof createSharedServices>["memoryService"],
) {
	return AgentBuilder.withModel(model)
		.withInstruction(
			"You are a helpful assistant with memory. Use recall_memory to search past conversations when relevant.",
		)
		.withTools(new RecallMemoryTool())
		.withSessionService(sessionService, { appName, userId })
		.withMemory(memoryService)
		.build();
}
