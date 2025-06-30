import { env } from "node:process";
import {
	InMemoryMemoryService,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "memory-demo";
const USER_ID = uuidv4();
const MAX_EVENTS = 12; // 6 pairs of user/assistant interactions

/**
 * Memory Usage Example
 *
 * This example demonstrates how to integrate memory services with ADK agents
 * to enable conversation context persistence and retrieval across interactions.
 *
 * The example:
 * 1. Creates an agent with memory service integration
 * 2. Builds conversation history with personal information
 * 3. Demonstrates memory recall capabilities
 * 4. Shows memory search functionality
 * 5. Illustrates context persistence across interactions
 *
 * Expected Output:
 * - Conversation building with information storage
 * - Agent responses that reference previous conversation
 * - Memory search results showing stored information
 * - Context-aware responses based on conversation history
 *
 * Prerequisites:
 * - Node.js environment
 * - GOOGLE_API_KEY environment variable (optional if LLM_MODEL is set)
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Validates required environment configuration
 * @returns True if configuration is valid, false otherwise
 */
function validateEnvironment(): boolean {
	if (!env.GOOGLE_API_KEY && !env.LLM_MODEL) {
		console.log(
			"⚠️  Please set the GOOGLE_API_KEY environment variable to run this example",
		);
		console.log(
			"   Example: GOOGLE_API_KEY=your-key-here npm run dev src/memory-usage",
		);
		return false;
	}
	return true;
}

/**
 * Creates and configures the LLM agent with memory capabilities
 * @returns Configured LlmAgent
 */
function createMemoryAgent(): LlmAgent {
	return new LlmAgent({
		name: "memory_assistant",
		description: "An assistant with memory capabilities using Google Gemini",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		instruction:
			"You are a helpful assistant with memory. You can remember previous conversations " +
			"and refer back to them when relevant. Be conversational and helpful. " +
			"When asked about previous conversations, try to recall specific details mentioned earlier.",
	});
}

/**
 * Sends a message to the agent and handles the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for conversation tracking
 * @param memoryService Memory service for storing conversation context
 * @param sessionId Current session identifier
 * @param message User message to send
 * @returns Agent's response string
 */
async function sendMessage(
	runner: Runner,
	sessionService: InMemorySessionService,
	memoryService: InMemoryMemoryService,
	sessionId: string,
	message: string,
): Promise<string> {
	console.log(`\n💬 USER: ${message}`);

	const newMessage = {
		parts: [{ text: message }],
	};

	let agentResponse = "";

	try {
		/**
		 * Process the message through the agent
		 * The runner handles memory integration automatically
		 */
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

		console.log(`🤖 ASSISTANT: ${agentResponse}`);

		/**
		 * Store current session in memory for future reference
		 * Trim events if conversation gets too long
		 */
		const currentSession = await sessionService.getSession(
			APP_NAME,
			USER_ID,
			sessionId,
		);
		if (currentSession) {
			if (currentSession.events.length > MAX_EVENTS) {
				currentSession.events = currentSession.events.slice(-MAX_EVENTS);
			}

			await memoryService.addSessionToMemory(currentSession);
		}

		return agentResponse;
	} catch (error) {
		const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
		console.error(errorMsg);
		console.log("🤖 ASSISTANT: Sorry, I had trouble processing that request.");
		return errorMsg;
	}
}

/**
 * Builds initial conversation history with personal information
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for conversation tracking
 * @param memoryService Memory service for storing conversation context
 * @param sessionId Current session identifier
 */
async function buildConversationHistory(
	runner: Runner,
	sessionService: InMemorySessionService,
	memoryService: InMemoryMemoryService,
	sessionId: string,
): Promise<void> {
	console.log("📚 Building conversation history...");

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"Hello! My name is Alice and I'm a software engineer.",
	);

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"I'm working on a TypeScript project using React.",
	);

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"What's your purpose and how can you help me?",
	);
}

/**
 * Demonstrates memory recall capabilities
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for conversation tracking
 * @param memoryService Memory service for storing conversation context
 * @param sessionId Current session identifier
 */
async function demonstrateMemoryRecall(
	runner: Runner,
	sessionService: InMemorySessionService,
	memoryService: InMemoryMemoryService,
	sessionId: string,
): Promise<void> {
	console.log(`\n${"=".repeat(50)}`);
	console.log("🧠 DEMONSTRATING MEMORY RECALL");
	console.log("=".repeat(50));

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"Can you remember my name and what I do for work?",
	);

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"What programming language did I mention I was using?",
	);

	await sendMessage(
		runner,
		sessionService,
		memoryService,
		sessionId,
		"Can you summarize what we've talked about so far?",
	);
}

/**
 * Demonstrates memory search functionality
 * @param memoryService Memory service for searching stored conversations
 */
async function demonstrateMemorySearch(
	memoryService: InMemoryMemoryService,
): Promise<void> {
	console.log(`\n${"=".repeat(50)}`);
	console.log("🔍 TESTING MEMORY SEARCH");
	console.log("=".repeat(50));

	/**
	 * Search memory directly to show what's stored
	 * This demonstrates the underlying memory search capabilities
	 */
	const memoryResults = await memoryService.searchMemory({
		appName: APP_NAME,
		userId: USER_ID,
		query: "TypeScript React software engineer",
	});

	console.log(
		`\n📊 Memory search results for "TypeScript React software engineer":`,
	);
	console.log(`Found ${memoryResults.memories.length} relevant memories:`);

	for (const memory of memoryResults.memories) {
		console.log(`- Author: ${memory.author}, Time: ${memory.timestamp}`);
		if (memory.content?.parts) {
			const text = memory.content.parts
				.map((part) => part.text || "")
				.join("")
				.substring(0, 100);
			console.log(`  Content: ${text}${text.length >= 100 ? "..." : ""}`);
		}
	}
}

async function main() {
	console.log("🧠 Starting Memory Usage example...");

	/**
	 * Validate environment configuration
	 * Ensure required API keys are available
	 */
	if (!validateEnvironment()) {
		process.exit(1);
	}

	try {
		/**
		 * Set up memory and session services
		 * Memory service stores conversation context for future retrieval
		 */
		const memoryService = new InMemoryMemoryService();
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		console.log(`📋 Created session: ${session.id}`);

		/**
		 * Create agent with memory capabilities
		 * The agent can reference previous conversations
		 */
		const agent = createMemoryAgent();

		/**
		 * Set up runner with memory service integration
		 * The runner coordinates memory storage and retrieval
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
			memoryService,
		});

		/**
		 * Run comprehensive memory demonstrations
		 * Shows conversation building, recall, and search capabilities
		 */
		await buildConversationHistory(
			runner,
			sessionService,
			memoryService,
			session.id,
		);

		await demonstrateMemoryRecall(
			runner,
			sessionService,
			memoryService,
			session.id,
		);

		await demonstrateMemorySearch(memoryService);

		console.log("\n✅ Memory usage example completed!");
	} catch (error) {
		console.error("❌ Error in memory usage example:", error);
		process.exit(1);
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
