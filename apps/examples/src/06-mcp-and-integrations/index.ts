import { AgentBuilder, createSamplingHandler, LlmRequest } from "@iqai/adk";
import { ask } from "../utils";
import { getCoingeckoTools, getGreetingTools } from "./tools";

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
 * Special Feature - Custom Sampling Handler:
 * We demonstrate "sampling" using a custom routing handler. This allows the MCP server itself to call back
 * into an LLM to generate content. The custom handler inspects the incoming LlmRequest and routes to one of
 * two specialized agents based on keywords in the system prompt:
 * - greet_user (creative writer prompt) -> routed to creativeRunner
 * - lookup_fact (encyclopedia prompt)   -> routed to factRunner
 * This bidirectional flow is powerful for complex integrations.
 */
async function main() {
	const modelName = process.env.LLM_MODEL || "gemini-2.5-flash";

	// Two specialized agents for the sampling handler to route between
	const { runner: creativeRunner } = await AgentBuilder.withModel(modelName)
		.withInstruction(
			"You are a warm, creative writer. Generate personalized, heartfelt messages.",
		)
		.build();

	const { runner: factRunner } = await AgentBuilder.withModel(modelName)
		.withInstruction(
			"You are a knowledgeable encyclopedia. Answer questions concisely with verified information only.",
		)
		.build();

	// Custom sampling handler: inspect the request and route to the right specialized agent
	const samplingHandler = createSamplingHandler(async (request) => {
		const lastContent = request.contents[request.contents.length - 1];
		const messageText = LlmRequest.extractTextFromContent(lastContent);

		// systemPrompt is prepended as contents[0] by McpSamplingHandler
		const systemText =
			request.contents.length > 1
				? LlmRequest.extractTextFromContent(request.contents[0])
				: "";

		console.log(
			`\n[Sampling] model=${request.model} messages=${request.contents.length}`,
		);
		console.log(`[Sampling] message: "${messageText}"`);
		if (systemText) console.log(`[Sampling] system: "${systemText}"`);

		// Route based on keywords in the system prompt
		const lowerSystem = systemText.toLowerCase();
		if (lowerSystem.includes("creative") || lowerSystem.includes("greeting")) {
			console.log("[Router] -> creative agent");
			return creativeRunner.ask(messageText);
		}
		if (lowerSystem.includes("encyclopedia") || lowerSystem.includes("fact")) {
			console.log("[Router] -> fact agent");
			return factRunner.ask(messageText);
		}

		// Default: forward to creative agent
		console.log("[Router] -> creative agent (default)");
		return creativeRunner.ask(messageText);
	});

	const { tools: greetingTools } = await getGreetingTools(samplingHandler);

	// Coingecko is an external hosted MCP server — wrap in try/catch so a stale
	// server-side session doesn't block the rest of the example from running.
	let coingeckoTools: Awaited<ReturnType<typeof getCoingeckoTools>>["tools"] =
		[];
	try {
		const coingecko = await getCoingeckoTools();
		coingeckoTools = coingecko.tools;
	} catch {
		console.warn(
			"\n[Coingecko] Could not connect to Coingecko MCP server (stale remote session or network issue). Skipping crypto price demo.\n",
		);
	}

	const { runner: rootRunner } = await AgentBuilder.withModel(modelName)
		.withInstruction("Always use your available tools to fulfill requests.")
		.withTools(...greetingTools, ...coingeckoTools)
		.build();

	// Test the greeting tool — sampling routes to the creative agent
	await ask(rootRunner, "Greet a user named Alice");

	// Test the fact lookup tool — sampling routes to the fact agent
	await ask(rootRunner, "Look up a fact about honey bees");

	// Test the Coingecko MCP server integration (skipped if connection failed above)
	if (coingeckoTools.length > 0) {
		await ask(rootRunner, "What is the price of bitcoin?");
	}
}

main().catch(console.error);
