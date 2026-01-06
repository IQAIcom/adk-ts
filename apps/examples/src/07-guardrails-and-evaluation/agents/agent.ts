import { AgentBuilder, createTool } from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { GuardrailsPlugin } from "./plugins";
import { getWeatherTool } from "./tools";

export function getRootAgent() {
	const guardrailsPlugin = new GuardrailsPlugin({
		blockKeywords: [
			{
				keywords: ["BLOCK", "FORBIDDEN"],
				message: "I cannot process requests with blocked keywords.",
				stateKey: "guardrail_keyword_triggered",
			},
		],
		blockTools: [
			{
				toolName: "get_weather",
				argName: "city",
				values: ["paris", "moscow"],
				errorMessage: "Weather checks for this city are disabled.",
				stateKey: "guardrail_tool_blocked",
			},
		],
	});

	return AgentBuilder.create("weather_guardrails_agent")
		.withModel("gemini-2.5-flash")
		.withDescription("A weather assistant with guardrails")
		.withInstruction(
			dedent`
			You are a helpful weather assistant.
			Use the get_weather tool to answer weather questions.
			Always be friendly and helpful.
		`,
		)
		.withTools(getWeatherTool)
		.withPlugins(guardrailsPlugin)
		.withQuickSession()
		.build();
}
