/**
 * Example demonstrating how to use Zod schemas with LlmAgent
 * for input and output validation, along with callbacks
 */

import {
	type AfterModelCallback,
	type AfterToolCallback,
	type BeforeModelCallback,
	type BeforeToolCallback,
	type CallbackContext,
	LlmAgent,
} from "@iqai/adk/src/agents";
import type { LlmRequest } from "@iqai/adk/src/models/llm-request";
import type { LlmResponse } from "@iqai/adk/src/models/llm-response";
import type { BaseTool } from "@iqai/adk/src/tools/base/base-tool";
import type { ToolContext } from "@iqai/adk/src/tools/tool-context";
import { z } from "zod";

// Define input schema for the agent when used as a tool
export const inputSchema = z.object({
	query: z.string().min(1, "Query cannot be empty"),
	maxResults: z.number().int().positive().default(10),
	includeDetails: z.boolean().default(false),
});

// Define output schema for the agent's responses
export const outputSchema = z.object({
	results: z.array(
		z.object({
			title: z.string(),
			summary: z.string(),
			confidence: z.number().min(0).max(1),
		}),
	),
	totalCount: z.number().int().nonnegative(),
	processingTimeMs: z.number().positive(),
});

// Example callback functions
export const beforeModelCallback: BeforeModelCallback = async (
	callbackContext: CallbackContext,
	llmRequest: LlmRequest,
) => {
	console.log("🔄 Before model callback triggered");
	console.log("📝 Request contents:", llmRequest.contents);

	// Example: Add additional context to the request
	if (llmRequest.contents.length > 0) {
		const lastContent = llmRequest.contents[llmRequest.contents.length - 1];
		if (lastContent.parts) {
			lastContent.parts.push({
				text: "\n\nNote: Please ensure your response follows the required JSON schema format.",
			});
		}
	}

	// Return null to continue with normal model call
	return null;
};

export const afterModelCallback: AfterModelCallback = async (
	callbackContext: CallbackContext,
	llmResponse: LlmResponse,
) => {
	console.log("✅ After model callback triggered");
	console.log("📄 Response:", llmResponse.content);

	// Example: Log response metadata
	if (llmResponse.usageMetadata) {
		console.log("📊 Usage metadata:", {
			inputTokens: llmResponse.usageMetadata.promptTokenCount,
			outputTokens: llmResponse.usageMetadata.candidatesTokenCount,
			totalTokens: llmResponse.usageMetadata.totalTokenCount,
		});
	}

	// Return null to use the original response
	return null;
};

export const beforeToolCallback: BeforeToolCallback = async (
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
) => {
	console.log(`🔧 About to call tool: ${tool.name}`);
	console.log("📋 Tool arguments:", args);

	// Example: Log the function call ID
	if (toolContext.functionCallId) {
		console.log("🔗 Function call ID:", toolContext.functionCallId);
	}

	// Return null to continue with normal tool execution
	return null;
};

export const afterToolCallback: AfterToolCallback = async (
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
	toolResponse: Record<string, any>,
) => {
	console.log(`✅ Tool ${tool.name} completed`);
	console.log("📄 Tool response:", toolResponse);

	// Example: Add execution timestamp to the response
	return {
		...toolResponse,
		executedAt: new Date().toISOString(),
	};
};

// Create agent with Zod schemas and callbacks
export const searchAgent = new LlmAgent({
	name: "SearchAgent",
	description:
		"An agent that searches and returns structured results with validation",
	model: "gpt-4",
	instruction: `You are a search agent that returns results in a specific JSON format.

You must respond with a JSON object that exactly matches this schema:
{
  "results": [
    {
      "title": "string",
      "summary": "string",
      "confidence": 0.95 // number between 0 and 1
    }
  ],
  "totalCount": 5, // total number of results
  "processingTimeMs": 150 // processing time in milliseconds
}

Always ensure your response is valid JSON and follows this exact structure.`,

	// Use Zod schemas for validation
	inputSchema,
	outputSchema,

	// Store results in session state
	outputKey: "searchResults",

	// Add callbacks
	beforeModelCallback,
	afterModelCallback,
	beforeToolCallback,
	afterToolCallback,

	// Disable transfers since we have output schema (will be set automatically)
	disallowTransferToParent: true,
	disallowTransferToPeers: true,
});

