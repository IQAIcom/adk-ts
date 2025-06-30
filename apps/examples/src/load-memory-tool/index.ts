import { env } from "node:process";
import {
	Event,
	InMemoryMemoryService,
	InMemorySessionService,
	LlmAgent,
	LoadMemoryTool,
	Runner,
	type Session,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "load-memory-example";
const USER_ID = uuidv4();

/**
 * Load Memory Tool Example
 *
 * This example demonstrates how to use the LoadMemoryTool to enable
 * agents to search through persistent conversation memories. The tool
 * allows agents to find and retrieve relevant information from previous
 * conversations and interactions.
 *
 * The example:
 * 1. Creates sample conversation memories across multiple sessions
 * 2. Sets up an agent with LoadMemoryTool capabilities
 * 3. Demonstrates direct memory service operations
 * 4. Shows agent-based memory searches and retrieval
 * 5. Handles cases where no relevant memories exist
 *
 * Expected Output:
 * - Direct memory search results
 * - Agent-based memory retrieval through natural language
 * - Proper handling of memory searches with no results
 * - Tool declaration and configuration details
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
	console.log("🧠 Starting Load Memory Tool example...");

	try {
		/**
		 * Set up memory and session services
		 * Memory service stores conversation history for retrieval
		 */
		const memoryService = new InMemoryMemoryService();
		const sessionService = new InMemorySessionService();

		/**
		 * Create sample conversation memories
		 * These represent previous conversations that can be searched
		 */
		await createSampleMemories(memoryService);

		/**
		 * Create current session for the example
		 * This session will use the memory tool to search previous conversations
		 */
		const currentSession = await sessionService.createSession(
			APP_NAME,
			USER_ID,
		);

		/**
		 * Create agent with memory search capabilities
		 * The agent can search through memories using natural language queries
		 */
		const agent = createMemorySearchAgent();

		/**
		 * Set up runner with memory service integration
		 * Enables the agent to access stored memories
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
			memoryService,
		});

		/**
		 * Demonstrate direct tool usage
		 * Shows how the LoadMemoryTool works at a low level
		 */
		await demonstrateDirectToolUsage();

		/**
		 * Demonstrate direct memory searches
		 * Shows memory service operations without agent involvement
		 */
		await demonstrateDirectMemorySearches(memoryService);

		/**
		 * Demonstrate agent-based memory usage
		 * Shows how agents can search memories through natural language
		 */
		await demonstrateAgentMemoryUsage(runner, currentSession.id);

		console.log("\n✅ Load Memory Tool example completed!");
	} catch (error) {
		console.error("❌ Error in load memory tool example:", error);
		process.exit(1);
	}
}

/**
 * Creates sample conversation memories for demonstration purposes
 * @param memoryService The memory service to populate with sample data
 */
async function createSampleMemories(
	memoryService: InMemoryMemoryService,
): Promise<void> {
	/**
	 * Create sample session about geography
	 * Contains conversations about European capitals
	 */
	const geographySession: Session = {
		id: "sample-session-1",
		appName: APP_NAME,
		userId: USER_ID,
		state: {},
		events: [
			new Event({
				invocationId: "inv-1",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What is the capital of France?" }],
				},
			}),
			new Event({
				invocationId: "inv-1",
				author: "geography_agent",
				content: {
					role: "model",
					parts: [{ text: "The capital of France is Paris." }],
				},
			}),
			new Event({
				invocationId: "inv-2",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What about Germany?" }],
				},
			}),
			new Event({
				invocationId: "inv-2",
				author: "geography_agent",
				content: {
					role: "model",
					parts: [{ text: "The capital of Germany is Berlin." }],
				},
			}),
		],
		lastUpdateTime: Date.now(),
	};

	/**
	 * Create sample session about technology
	 * Contains conversations about AI and machine learning
	 */
	const technologySession: Session = {
		id: "sample-session-2",
		appName: APP_NAME,
		userId: USER_ID,
		state: {},
		events: [
			new Event({
				invocationId: "inv-3",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "Tell me about machine learning" }],
				},
			}),
			new Event({
				invocationId: "inv-3",
				author: "tech_agent",
				content: {
					role: "model",
					parts: [
						{
							text: "Machine learning is a subset of artificial intelligence that allows systems to learn and improve from experience without being explicitly programmed.",
						},
					],
				},
			}),
			new Event({
				invocationId: "inv-4",
				author: "user",
				content: {
					role: "user",
					parts: [{ text: "What about deep learning?" }],
				},
			}),
			new Event({
				invocationId: "inv-4",
				author: "tech_agent",
				content: {
					role: "model",
					parts: [
						{
							text: "Deep learning is a subset of machine learning that uses neural networks with many layers to analyze various factors of data.",
						},
					],
				},
			}),
		],
		lastUpdateTime: Date.now(),
	};

	// Add sessions to memory for searching
	await memoryService.addSessionToMemory(geographySession);
	await memoryService.addSessionToMemory(technologySession);
}

