import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import { getWeatherTool } from "./tools";

export function getRootAgent() {
	return AgentBuilder.create("weather_agent")
		.withModel(env.LLM_MODEL || "gemini-2.0-flash-exp")
		.withTools(getWeatherTool)
		.withInstruction("You help users check the weather.")
		.build();
}
