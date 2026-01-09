import { AgentBuilder } from "@iqai/adk";
import { getWeatherTool } from "./tools";

export function getRootAgent() {
	return AgentBuilder.create("weather_agent")
		.withModel(process.env.LLM_MODEL || "gemini-3-flash-preview")
		.withTools(getWeatherTool)
		.withInstruction("You help users check the weather.")
		.build();
}
