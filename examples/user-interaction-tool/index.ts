import {
	Agent,
	GoogleLLM,
	LLMRegistry,
	RunConfig,
	UserInteractionTool,
} from "@adk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Register LLM provider
LLMRegistry.registerLLM(GoogleLLM);

// Mock implementation of the promptUser function for demonstration purposes
// In a real application, this would be a UI component or CLI prompt
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

// Create a custom RunConfig with actions
const customConfig = new RunConfig();
// Add actions to the config as a custom property
(customConfig as any).metadata = {
	actions: {
		promptUser: mockPromptUser,
		skipSummarization: (skip: boolean) => {
			console.log(`Skipping summarization: ${skip}`);
		},
	},
};

async function main() {
	// Create user interaction tool
	const userInteractionTool = new UserInteractionTool();

	// Create an agent with this tool
	const agent = new Agent({
		name: "user_interaction_demo",
		model: process.env.LLM_MODEL || "gemini-2.0-flash",
		description:
			"An agent that demonstrates user interaction capabilities using Google Gemini",
		instructions: `You are a helpful assistant that can interact with the user to gather information.
    Use the user_interaction tool to ask the user questions or get their input on decisions.
    Always be respectful and clear in your prompts to the user.`,
		tools: [userInteractionTool],
	});

	// Example 1: Simple user input
	console.log("\n--- Example 1: Simple user input ---");
	const simpleResult = await agent.run({
		messages: [{ role: "user", content: "Ask me for my favorite color" }],
		config: customConfig,
	});
	console.log("Agent response:", simpleResult.content);

	// Example 2: User choice from options
	console.log("\n--- Example 2: User choice from options ---");
	const choiceResult = await agent.run({
		messages: [
			{
				role: "user",
				content:
					"Ask me to choose my preferred programming language from Python, JavaScript, and TypeScript",
			},
		],
		config: customConfig,
	});
	console.log("Agent response:", choiceResult.content);

	// Example 3: User input with default value
	console.log("\n--- Example 3: User input with default value ---");
	const defaultResult = await agent.run({
		messages: [
			{ role: "user", content: "Ask me for my age with a default value of 30" },
		],
		config: customConfig,
	});
	console.log("Agent response:", defaultResult.content);
}

// Run the example
main().catch((error) => console.error("Error:", error));
