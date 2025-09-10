import { McpTelegram, type SamplingHandler } from "@iqai/adk";
import { env } from "../../env";

/**
 * Initializes and retrieves Telegram MCP (Model Context Protocol) tools.
 *
 * This function sets up the Telegram MCP toolset with the bot's token and sampling handler,
 * enabling the agent to perform Telegram operations like sending messages, managing chats,
 * and interacting with Telegram's Bot API through the MCP interface.
 *
 * @param samplingHandler - Handler for processing MCP sampling requests
 * @returns Promise resolving to an array of Telegram MCP tools for agent use
 */
export const getTelegramMcpTools = async (samplingHandler: SamplingHandler) => {
	const mcpToolset = McpTelegram({
		samplingHandler,
		env: {
			TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
		},
	});
	const tools = await mcpToolset.getTools();
	return tools;
};
