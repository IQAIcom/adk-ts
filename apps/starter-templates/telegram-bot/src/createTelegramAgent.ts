import { McpTelegram, type SamplingHandler } from "@iqai/adk";

export function createTelegramAgent(samplingHandler: SamplingHandler) {
	return McpTelegram({
		samplingHandler,
		env: {
			TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
			PATH: process.env.PATH,
		},
	});
}