/**
 * Creates and configures the LLM agent with memory search capabilities
 * @returns Configured LlmAgent with LoadMemoryTool
 */
function createMemorySearchAgent(): LlmAgent {
	return new LlmAgent({
		name: "memory_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An assistant that can search through memory to find relevant information",
		instruction: `You are a helpful assistant that can search through memory to find relevant information.
Use the load_memory tool to search for information when users ask questions.
Present the memory results in a clear and helpful way, summarizing what was found.`,
		tools: [new LoadMemoryTool()],
	});
}

/**
 * Demonstrates direct tool usage and configuration
 */
async function demonstrateDirectToolUsage(): Promise<void> {
	console.log("\n=== Direct Tool Usage Examples ===");

	const loadMemoryTool = new LoadMemoryTool();
	console.log("Tool name:", loadMemoryTool.name);
	console.log("Tool description:", loadMemoryTool.description);
	console.log("\nTool declaration:");
	console.log(JSON.stringify(loadMemoryTool.getDeclaration(), null, 2));
}

/**
 * Demonstrates direct memory searches without agent involvement
 * @param memoryService The memory service to search
 */
async function demonstrateDirectMemorySearches(
	memoryService: InMemoryMemoryService,
): Promise<void> {
	console.log("\n=== Direct Memory Searches ===");

	/**
	 * Search for geography-related memories
	 */
	console.log("\nDirect search for 'capital':");
	const geographyResult = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "capital",
	});
	console.log("Result:", JSON.stringify(geographyResult, null, 2));

	/**
	 * Search for technology-related memories
	 */
	console.log("\nDirect search for 'machine learning':");
	const technologyResult = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "machine learning",
	});
	console.log("Result:", JSON.stringify(technologyResult, null, 2));
}

/**
 * Demonstrates agent-based memory usage through natural language
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function demonstrateAgentMemoryUsage(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	console.log("\n=== Agent-Based Memory Usage ===");

	/**
	 * Example 1: Search for geography information
	 */
	console.log("\nExample 1: Ask about European capitals");
	const result1 = await runAgentTask(
		runner,
		sessionId,
		"Search my memory for information about European capitals",
	);
	console.log("Agent response:", result1);

	/**
	 * Example 2: Search for technology information
	 */
	console.log("\nExample 2: Ask about artificial intelligence");
	const result2 = await runAgentTask(
		runner,
		sessionId,
		"What do I know about artificial intelligence and machine learning?",
	);
	console.log("Agent response:", result2);

	/**
	 * Example 3: Search for non-existent information
	 */
	console.log("\nExample 3: Ask about something not in memory");
	const result3 = await runAgentTask(
		runner,
		sessionId,
		"What do I know about quantum physics?",
	);
	console.log("Agent response:", result3);

	/**
	 * Example 4: General learning-related search
	 */
	console.log("\nExample 4: General memory search");
	const result4 = await runAgentTask(
		runner,
		sessionId,
		"Search my memory for any conversations about learning",
	);
	console.log("Agent response:", result4);
}

/**
 * Executes a user message through the agent and returns the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param userMessage The message to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentTask(
	runner: Runner,
	sessionId: string,
	userMessage: string,
): Promise<string> {
	const newMessage = {
		parts: [{ text: userMessage }],
	};

	let agentResponse = "";

	try {
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId,
			newMessage,
		})) {
			if (event.author === "memory_assistant" && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					agentResponse += content;
				}
			}
		}
	} catch (error) {
		return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
	}

	return agentResponse || "No response from agent";
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
