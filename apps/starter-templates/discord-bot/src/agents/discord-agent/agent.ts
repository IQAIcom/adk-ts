import { LlmAgent, type SamplingHandler } from "@iqai/adk";
import { env } from "../../env";
import { getDiscordMcpTools } from "./tool";

/**
 * Creates and configures a Discord agent with MCP tools for Discord interactions.
 *
 * This agent provides comprehensive Discord functionality including sending messages,
 * adding reactions, retrieving channel/server information, and performing Discord
 * management tasks through the Model Context Protocol (MCP) interface.
 *
 * @param samplingHandler - The sampling handler that enables Discord MCP communication
 * @returns A configured LlmAgent instance with Discord interaction capabilities
 */
export const getDiscordAgent = async (samplingHandler: SamplingHandler) => {
	const discordMcpTools = await getDiscordMcpTools(samplingHandler);
	const discordAgent = new LlmAgent({
		name: "discord_agent",
		description:
			"An agent capable of interacting with Discord. It can send messages, add reactions to messages, retrieve group and channel information, and perform various Discord management tasks.",
		model: env.LLM_MODEL,
		tools: discordMcpTools,
	});
	return discordAgent;
};
