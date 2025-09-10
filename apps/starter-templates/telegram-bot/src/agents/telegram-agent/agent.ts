import { LlmAgent, type SamplingHandler } from "@iqai/adk";
import { env } from "../../env";
import { getTelegramMcpTools } from "./tool";

/**
 * Creates and configures a Telegram agent with MCP tools for Telegram interactions.
 *
 * This agent provides comprehensive Telegram functionality including sending messages,
 * managing chats, retrieving channel/group information, and performing Telegram
 * management tasks through the Model Context Protocol (MCP) interface.
 *
 * @param samplingHandler - The sampling handler that enables Telegram MCP communication
 * @returns A configured LlmAgent instance with Telegram interaction capabilities
 */
export const getTelegramAgent = async (samplingHandler: SamplingHandler) => {
	const telegramMcpTools = await getTelegramMcpTools(samplingHandler);
	const telegramAgent = new LlmAgent({
		name: "telegram_agent",
		description:
			"An agent capable of interacting with Telegram. It can send messages, add reactions to messages, retrieve group and channel information, and perform various Telegram management tasks.",
		model: env.LLM_MODEL,
		tools: telegramMcpTools,
	});
	return telegramAgent;
};
