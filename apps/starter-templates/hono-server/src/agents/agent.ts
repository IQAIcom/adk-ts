import { AgentBuilder } from "@iqai/adk";
import { env } from "../env";
import { getJokeAgent } from "./joke-agent/agent";
import { getWeatherAgent } from "./weather-agent/agent";

/**
 * Creates and configures the root agent for the Hono server.
 *
 * This agent serves as the main entry point for all requests coming through the REST API.
 * It orchestrates sub-agents specialized in different domains (jokes and weather) and
 * routes incoming user requests to the most appropriate sub-agent based on the content.
 *
 * @returns The fully constructed root agent instance ready to handle HTTP requests
 */
export const getRootAgent = () => {
	const jokeAgent = getJokeAgent();
	const weatherAgent = getWeatherAgent();

	return AgentBuilder.create("root_agent")
		.withDescription(
			"Root agent that delegates tasks to sub-agents for telling jokes and providing weather information.",
		)
		.withInstruction(
			"Use the joke sub-agent for humor requests and the weather sub-agent for weather-related queries. Route user requests to the appropriate sub-agent.",
		)
		.withModel(env.LLM_MODEL)
		.withSubAgents([jokeAgent, weatherAgent])
		.build();
};
