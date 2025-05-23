import {
	Agent,
	GoogleLLM,
	InMemoryRunner,
	LLMRegistry,
	type MessageRole,
	RunConfig,
	StreamingMode,
} from "@adk";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Load environment variables from .env file if it exists
dotenv.config();

// Register the Google LLM
LLMRegistry.registerLLM(GoogleLLM);

// Initialize the agent with Google's Gemini model
const agent = new Agent({
	name: "runner_assistant",
	model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
	description:
		"A simple assistant demonstrating Runner usage with Google Gemini",
	instructions:
		"You are a helpful assistant. Answer questions directly and accurately. When asked about the three laws of robotics, explain that they were created by Isaac Asimov and describe them in detail.",
});

// Create an in-memory runner with our agent
const runner = new InMemoryRunner(agent, { appName: "RunnerDemo" });

// Generate unique ID for user
const userId = uuidv4();

async function runConversation() {
	console.log("🤖 Starting a runner example with Google's Gemini model...");

	// Create a session using the InMemorySessionService from the runner
	console.log("📝 Creating a new session...");
	const session = await runner.sessionService.createSession(userId);
	const sessionId = session.id;

	console.log(`🔑 Session ID: ${sessionId}`);
	console.log(`👤 User ID: ${userId}`);

	// Run the first question
	console.log("\n📝 First question: 'What are the three laws of robotics?'");
	await processMessage("What are the three laws of robotics?", sessionId);

	// Run a follow-up question
	console.log("\n📝 Follow-up question: 'Who formulated these laws?'");
	await processMessage("Who formulated these laws?", sessionId);

	// Run another follow-up question
	console.log(
		"\n📝 Third question: 'Can you suggest three practical applications of these laws in modern AI systems?'",
	);
	await processMessage(
		"Can you suggest three practical applications of these laws in modern AI systems?",
		sessionId,
	);

	console.log("\n✅ Example completed successfully!");
}

async function processMessage(messageContent: string, sessionId: string) {
	console.log(`👤 User: ${messageContent}`);
	console.log("🤖 Assistant: ");

	try {
		// Set up streaming configuration
		const runConfig = new RunConfig({
			streamingMode: StreamingMode.SSE,
		});

		// Create a new message
		const newMessage = {
			role: "user" as MessageRole,
			content: messageContent,
		};

		// Track streaming state
		let isStreaming = false;
		let streamedContent = "";

		// Process the message through the runner
		for await (const event of runner.runAsync({
			userId,
			sessionId,
			newMessage,
			runConfig,
		})) {
			// Skip events without content
			if (!event.content) continue;

			// Only process assistant messages
			if (event.author === "assistant") {
				if (event.is_partial) {
					// Handle streaming chunks
					isStreaming = true;
					process.stdout.write(event.content);
					streamedContent += event.content;
				} else {
					// Handle complete response
					if (!isStreaming) {
						// If we haven't streamed anything yet, print the full response
						console.log(event.content);
					} else if (streamedContent.trim() !== event.content.trim()) {
						// If the final content is different from what we've streamed, print it
						console.log("\nFull response:", event.content);
					} else {
						// We've already streamed the content, just add a newline
						console.log();
					}
				}
			}
		}

		// Ensure there's a newline after streaming
		if (isStreaming && !streamedContent.endsWith("\n")) {
			console.log();
		}
	} catch (error: any) {
		console.error("Error processing message:", error?.message || String(error));
	}
}

// Run the example
runConversation().catch((error) => {
	console.error("❌ Error in runner example:", error);
});
