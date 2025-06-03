import { z } from "zod";
import { config } from "dotenv";

config();

export const envSchema = z.object({
	DEBUG: z.boolean().default(false),
	ATP_USE_DEV: z.string().default("false"),
	ATP_API_KEY: z.string(),
	WALLET_PRIVATE_KEY: z.string(),
	LLM_MODEL: z.string(),
	TELEGRAM_CHAT_ID: z.string(),
	TELEGRAM_BOT_TOKEN: z.string(),
	TELEGRAM_SERVER_KEY: z.string(),
	TELEGRAM_PROFILE_ID: z.string(),
	ATP_INVESTMENT_PERCENTAGE: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.default("0.01"),
	ATP_MIN_INVESTMENT: z
		.string()
		.transform((val) => Number.parseFloat(val))
		.default("1500"),
	ATP_CRON_SCHEDULE: z.string().default("0 */3 * * *"),
});

export const env = envSchema.parse(process.env);
