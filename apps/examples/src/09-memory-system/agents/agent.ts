import {
	InMemorySessionService,
	LlmAgent,
	LlmSummaryProvider,
	MemoryService,
	OpenAIEmbedding,
	RecallMemoryTool,
	Runner,
} from "@iqai/adk";

const model = process.env.LLM_MODEL || "gemini-2.5-flash";
const appName = "memory-demo";

/**
 * Creates shared services for the memory system demo
 */
export function createServices() {
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

	return { sessionService, memoryService, appName };
}

/**
 * Creates a basic assistant agent (no memory tools)
 */
export function createBasicAgent() {
	return new LlmAgent({
		name: "assistant",
		description: "A helpful assistant",
		model,
		instruction: "You are a helpful assistant.",
	});
}

/**
 * Creates an assistant agent with memory recall capabilities
 */
export function createMemoryAgent() {
	return new LlmAgent({
		name: "assistant_with_memory",
		description: "A helpful assistant with memory recall capabilities",
		model,
		instruction:
			"You are a helpful assistant with memory. Use recall_memory to search past conversations when relevant.",
		tools: [new RecallMemoryTool()],
	});
}

/**
 * Creates a runner for an agent with the given services
 */
export function createRunner(
	agent: LlmAgent,
	services: ReturnType<typeof createServices>,
) {
	return new Runner({
		appName: services.appName,
		agent,
		sessionService: services.sessionService,
		memoryService: services.memoryService,
	});
}
