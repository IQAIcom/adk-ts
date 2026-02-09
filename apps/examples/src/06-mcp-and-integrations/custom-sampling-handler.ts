import {
	AgentBuilder,
	createSamplingHandler,
	LlmRequest,
	McpToolset,
} from "@iqai/adk";
import { ask } from "../utils";

/**
 * 06. Custom Sampling Handler
 *
 * The index.ts example uses the simple `createSamplingHandler(runner.ask)` pattern.
 * This example goes further: we write a custom handler that inspects the LlmRequest,
 * extracts the system prompt, and routes to different agents based on its content.
 *
 * The greeting-server has two tools that use sampling with different system prompts:
 * - greet_user (creative writer prompt) -> routed to creativeRunner
 * - lookup_fact (encyclopedia prompt) -> routed to factRunner
 *
 */
async function main() {
	const modelName = process.env.LLM_MODEL || "gemini-2.5-flash";

	// Two specialized agents for routing
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

	// Custom handler: inspect the request, extract system prompt, route to the right agent
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

		// Default: enrich with context and forward
		const enriched = `The current time is ${new Date().toISOString()}.\n\nRequest: ${messageText}`;
		console.log("[Router] -> creative agent (default)");
		return creativeRunner.ask(enriched);
	});

	const greetingToolset = new McpToolset({
		name: "Greeting Server",
		description: "Custom MCP server with sampling capabilities",
		samplingHandler,
		transport: {
			mode: "stdio",
			command: "npx",
			args: [
				"tsx",
				"apps/examples/src/06-mcp-and-integrations/greeting-server.ts",
			],
		},
	});

	const tools = await greetingToolset.getTools();

	const { runner: rootRunner } = await AgentBuilder.withModel(modelName)
		.withInstruction("Always use your available tools to fulfill requests.")
		.withTools(...tools)
		.build();

	await ask(rootRunner, "Greet a user named Alice");
	await ask(rootRunner, "Look up a fact about honey bees");

	await greetingToolset.close();
}

main().catch(console.error);
