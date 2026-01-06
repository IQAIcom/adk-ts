import { AgentBuilder } from "@iqai/adk";
import dedent from "dedent";
import { GuardrailsPlugin } from "./plugins";
import { getWeatherTool } from "./tools";

export function getRootAgent() {
	const guardrailsPlugin = new GuardrailsPlugin();

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