// Example agent without output schema that can use tools
export const flexibleAgent = new LlmAgent({
	name: "FlexibleAgent",
	description: "An agent that can use tools and has callback support",
	model: "gpt-4",
	instruction:
		"You are a helpful assistant that can use various tools to help users.",

	// Only input schema, no output schema so tools are allowed
	inputSchema,

	// Callbacks for monitoring
	beforeModelCallback: async (ctx, req) => {
		console.log("🤖 Flexible agent model call starting...");
		return null;
	},

	afterModelCallback: async (ctx, res) => {
		console.log("🤖 Flexible agent model call completed");
		return null;
	},

	// Tools can be added here since no output schema
	tools: [
		// Example function tool
		async function getCurrentTime() {
			return {
				currentTime: new Date().toISOString(),
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			};
		},
	],
});

// Example usage functions
export async function demonstrateSchemaValidation() {
	console.log("🧪 Demonstrating schema validation...\n");

	// Test input validation
	try {
		const validInput = inputSchema.parse({
			query: "search for TypeScript tutorials",
			maxResults: 5,
			includeDetails: true,
		});
		console.log("✅ Valid input:", validInput);
	} catch (error) {
		console.error("❌ Input validation failed:", error);
	}

	// Test invalid input
	try {
		inputSchema.parse({
			query: "", // Invalid: empty string
			maxResults: -1, // Invalid: negative number
		});
	} catch (error) {
		console.log(
			"❌ Expected validation error for invalid input:",
			error.message,
		);
	}

	// Test output validation
	try {
		const validOutput = outputSchema.parse({
			results: [
				{
					title: "TypeScript Handbook",
					summary: "Official TypeScript documentation",
					confidence: 0.95,
				},
			],
			totalCount: 1,
			processingTimeMs: 120,
		});
		console.log("✅ Valid output:", validOutput);
	} catch (error) {
		console.error("❌ Output validation failed:", error);
	}
}

export async function demonstrateAgentConfiguration() {
	console.log("🔧 Demonstrating agent configuration...\n");

	console.log("📋 Search Agent Configuration:");
	console.log("- Name:", searchAgent.name);
	console.log("- Has input schema:", !!searchAgent.inputSchema);
	console.log("- Has output schema:", !!searchAgent.outputSchema);
	console.log("- Output key:", searchAgent.outputKey);
	console.log(
		"- Disallow transfer to parent:",
		searchAgent.disallowTransferToParent,
	);
	console.log(
		"- Disallow transfer to peers:",
		searchAgent.disallowTransferToPeers,
	);
	console.log("- Number of tools:", searchAgent.tools.length);
	console.log(
		"- Has before model callback:",
		!!searchAgent.beforeModelCallback,
	);
	console.log("- Has after model callback:", !!searchAgent.afterModelCallback);

	console.log("\n📋 Flexible Agent Configuration:");
	console.log("- Name:", flexibleAgent.name);
	console.log("- Has input schema:", !!flexibleAgent.inputSchema);
	console.log("- Has output schema:", !!flexibleAgent.outputSchema);
	console.log("- Number of tools:", flexibleAgent.tools.length);
	console.log("- Can use tools:", !flexibleAgent.outputSchema);
}

export function demonstrateCallbackChaining() {
	console.log("🔗 Demonstrating callback chaining...\n");

	// Example of multiple callbacks
	const multiCallbackAgent = new LlmAgent({
		name: "MultiCallbackAgent",
		description: "Agent with multiple callbacks",
		model: "gpt-4",
		instruction: "You are a helpful assistant.",

		beforeModelCallback: [
			async (ctx, req) => {
				console.log("🔄 First before callback");
				return null;
			},
			async (ctx, req) => {
				console.log("🔄 Second before callback");
				return null;
			},
			async (ctx, req) => {
				console.log("🔄 Third before callback");
				return null;
			},
		],

		afterModelCallback: [
			async (ctx, res) => {
				console.log("✅ First after callback");
				return null;
			},
			async (ctx, res) => {
				console.log("✅ Second after callback");
				return null;
			},
		],
	});

	console.log("Created agent with multiple callbacks:");
	console.log(
		"- Before model callbacks:",
		multiCallbackAgent.canonicalBeforeModelCallbacks.length,
	);
	console.log(
		"- After model callbacks:",
		multiCallbackAgent.canonicalAfterModelCallbacks.length,
	);
}

// Main demonstration function
export async function runZodSchemaExample() {
	console.log("🚀 Running Zod Schema Integration Example\n");
	console.log("=".repeat(50));

	await demonstrateSchemaValidation();
	console.log(`\n${"=".repeat(50)}`);

	await demonstrateAgentConfiguration();
	console.log(`\n${"=".repeat(50)}`);

	demonstrateCallbackChaining();
	console.log(`\n${"=".repeat(50)}`);

	console.log(
		"✨ Example completed! Check the console output above for details.",
	);
}
