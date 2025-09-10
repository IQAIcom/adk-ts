import { McpDiscord, type SamplingHandler } from "@iqai/adk";
import { env } from "../../env";

/**
 * Initializes and retrieves Discord MCP (Model Context Protocol) tools.
 *
 * This function sets up the Discord MCP toolset with the bot's token and sampling handler,
 * enabling the agent to perform Discord operations like sending messages, managing channels,
 * and interacting with Discord's API through the MCP interface.
 *
 * @param samplingHandler - Handler for processing MCP sampling requests
 * @returns Promise resolving to an array of Discord MCP tools for agent use
 */
export const getDiscordMcpTools = async (samplingHandler: SamplingHandler) => {
	const mcpToolset = McpDiscord({
		samplingHandler,
		env: {
			DISCORD_TOKEN: env.DISCORD_TOKEN,
		},
	});
	const tools = await mcpToolset.getTools();
	return tools;
};
