import { z } from "zod";

export const environmentEnum = z.enum(["development", "production"]);

export const envSchema = z.object({
	ADK_DEBUG: z
		.string()
		.optional()
		.transform((val) => val === "true")
		.default(false),
	NODE_ENV: environmentEnum.default("development"),
	ADK_HTTP_BODY_LIMIT: z.string().default("25mb"),
	ADK_VERBOSE: z
		.string()
		.optional()
		.transform((val) => val === "1" || val === "true")
		.default(false),
});
