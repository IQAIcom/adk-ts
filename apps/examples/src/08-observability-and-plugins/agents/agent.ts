import { AgentBuilder } from "@iqai/adk";
import { DEFAULT_MODEL } from "../../config";
import { getWeatherTool } from "./tools";

export function getRootAgent() {
	return AgentBuilder.create("weather_agent")
		.withModel(process.env.LLM_MODEL || DEFAULT_MODEL)
		.withTools(getWeatherTool)
		.withInstruction("You help users check the weather.")
		.build();
}
