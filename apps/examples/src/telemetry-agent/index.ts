import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	Runner,
	TelemetryService,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "telemetry-agent-example";
const USER_ID = uuidv4();

/**
 * Telemetry Agent Example
 *
 * This example demonstrates how to integrate telemetry and observability
 * into agent interactions using the ADK TelemetryService. It shows how
 * to track, trace, and monitor agent conversations for debugging and
 * performance analysis.
 *
 * The example:
 * 1. Initializes telemetry with Langfuse integration
 * 2. Creates an agent with telemetry tracking enabled
 * 3. Demonstrates traced conversation interactions
 * 4. Shows proper telemetry shutdown and cleanup
 * 5. Handles graceful process termination
 *
 * Expected Output:
 * - Telemetry initialization confirmation
 * - Traced conversation with observability data
 * - Performance and interaction metrics
 * - Links to observability dashboard
 *
 * Prerequisites:
 * - Node.js environment
 * - LANGFUSE_PUBLIC_KEY environment variable
 * - LANGFUSE_SECRET_KEY environment variable
 * - LANGFUSE_HOST environment variable (optional)
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
	let telemetryService: TelemetryService | null = null;

	try {
		console.log("📊 Starting Telemetry Agent example...");

		/**
		 * Initialize telemetry service with Langfuse configuration
		 * This enables tracing and observability for all agent interactions
		 */
		telemetryService = initializeTelemetryService();

		/**
		 * Create agent with telemetry tracking
		 * All interactions with this agent will be automatically traced
		 */
		const agent = createTelemetryAgent();

		/**
		 * Set up session and runner
		 * The runner coordinates telemetry with agent execution
		 */
		const { runner, session } = await setupSessionAndRunner(agent);

		/**
		 * Execute traced conversation
		 * This interaction will be captured in telemetry data
		 */
		await runTracedConversation(runner, session.id);

		console.log(
			"\n✅ Example completed! Check your Langfuse dashboard for traces.",
		);
		console.log(
			`🔗 Dashboard URL: ${env.LANGFUSE_HOST || "https://cloud.langfuse.com"}`,
		);
	} catch (error) {
		console.error("❌ Error in telemetry agent example:", error);
		process.exit(1);
	} finally {
		await shutdownTelemetry(telemetryService);
	}
}

/**
 * Initializes the telemetry service with Langfuse configuration
 * @returns Configured TelemetryService instance
 */
function initializeTelemetryService(): TelemetryService {
	const telemetryService = new TelemetryService();

	const authString = Buffer.from(
		`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
	).toString("base64");

	telemetryService.initialize({
		appName: APP_NAME,
		appVersion: "1.0.0",
		otlpEndpoint: `${env.LANGFUSE_HOST}/api/public/v1/traces`,
		otlpHeaders: {
			Authorization: `Basic ${authString}`,
		},
	});

	console.log("🔍 All interactions will be traced and sent to Langfuse");
	console.log(`🔧 Telemetry initialized: ${telemetryService.initialized}`);
	console.log(`🏷️  App: ${telemetryService.getConfig()?.appName}`);

	return telemetryService;
}

/**
 * Creates and configures the LLM agent with telemetry tracking
 * @returns Configured LlmAgent instance
 */
function createTelemetryAgent(): LlmAgent {
	return new LlmAgent({
		name: "telemetry_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "An assistant with telemetry tracking enabled",
		instruction:
			"You are a helpful assistant. Answer questions concisely and accurately.",
	});
}

/**
 * Sets up session management and runner for telemetry tracking
 * @param agent The configured LlmAgent instance
 * @returns Object containing runner and session
 */
async function setupSessionAndRunner(agent: LlmAgent): Promise<{
	runner: Runner;
	session: any;
}> {
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	console.log(`📝 Created session: ${session.id}`);

	return { runner, session };
}

/**
 * Executes a traced conversation to demonstrate telemetry capabilities
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function runTracedConversation(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	console.log("\n👤 User: Explain what observability means in AI systems");
	console.log("🤖 Assistant: ");

	let assistantResponse = "";

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: {
			parts: [{ text: "Explain what observability means in AI systems" }],
		},
	})) {
		if (event.author === "telemetry_assistant" && event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");

			if (content) {
				if (event.partial) {
					// Handle streaming chunks
					process.stdout.write(content);
					assistantResponse += content;
				} else {
					// Handle complete response
					if (!assistantResponse) {
						console.log(content);
						assistantResponse = content;
					} else if (assistantResponse !== content) {
						console.log("\nFinal response:", content);
						assistantResponse = content;
					}
				}
			}
		}
	}

	// Ensure newline after response
	if (assistantResponse && !assistantResponse.endsWith("\n")) {
		console.log();
	}
}

/**
 * Gracefully shuts down telemetry service
 * @param telemetryService The telemetry service to shutdown
 */
async function shutdownTelemetry(
	telemetryService: TelemetryService | null,
): Promise<void> {
	if (telemetryService) {
		try {
			console.log("\n🔄 Shutting down telemetry...");
			await telemetryService.shutdown();
			console.log("✅ Telemetry shutdown complete");
		} catch (shutdownError) {
			console.error("⚠️  Error during telemetry shutdown:", shutdownError);
		}
	}
}

/**
 * Handle process termination gracefully for SIGINT
 */
process.on("SIGINT", async () => {
	console.log("\n🛑 Received SIGINT, shutting down gracefully...");
	try {
		const telemetryService = new TelemetryService();
		await telemetryService.shutdown();
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
});

/**
 * Handle process termination gracefully for SIGTERM
 */
process.on("SIGTERM", async () => {
	console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
	try {
		const telemetryService = new TelemetryService();
		await telemetryService.shutdown();
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
});

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
