import { McpDiscord, type SamplingHandler } from "@iqai/adk";

export async function getDiscordMcpTools(samplingHandler: SamplingHandler) {
	const mcpToolset = McpDiscord({
		samplingHandler,
		env: {
			DISCORD_TOKEN: process.env.DISCORD_TOKEN,
			PATH: process.env.PATH,
		},
	});

	const tools = await mcpToolset.getTools();
	return tools;
}
