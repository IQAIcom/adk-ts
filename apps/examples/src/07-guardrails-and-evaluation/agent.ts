import {
	type CallbackContext,
	LlmAgent,
	LlmResponse,
	type LlmRequest,
	createTool,
	type BaseTool,
	type ToolContext,
} from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";

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
				parts: [
					{
						text: "I cannot process this request because it contains a blocked keyword.",
					},
				],
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
				error_message: "Weather checks for Paris are currently disabled.",
			};
		}
	}
	return null;
};

export default new LlmAgent({
	name: "weather_guardrails",
	description: "Weather assistant with guardrails",
	instruction: dedent`
		You are a helpful weather assistant.
		Use the get_weather tool to answer weather questions.
	`,
	model: "gemini-2.5-flash",
	tools: [getWeatherTool],
	beforeModelCallback: blockKeywordGuardrail,
	beforeToolCallback: blockParisToolGuardrail,
});
