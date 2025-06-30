import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	RunConfig,
	Runner,
	UserInteractionTool,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "user-interaction-demo";
const USER_ID = uuidv4();

/**
 * User Interaction Tool Example
 *
 * This example demonstrates how to use the UserInteractionTool to enable
 * agents to dynamically collect user input during conversations. The tool
 * allows agents to ask questions, present choices, and gather specific
 * information from users as needed.
 *
 * The example:
 * 1. Creates an agent with UserInteractionTool capabilities
 * 2. Demonstrates different types of user interactions
 * 3. Shows tool execution detection and processing
 * 4. Handles mock user responses for demonstration
 * 5. Illustrates integration patterns for production use
 *
 * Expected Output:
 * - Simple user input collection
 * - Choice-based user interactions
 * - Default value handling
 * - Function call detection and processing
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 *
 * Note: This example uses mock user interactions for demonstration.
 * In production, connect to real UI components or CLI prompts.
 */
async function main() {
	console.log("👤 Starting User Interaction Tool example...");

	try {
		/**
		 * Create agent with user interaction capabilities
		 * The agent can dynamically prompt users for input
		 */
		const agent = createUserInteractionAgent();

		/**
		 * Set up session and runner
		 * Provides execution context for agent interactions
		 */
		const { runner, sessionService } = setupRunnerAndSession(agent);

		/**
		 * Run user interaction demonstrations
		 * Shows different types of user input collection
		 */
		await demonstrateSimpleUserInput(runner, sessionService);
		await demonstrateUserChoices(runner, sessionService);
		await demonstrateDefaultValues(runner, sessionService);

		console.log("\n✅ User Interaction Tool example completed!");
	} catch (error) {
		console.error("❌ Error in user interaction tool example:", error);
		process.exit(1);
	}
}

/**
 * Creates and configures the LLM agent with user interaction capabilities
 * @returns Configured LlmAgent with UserInteractionTool
 */
function createUserInteractionAgent(): LlmAgent {
	const userInteractionTool = new UserInteractionTool();

	return new LlmAgent({
		name: "user_interaction_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates user interaction capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can interact with the user to gather information.
Use the user_interaction tool to ask the user questions or get their input on decisions.
Always be respectful and clear in your prompts to the user.`,
		tools: [userInteractionTool],
	});
}

/**
 * Sets up the runner and session service for agent execution
 * @param agent The configured LlmAgent instance
 * @returns Object containing runner and session service
 */
function setupRunnerAndSession(agent: LlmAgent): {
	runner: Runner;
	sessionService: InMemorySessionService;
} {
	const sessionService = new InMemorySessionService();
	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	return { runner, sessionService };
}

/**
 * Demonstrates simple user input collection
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for creating sessions
 */
async function demonstrateSimpleUserInput(
	runner: Runner,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\n--- Example 1: Simple user input ---");
	const result = await runAgentQuery(
		runner,
		sessionService,
		"Ask me for my favorite color",
	);
	console.log("Agent response:", result);
}

/**
 * Demonstrates user choice selection from options
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for creating sessions
 */
async function demonstrateUserChoices(
	runner: Runner,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\n--- Example 2: User choice from options ---");
	const result = await runAgentQuery(
		runner,
		sessionService,
		"Ask me to choose my preferred programming language from Python, JavaScript, and TypeScript",
	);
	console.log("Agent response:", result);
}

/**
 * Demonstrates user input with default values
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for creating sessions
 */
async function demonstrateDefaultValues(
	runner: Runner,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\n--- Example 3: User input with default value ---");
	const result = await runAgentQuery(
		runner,
		sessionService,
		"Ask me for my age with a default value of 30",
	);
	console.log("Agent response:", result);
}

/**
 * Runs an agent query and handles user interaction tool calls
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for creating sessions
 * @param query The query to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentQuery(
	runner: Runner,
	sessionService: InMemorySessionService,
	query: string,
): Promise<string> {
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	console.log(`\n🔍 Processing: ${query}`);

	let response = "";
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId: session.id,
		newMessage: {
			parts: [{ text: query }],
		},
	})) {
		// Handle user interaction tool calls
		if (event.content?.parts) {
			for (const part of event.content.parts) {
				if (part.functionCall?.name === "user_interaction") {
					console.log("\n🤖 Agent is requesting user interaction...");

					// Extract the prompt parameters
					const args = part.functionCall.args as any;
					const userResponse = await mockPromptUser({
						prompt: (args.prompt as string) || "Please provide input:",
						defaultValue: args.defaultValue as string,
						options: args.options
							? { choices: args.options as string[] }
							: undefined,
					});

					console.log("✅ User interaction completed");
					// Note: In a real implementation, you would need to send this response back to the agent
					// This is a simplified example showing the interaction pattern
				}
			}
		}

		// Collect agent responses
		if (event.author === "user_interaction_demo" && event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");
			if (content && !event.partial) {
				response = content;
			}
		}
	}

	return response;
}

/**
 * Mock implementation of user prompting for demonstration purposes
 * In a real application, this would be a UI component or CLI prompt
 * @param options The prompt options including message, default value, and choices
 * @returns Mock user response
 */
const mockPromptUser = async (options: {
	prompt: string;
	defaultValue?: string;
	options?: { choices: string[] };
}): Promise<string> => {
	console.log("\n=== User Prompt ===");
	console.log(options.prompt);

	if (options.options?.choices) {
		console.log("Choices:");
		options.options.choices.forEach((choice, index) => {
			console.log(`${index + 1}. ${choice}`);
		});
		// Mock returning the first choice
		console.log(`\nMocking user selection: ${options.options.choices[0]}`);
		return options.options.choices[0];
	}

	if (options.defaultValue) {
		console.log(`Default value: ${options.defaultValue}`);
		console.log(`\nMocking user input: ${options.defaultValue}`);
		return options.defaultValue;
	}

	// Mock a default response
	const mockResponse = "User's response";
	console.log(`\nMocking user input: ${mockResponse}`);
	return mockResponse;
};

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
