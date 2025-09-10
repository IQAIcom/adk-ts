import { LlmAgent } from "@iqai/adk";
import { env } from "../../env";
import { jokeTool } from "./tools";

/**
 * Creates and configures a joke agent specialized in providing humor.
 *
 * This agent is equipped with tools to fetch and deliver jokes to users.
 * It uses the Gemini 2.5 Flash model for natural conversation flow and
 * can access joke-related tools for entertainment purposes.
 *
 * @returns A configured LlmAgent instance specialized for joke delivery
 */
export const getJokeAgent = () => {
	const jokeAgent = new LlmAgent({
		name: "joke_agent",
		description: "provides a random joke",
		model: env.LLM_MODEL,
		tools: [jokeTool],
	});

	return jokeAgent;
};
