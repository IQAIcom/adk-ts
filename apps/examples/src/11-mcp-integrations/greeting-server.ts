#!/usr/bin/env tsx

import { FastMCP } from "fastmcp";
import { z } from "zod";

/**
 * Custom MCP Server using FastMCP for Greeting and Calculator Examples
 *
 * This server demonstrates:
 * - FastMCP for simplified server creation
 * - Tool registration with proper zod schemas
 * - Multiple tool types (greeting, calculator with parameters, server info)
 * - Proper tool execution with error handling
 * - Professional MCP server implementation patterns
 */

async function main() {
	const server = new FastMCP({
		name: "greeting-calculator-server",
		version: "1.0.0",
	});

	/**
	 * Greeting tool that demonstrates MCP sampling functionality.
	 * Uses session.requestSampling() to get user context for personalized responses.
	 * Falls back gracefully if sampling fails or is unavailable.
	 */
	server.addTool({
		name: "greet_user",
		description:
			"Greets a user by asking for their name through sampling for personalization",
		parameters: z.object({}),
		execute: async (args, context) => {
			try {
				// Check if sampling is available in the context
				if (context && typeof context === "object" && "session" in context) {
					const session = (context as any).session;
					if (session && typeof session.requestSampling === "function") {
						// Make a sampling request to get the user's name
						const samplingResponse = await session.requestSampling({
							messages: [
								{
									role: "user",
									content: {
										type: "text",
										text: "What is your name? Please respond with just your name.",
									},
								},
							],
							systemPrompt:
								"You are a helpful assistant that provides user context information. Respond concisely with just the requested information.",
							includeContext: "thisServer",
							maxTokens: 50,
						});

						// Extract the user's name from the sampling response
						let userName = "there";
						if (samplingResponse?.content?.length > 0) {
							const firstContent = samplingResponse.content[0];
							if (firstContent.type === "text") {
								userName = firstContent.text.trim();
							}
						}

						return `Hello ${userName}! It's wonderful to meet you! I used sampling to get your name for this personalized greeting. The MCP sampling feature allows servers to request additional context from clients, enabling dynamic and context-aware responses like this one.`;
					}
				}

				// Fallback if sampling is not available
				return "Hello there! I'm a greeting tool that demonstrates the MCP sampling concept. While sampling isn't available in this context, in a full implementation I would use sampling to get your name for personalization. Nice to meet you!";
			} catch (error) {
				// Fallback message if sampling fails
				return "Hello there! I had trouble getting your name through sampling, but it's nice to meet you anyway! This demonstrates the MCP sampling concept - servers can request additional context from clients for personalized responses.";
			}
		},
	});

	/**
	 * Calculator tool that performs basic mathematical operations.
	 * Demonstrates parameter validation and safe expression evaluation.
	 */
	server.addTool({
		name: "calculate",
		description:
			"Performs basic mathematical operations (add, subtract, multiply, divide)",
		parameters: z.object({
			operation: z
				.string()
				.describe(
					"The mathematical operation to perform (e.g., '25 * 8', '100 / 4')",
				),
		}),
		execute: async (params) => {
			try {
				// Simple calculator that can evaluate basic expressions
				const expression = params.operation.replace(/[^0-9+\-*/\.\s\(\)]/g, "");

				// Basic safety check
				if (!/^[0-9+\-*/\.\s\(\)]+$/.test(expression)) {
					return "Invalid operation. Please use only numbers and basic operators (+, -, *, /, parentheses).";
				}

				// Evaluate the expression (be careful in production!)
				const result = Function(`"use strict"; return (${expression})`)();

				if (typeof result !== "number" || !Number.isFinite(result)) {
					return "Invalid calculation result. Please check your expression.";
				}

				return `${params.operation} = ${result}`;
			} catch (error) {
				return `Error calculating: ${params.operation}. Please check the format.`;
			}
		},
	});

	/**
	 * Server info tool that provides metadata about this MCP server.
	 * Returns structured information about capabilities and configuration.
	 */
	server.addTool({
		name: "server_info",
		description:
			"Provides information about this MCP server and its capabilities",
		parameters: z.object({}),
		execute: async () => {
			return JSON.stringify(
				{
					serverName: "greeting-calculator-server",
					version: "1.0.0",
					capabilities: [
						"Personalized greetings using sampling",
						"Basic mathematical calculations",
						"Server information display",
					],
					toolCount: 3,
					samplingEnabled: true,
					description:
						"A demonstration MCP server using FastMCP showing sampling concepts and basic tools",
				},
				null,
				2,
			);
		},
	});

	// Start the server
	try {
		await server.start({
			transportType: "stdio",
		});
	} catch (error) {
		console.error("❌ Failed to start greeting-calculator MCP Server:", error);
		process.exit(1);
	}
}

// Start the server if this file is run directly
if (require.main === module) {
	main().catch((error) => {
		console.error("❌ An unexpected error occurred:", error);
		process.exit(1);
	});
}

export default main;
