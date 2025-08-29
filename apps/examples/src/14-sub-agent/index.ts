import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import { LlmAgent } from "@iqai/adk";
import { createTool } from "@iqai/adk";
import { z } from "zod";

/**
 * Tool for fetching current weather information for cities worldwide.
 *
 * Uses the wttr.in weather service to retrieve current weather conditions
 * in a concise format. Includes proper URL encoding for city names and
 * error handling for network issues or invalid locations.
 */
const weatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({
		city: z.string().describe("City name"),
	}),
	fn: async ({ city }) => {
		try {
			const response = await fetch(
				`https://wttr.in/${encodeURIComponent(city)}?format=3`,
			);
			return await response.text();
		} catch {
			return `Weather unavailable for ${city}`;
		}
	},
});

/**
 * Creates and configures a weather agent specialized in providing weather information.
 *
 * This agent is equipped with weather-related tools to fetch current conditions,
 * forecasts, and weather data for specified cities. It uses the Gemini 2.5 Flash
 * model for natural language interaction with weather queries.
 *
 * @returns A configured LlmAgent instance specialized for weather information
 */
const getWeatherAgent = () => {
	const weatherAgent = new LlmAgent({
		name: "weather_agent",
		description: "provides weather for a given city",
		model: env.LLM_MODEL,
		tools: [weatherTool],
		outputSchema: z
			.object({
				response: z
					.string()
					.describe("Weather details or summary for the requested city"),
				reasoning: z
					.string()
					.optional()
					.describe("Brief reasoning behind the answer"),
				agentName: z
					.string()
					.optional()
					.describe("Agent name emitting this response"),
				sources: z
					.array(z.string())
					.optional()
					.describe("Relevant sources used to produce the response"),
			})
			.or(z.string()),
	});

	return weatherAgent;
};

/**
 * Tool for fetching random jokes from an external API.
 *
 * Makes HTTP requests to the Official Joke API to retrieve random jokes
 * for entertainment purposes. Includes error handling for network issues
 * or API unavailability.
 */
const jokeTool = createTool({
	name: "get_joke",
	description: "Fetches a random joke",
	fn: async () => {
		try {
			const response = await fetch(
				"https://official-joke-api.appspot.com/random_joke",
			);
			return await response.text();
		} catch {
			return "Joke unavailable right now.";
		}
	},
});

/**
 * Creates and configures a joke agent specialized in providing humor.
 *
 * This agent is equipped with tools to fetch and deliver jokes to users.
 * It uses the Gemini 2.5 Flash model for natural conversation flow and
 * can access joke-related tools for entertainment purposes.
 *
 * @returns A configured LlmAgent instance specialized for joke delivery
 */
const getJokeAgent = () => {
	const jokeAgent = new LlmAgent({
		name: "joke_agent",
		description: "provides a random joke",
		model: env.LLM_MODEL,
		tools: [jokeTool],
		outputSchema: z
			.object({
				response: z
					.string()
					.describe("The joke text or formatted joke response"),
				reasoning: z
					.string()
					.optional()
					.describe("Brief reasoning behind the answer"),
				agentName: z
					.string()
					.optional()
					.describe("Agent name emitting this response"),
				sources: z
					.array(z.string())
					.optional()
					.describe("Relevant sources used to produce the response"),
			})
			.or(z.string()),
	});

	return jokeAgent;
};

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
const getRootAgent = async () => {
	const jokeAgent = getJokeAgent();
	const weatherAgent = getWeatherAgent();

	return await AgentBuilder.create("root_agent")
		.withDescription(
			"Root agent that delegates tasks to sub-agents for telling jokes and providing weather information.",
		)
		.withInstruction(
			"Use the joke sub-agent for humor requests and the weather sub-agent for weather-related queries. Route user requests to the appropriate sub-agent.",
		)
		.withModel(env.LLM_MODEL)
		.withSubAgents([jokeAgent, weatherAgent])
		.withOutputSchema(
			z.object({
				response: z
					.string()
					.describe(
						"Detailed response for the given user query with as easy to understand",
					),
				reasoning: z
					.string()
					.describe(
						"A brief reasoning behind your response, be friendly and helpful",
					),
				agentName: z.string().describe("The name of the agent that responded"),
				sources: z
					.array(z.string())
					.optional()
					.describe("Relevant sources used to produce the response"),
			}),
		)
		.withQuickSession()
		.build();
};

async function main() {
	const agent = await getRootAgent();
	const responseJoke = await agent.runner.ask("tell me a joke");
	console.log(responseJoke);
	const responseWeather = await agent.runner.ask(
		"what is the weather in new york?",
	);
	console.log(responseWeather);
	const responseMulti = await agent.runner.ask(
		"tell me a joke and what is the weather in new york?",
	);
	console.log(responseMulti);
}

main().catch(console.error);
