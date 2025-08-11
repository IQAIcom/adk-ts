import { McpDiscord, type SamplingHandler } from "@iqai/adk";

export function createDiscordAgent(samplingHandler: SamplingHandler) {
	return McpDiscord({
		samplingHandler,
		env: {
			DISCORD_TOKEN: process.env.DISCORD_TOKEN,
			PATH: process.env.PATH,
		},
	});
}
