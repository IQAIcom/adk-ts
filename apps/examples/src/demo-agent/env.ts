import { config } from "dotenv";
import { z } from "zod";

config();

export const envSchema = z.object({
	ADK_DEBUG: z.string().default("false"),
	GOOGLE_API_KEY: z.string(),
	DATABASE_URL: z.string(),
	TELEGRAM_BOT_TOKEN: z.string().optional(),
	TELEGRAM_CHANNEL_ID: z.string(),
});

export const env = envSchema.parse(process.env);
