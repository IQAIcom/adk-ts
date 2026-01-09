#!/usr/bin/env tsx

import { FastMCP } from "fastmcp";
import { z } from "zod";

async function main() {
	const server = new FastMCP({
		name: "greeting-calculator-server",
		version: "1.0.0",
	});

	server.addTool({
		name: "greet_user",
		description: "Greets a user using sampling for personalization",
		parameters: z.object({}),
		execute: async (args, context) => {
			try {
				if (context && typeof context === "object" && "session" in context) {
					const session = (context as any).session;
					if (session && typeof session.requestSampling === "function") {
						const samplingResponse = await session.requestSampling({
							messages: [
								{
									role: "user",
									content: {
										type: "text",
										text: "What is your name? Respond with just your name.",
									},
								},
							],
							systemPrompt: "Provide user context information concisely.",
							includeContext: "thisServer",
							maxTokens: 50,
						});

						let userName = "there";
						if (samplingResponse?.content?.length > 0) {
							const firstContent = samplingResponse.content[0];
							if (firstContent.type === "text") {
								userName = firstContent.text.trim();
							}
						}

						return `Hello ${userName}! I used sampling to get your name for this personalized greeting.`;
					}
				}

				return "Hello there! Sampling isn't available in this context.";
			} catch (error) {
				return "Hello there! Nice to meet you!";
			}
		},
	});

	server.addTool({
		name: "calculate",
		description: "Performs basic mathematical operations",
		parameters: z.object({
			operation: z
				.string()
				.describe("Mathematical operation (e.g., '25 * 8', '100 / 4')"),
		}),
		execute: async (params) => {
			try {
				const expression = params.operation.replace(/[^0-9+\-*/\.\s\(\)]/g, "");
				if (!/^[0-9+\-*/\.\s\(\)]+$/.test(expression)) {
					return "Invalid operation. Use only numbers and basic operators.";
				}
				const result = Function(`"use strict"; return (${expression})`)();
				if (typeof result !== "number" || !Number.isFinite(result)) {
					return "Invalid calculation result.";
				}
				return `${params.operation} = ${result}`;
			} catch (error) {
				return `Error calculating: ${params.operation}`;
			}
		},
	});

	await server.start({ transportType: "stdio" });
}

if (require.main === module) {
	main().catch(console.error);
}

export default main;
