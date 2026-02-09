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
		description:
			"Generates a personalized greeting for a user by using sampling to ask the LLM for a creative message",
		parameters: z.object({
			userName: z.string().describe("The name of the user to greet"),
		}),
		execute: async ({ userName }) => {
			try {
				// Access the FastMCPSession from server.sessions (not context.session, which is auth data).
				// For stdio transport there is exactly one session.
				const session = server.sessions[0];
				if (session && typeof session.requestSampling === "function") {
					// Use sampling to ask the connected LLM to generate a creative greeting
					const samplingResponse = await session.requestSampling({
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: `Generate a short, creative and friendly greeting for a user named "${userName}". Just the greeting, nothing else.`,
								},
							},
						],
						systemPrompt:
							"You are a creative writer. Generate warm, personalized greetings.",
						maxTokens: 100,
					});

					if (
						samplingResponse?.content &&
						samplingResponse.content.type === "text"
					) {
						return samplingResponse.content.text.trim();
					}

					return `Hello ${userName}! Welcome!`;
				}

				return `Hello ${userName}! (Sampling not available)`;
			} catch (error) {
				console.error("[greet_user] Sampling failed:", error);
				return `Hello ${userName}! Nice to meet you!`;
			}
		},
	});

	server.addTool({
		name: "lookup_fact",
		description: "Looks up a fact about a topic using sampling to ask the LLM",
		parameters: z.object({
			topic: z.string().describe("The topic to look up a fact about"),
		}),
		execute: async ({ topic }) => {
			try {
				const session = server.sessions[0];
				if (session && typeof session.requestSampling === "function") {
					const samplingResponse = await session.requestSampling({
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: `What is an interesting fact about "${topic}"? Reply with just the fact in one sentence.`,
								},
							},
						],
						systemPrompt:
							"You are a knowledgeable encyclopedia. Provide concise, verified facts.",
						maxTokens: 150,
					});

					if (
						samplingResponse?.content &&
						samplingResponse.content.type === "text"
					) {
						return samplingResponse.content.text.trim();
					}

					return `Sorry, I couldn't find a fact about ${topic}.`;
				}

				return `Fact lookup unavailable for: ${topic}`;
			} catch (error) {
				console.error("[lookup_fact] Sampling failed:", error);
				return `Error looking up fact about: ${topic}`;
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
				const expression = params.operation.replace(/[^0-9+\-*/.\s()]/g, "");
				if (!/^[0-9+\-*/.\s()]+$/.test(expression)) {
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
