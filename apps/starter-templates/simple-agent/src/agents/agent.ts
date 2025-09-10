import { AgentBuilder } from "@iqai/adk";
import { env } from "../env";
import { getJokeAgent } from "./joke-agent/agent";
import { getWeatherAgent } from "./weather-agent/agent";

/**
 * Creates and configures the root agent for the simple agent demonstration.
 *
 * This agent serves as the main orchestrator that routes user requests to
 * specialized sub-agents based on the request type. It demonstrates the
 * basic ADK pattern of using a root agent to coordinate multiple specialized
 * agents for different domains (jokes and weather).
 *
 * @returns The fully constructed root agent instance ready to process requests
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
