import { env } from "node:process";
import {
	AgentBuilder,
	BaseTool,
	type CallbackContext,
	createTool,
	LlmAgent,
	type LlmRequest,
	LlmResponse,
	type ToolContext,
} from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

/**
 * 14 - Callbacks (Guardrails)
 *
 * Demonstrates two safety callbacks on a single agent:
 * - beforeModelCallback: inspects the user's message and blocks if it contains the keyword "BLOCK".
 * - beforeToolCallback: intercepts tool execution and blocks weather lookups for the city "Paris".
 */

// Simple weather tool the agent can call
const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get the weather for a given city",
	schema: z.object({
		city: z.string().describe("The city to get weather for"),
	}),
	fn: async ({ city }: { city: string }, context: ToolContext) => {
		// Read user temperature preference from session state (default to Fahrenheit)
		const unit =
			(context.state.get("user_preference_temperature_unit") as
				| "Fahrenheit"
				| "Celsius"
				| undefined) ?? "Fahrenheit";

		// Fake a temperature reading
		const temperature = unit === "Fahrenheit" ? 68 : 20;

		const report = `${city}: ${temperature}° ${unit}`;
		context.state.set("last_weather_report", report);

		return {
			status: "ok" as const,
			city,
			unit,
			temperature,
			report,
			message: `Weather fetched for ${city} in ${unit}.`,
		};
	},
});

// Model-input guardrail: block if user says "BLOCK"
const blockKeywordGuardrail = ({
	callbackContext,
	llmRequest,
}: {
	callbackContext: CallbackContext;
	llmRequest: LlmRequest;
}): LlmResponse | null => {
	// Find the last user message text
	const lastUser = [...(llmRequest.contents || [])]
		.reverse()
		.find((c) => c.role === "user");
	const lastText: string = lastUser?.parts?.[0]?.text || "";

	if (lastText.toUpperCase().includes("BLOCK")) {
		// Optionally record a flag in session state
		callbackContext.state.set("guardrail_block_keyword_triggered", true);

		return new LlmResponse({
			content: {
				role: "model",
				parts: [
					{
						text: "I cannot process this request because it contains a blocked keyword.",
					},
				],
			},
			finishReason: "STOP",
		});
	}
	return null; // allow
};

// Tool-argument guardrail: block get_weather for Paris
const blockParisToolGuardrail = (
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
): Record<string, any> | null => {
	if (tool?.name === "get_weather") {
		const city = String(args.city || "").toLowerCase();
		if (city === "paris") {
			toolContext.state.set("guardrail_tool_block_triggered", true);
			return {
				status: "error",
				error_message:
					"Policy restriction: Weather checks for Paris are currently disabled by a tool guardrail.",
			};
		}
	}
	return null; // allow
};

async function main() {
	console.log("🛡️ Callbacks and guardrails:");

	// Create a single agent with both callbacks
	const agent = new LlmAgent({
		name: "weather_guardrails",
		description:
			"Weather assistant with model-input and tool-argument guardrails",
		instruction: dedent`
			You are a helpful weather assistant.
			Use the get_weather tool to answer weather questions for a city.
			If asked general questions, respond concisely.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		tools: [getWeatherTool],
		// Store a short summary of the last response in session state
		outputKey: "last_weather_report",
		beforeModelCallback: blockKeywordGuardrail,
		beforeToolCallback: blockParisToolGuardrail,
	});

	// Build a runner around our pre-constructed agent
	const { runner } = await AgentBuilder.create("callbacks_demo")
		.withAgent(agent)
		.build();

	// 1) Allowed: normal weather request (passes beforeModel)
	console.log("\n— Turn 1: Normal request (allowed) —");
	await ask(runner, "What is the weather in London?");

	// 2) Blocked by beforeModel: contains "BLOCK"
	console.log("\n— Turn 2: Contains BLOCK (blocked by beforeModel) —");
	await ask(runner, "BLOCK the request for weather in Tokyo");

	// 3) Blocked by beforeTool: Paris
	console.log("\n— Turn 3: Tool call blocked (Paris) —");
	await ask(runner, "What's the weather in Paris?");
}

main().catch(console.error);
