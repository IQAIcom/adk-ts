import * as path from "node:path";
import {
	Agent,
	GoogleLLM,
	InMemorySessionService,
	LLMRegistry,
	PersistentMemoryService,
	type Session,
	SessionState,
} from "@adk";
import * as dotenv from "dotenv";

// Register Google LLM
LLMRegistry.registerLLM(GoogleLLM);

// Load environment variables from .env file if it exists
dotenv.config();

/**
 * Maximum number of messages to keep in conversation history
 */
const MAX_MESSAGES = 6;

/**
 * Persistent Memory Example
 *
 * Demonstrates file-based persistent memory across application restarts
 */
async function persistentMemoryExample() {
	console.log("Persistent Memory Example");
	console.log("=========================\n");
	console.log(
		"This example demonstrates persistent memory that survives application restarts",
	);
	console.log("- Each run continues the conversation from previous runs");
	console.log("- Messages are saved to disk in the .memory directory\n");

	// Check for API key
	if (!process.env.GOOGLE_API_KEY) {
		console.log(
			"⚠️  Please set the GOOGLE_API_KEY environment variable to run this example",
		);
		console.log(
			"   Example: GOOGLE_API_KEY=your-key-here npx ts-node examples/memory-usage/persistent-memory.ts",
		);
		return;
	}

	// Create a persistent memory service
	const memoryService = new PersistentMemoryService({
		storageDir: path.join(__dirname, ".memory"),
		createDir: true,
		filePrefix: "memory",
	});

	// Use a consistent session ID across runs
	const SESSION_ID = "persistent-demo-session";

	// Load or create session
	console.log("Loading saved conversation...");
	let session = memoryService.getSession(SESSION_ID);

	if (!session) {
		// Create a new session
		session = {
			id: SESSION_ID,
			userId: "user-123",
			messages: [],
			metadata: { created: new Date().toISOString() },
			createdAt: new Date(),
			updatedAt: new Date(),
			state: new SessionState(),
		};
		console.log("No previous conversation found. Starting new conversation.");
	} else {
		console.log(
			`Found existing conversation with ${session.messages.length} messages.`,
		);

		// Trim conversation if it's too long
		if (session.messages.length > MAX_MESSAGES * 2) {
			// Keep only the system message and most recent exchanges
			const systemMessage = session.messages.find(
				(msg) => msg.role === "system",
			);
			const recentMessages = session.messages
				.filter((msg) => msg.role !== "system")
				.slice(-MAX_MESSAGES);

			session.messages = systemMessage
				? [systemMessage, ...recentMessages]
				: recentMessages;
			console.log(
				`Trimmed conversation to ${session.messages.length} messages.`,
			);
		}
	}

	// Create the agent with memory capability
	const agent = new Agent({
		name: "memory_assistant",
		description: "An assistant with persistent memory using Google Gemini",
		model: "gemini-2.0-flash",
		instructions:
			"You are a helpful assistant with persistence. When the user refers to previous conversations, you can recall what was discussed.",
		memoryService,
		sessionService: new InMemorySessionService(),
		userId: "user-123",
	});

	// Add a system message if this is a new conversation
	if (session.messages.length === 0) {
		session.messages.push({
			role: "system",
			content:
				"You are a helpful assistant with persistent memory across conversations.",
		});

		// First message to start the conversation
		await sendMessage(
			session,
			agent,
			"Hello! This is my first time using this demo.",
			memoryService,
		);
	} else {
		// Display the last few messages
		console.log("\nLast few messages from previous conversation:");
		const lastMessages = session.messages
			.filter((msg) => msg.role !== "system")
			.slice(-3);

		for (const msg of lastMessages) {
			console.log(`${msg.role.toUpperCase()}: ${msg.content}`);
		}

		// Continue the conversation
		await sendMessage(
			session,
			agent,
			"Hello again! Can you remember what we talked about before?",
			memoryService,
		);
	}

	// Example questions to demo memory capabilities
	await sendMessage(session, agent, "What's your purpose?", memoryService);
	await sendMessage(
		session,
		agent,
		"Can you remember what I said when I first greeted you?",
		memoryService,
	);
	await sendMessage(
		session,
		agent,
		"Tell me something about memory systems in AI.",
		memoryService,
	);

	console.log("\n=========================");
	console.log(
		"Conversation saved to disk. Run this example again to continue the conversation.",
	);
	console.log(`Storage location: ${path.join(__dirname, ".memory")}`);
}

/**
 * Helper function to send a message and get a response
 */
async function sendMessage(
	session: Session,
	agent: Agent,
	message: string,
	memoryService: PersistentMemoryService,
): Promise<void> {
	console.log(`\nUSER: ${message}`);

	try {
		// Add user message to session
		session.messages.push({ role: "user", content: message });

		// Trim conversation to prevent context overflow
		if (session.messages.length > MAX_MESSAGES + 1) {
			// +1 for system message
			const systemMessage = session.messages.find(
				(msg) => msg.role === "system",
			);
			const recentMessages = session.messages
				.filter((msg) => msg.role !== "system")
				.slice(-MAX_MESSAGES);

			session.messages = [];
			if (systemMessage) session.messages.push(systemMessage);
			session.messages.push(...recentMessages);
		}

		// Get response from agent
		const response = await agent.run({
			messages: session.messages,
			sessionId: session.id,
		});

		// Add response to session
		session.messages.push({
			role: "assistant",
			content: response.content || "",
		});

		// Save session to disk
		await memoryService.addSessionToMemory(session);

		console.log(`ASSISTANT: ${response.content}`);
	} catch (error: any) {
		console.error("Error:", error.message || String(error));
		console.log("ASSISTANT: Sorry, I had trouble processing that request.");
	}
}

// Run the example
persistentMemoryExample().catch((error) => {
	console.error("Error:", error);
});
