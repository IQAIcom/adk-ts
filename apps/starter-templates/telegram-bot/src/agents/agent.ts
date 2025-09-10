import * as fs from "node:fs";
import * as path from "node:path";
import { AgentBuilder, createDatabaseSessionService } from "@iqai/adk";
import { env } from "../env";
import { getJokeAgent } from "./joke-agent/agent";
import { getWeatherAgent } from "./weather-agent/agent";

/**
 * Creates and configures the root agent for the telegram bot.
 *
 * This agent is responsible for handling every incoming telegram message received by the sampling handler.
 * It delegates tasks to sub-agents, specifically for telling jokes and providing weather information.
 * The root agent uses the "gemini-2.5-flash" model and maintains session state using a SQLite-backed session service.
 *
 * @returns The fully constructed root agent instance, ready to process and route user requests to the appropriate sub-agent.
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
		.withSessionService(
			createDatabaseSessionService(getSqliteConnectionString("telegram_bot")),
		)
		.withSubAgents([jokeAgent, weatherAgent])
		.build();
};

/**
 * Generates a SQLite connection string and ensures the database directory exists.
 *
 * Creates the data directory if it doesn't exist and returns a properly formatted
 * SQLite connection string for the specified database name.
 *
 * @param dbName - Name of the database file (without .db extension)
 * @returns SQLite connection string in the format "sqlite://path/to/database.db"
 */
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite://${dbPath}`;
}
