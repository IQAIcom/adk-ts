#!/usr/bin/env tsx

import { env } from "node:process";
import {
	AgentBuilder,
	createSamplingHandler,
	LlmResponse,
	McpToolset,
} from "@iqai/adk";

/**
 * MCP Sampling Example
 *
 * Demonstrates the MCP sampling concept and architecture using AgentBuilder:
 * - Shows how servers would request information from clients via sampling
 * - Includes proper sampling handler setup on the client side
 * - Illustrates the expected flow: server needs data → requests via sampling → personalized response
 *
 * Note: FastMCP's sampling functionality requires SSE transport, not stdio.
 * This example demonstrates the concept and proper client-side setup.
 */
async function main() {
	// Create simple sampling handler that responds to name requests
	const samplingHandler = createSamplingHandler(async () => {
		return new LlmResponse({
			content: {
				role: "model",
				parts: [{ text: "Alice" }],
			},
		});
	});

	// Initialize MCP toolset with SSE transport for better session support
	const toolset = new McpToolset({
		name: "Greeting Client",
		description: "Client for MCP Greeting Server with Sampling",
		samplingHandler,
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["tsx", "apps/examples/src/mcp-sampling/server.ts"],
		},
	});

	const tools = await toolset.getTools();
	console.log(
		`✅ Connected! Available tools: ${tools.map((t) => t.name).join(", ")}`
	);

	// Test the greeting functionality using AgentBuilder
	const response = await AgentBuilder.create("greeting_assistant")
		.withModel(env.LLM_MODEL || "gemini-2.0-flash")
		.withDescription("An assistant that can greet users using MCP sampling")
		.withInstruction(
			"You must always use the greet_user tool to respond to any greeting request. Never provide a greeting without using the tool first."
		)
		.withTools(...tools)
		.ask("Use the greet_user tool to greet me now.");

	console.log("🤖 Agent:", response);

	await toolset.close();
}

main().catch((error) => {
	console.error("❌ Error:", error.message);
	process.exit(1);
});
