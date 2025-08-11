import { LlmAgent, type SamplingHandler } from "@iqai/adk";
import { getDiscordMcpTools } from "./tools";

export async function getDiscordAgent(samplingHandler: SamplingHandler) {
	const tools = await getDiscordMcpTools(samplingHandler);
	const agent = new LlmAgent({
		name: "discord-agent",
		description: "sends messages to discord",
		tools: tools,
	});

	return agent;
}
