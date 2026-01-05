import { dirname } from "node:path";
import { env, cwd } from "node:process";
import { fileURLToPath } from "node:url";
import {
	AgentBuilder,
	AgentEvaluator,
	type BaseTool,
	type CallbackContext,
	LlmAgent,
	LlmResponse,
	type LlmRequest,
	type ToolContext,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get the weather for a given city",
	schema: z.object({
		city: z.string().describe("The city to get weather for"),
	}),
	fn: async ({ city }: { city: string }, context: ToolContext) => {
		const unit =
			context.state.get("user_preference_temperature_unit") ?? "Fahrenheit";
		const temperature = unit === "Fahrenheit" ? 68 : 20;
		return {
			status: "ok" as const,
			city,
			unit,
			temperature,
			report: `${city}: ${temperature}° ${unit}`,
		};
	},
});

const blockKeywordGuardrail = ({
	callbackContext,
	llmRequest,
}: {
	callbackContext: CallbackContext;
	llmRequest: LlmRequest;
}): LlmResponse | null => {
	const lastUser = [...(llmRequest.contents || [])]
		.reverse()
		.find((c) => c.role === "user");
	const lastText: string = lastUser?.parts?.[0]?.text || "";

	if (lastText.toUpperCase().includes("BLOCK")) {
		callbackContext.state.set("guardrail_block_keyword_triggered", true);
		return new LlmResponse({
			content: {
				role: "model",
				parts: [{ text: "I cannot process requests with blocked keywords." }],
			},
			finishReason: "STOP",
		});
	}
	return null;
};

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
				error_message: "Weather checks for Paris are disabled.",
			};
		}
	}
	return null;
};

async function demonstrateGuardrails() {
	console.log("🛡️ Part 1: Guardrails (Callbacks)\n");

	const agent = new LlmAgent({
		name: "weather_guardrails",
		description: "Weather assistant with guardrails",
		instruction: dedent`
			You are a helpful weather assistant.
			Use the get_weather tool to answer weather questions.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		tools: [getWeatherTool],
		beforeModelCallback: blockKeywordGuardrail,
		beforeToolCallback: blockParisToolGuardrail,
	});

	const { runner } = await AgentBuilder.create("callbacks_demo")
		.withAgent(agent)
		.build();

	console.log("Normal request (allowed):");
	await ask(runner, "What is the weather in London?");

	console.log("\nContains BLOCK (blocked by beforeModel):");
	await ask(runner, "BLOCK the request for weather in Tokyo");

	console.log("\nTool call blocked (Paris):");
	await ask(runner, "What's the weather in Paris?");
}

async function demonstrateEvaluation() {
	console.log("\n🧪 Part 2: Agent Evaluation\n");

	const { agent } = await AgentBuilder.create("eval_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction("Answer briefly and accurately.")
		.build();

	const dir = `${cwd()}/apps/examples/new_src/07-guardrails-and-evaluation`;

	try {
		await AgentEvaluator.evaluate(agent, dir, 1);
		console.log("✅ Evaluation passed");
	} catch (err) {
		console.error(
			"❌ Evaluation failed:",
			err instanceof Error ? err.message : err,
		);
	}
}

async function main() {
	console.log("🛡️ Guardrails and Evaluation\n");

	await demonstrateGuardrails();
	await demonstrateEvaluation();

	console.log("\n✅ Complete! Next: 08-observability-and-plugins\n");
}

main().catch(console.error);
