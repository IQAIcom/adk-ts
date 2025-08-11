import { LlmAgent } from "@iqai/adk";
import { getCalculatorAgent } from "./calculator-agent/agent";
import { getWeatherAgent } from "./weather-agent/agent";

export function getRootAgent() {
	const calculatorAgent = getCalculatorAgent();
	const weatherAgent = getWeatherAgent();

	const agent = new LlmAgent({
		name: "rootAgent",
		description:
			"The root agent that delegates tasks to calculator and weather agents.",
		instruction:
			"Use the calculator agent for math-related queries and the weather agent for weather-related queries. Route user requests to the appropriate sub-agent.",
		subAgents: [calculatorAgent, weatherAgent],
	});

	return agent;
}
