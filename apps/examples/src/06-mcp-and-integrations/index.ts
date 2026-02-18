import { createSamplingHandler } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";
import { getNameAgent } from "./agents/name-agent/agent";

/**
 * 06. MCP and Integrations
 *
 * This example shows how to extend your agent's capabilities using the Model Context Protocol (MCP).
 * ADK-TS treats MCP servers as first-class citizens, converting them effortlessly into tools your agent can use.
 *
 * In tools.ts, we use McpToolset to connect to two types of servers:
 * 1. A local custom server ("greeting-server.ts"): We spin up a local server.
 * 2. An external server (Coingecko): We connect to a public MCP server using `mcp-remote`.
 *
 * Special Feature - Sampling:
 * We also demonstrate "sampling" (createSamplingHandler). This allows the MCP server itself to call back into an LLM to generate content.
 * Here, the 'greeting-server' asks an LLM (our nameAgent) to help generate a greeting. This bidirectional flow is powerful for complex integrations.
 *
 */
async function main() {
	const { runner: nameRunner } = await getNameAgent();
	const samplingHandler = createSamplingHandler(nameRunner.ask);
	const { runner: rootRunner } = await getRootAgent(samplingHandler);

	// Test question related to sampling
	await ask(rootRunner, "Greet the user");

	// Test question related to coingecko MCP server
	await ask(rootRunner, "What is the price of bitcoin?");
}

main().catch(console.error);
