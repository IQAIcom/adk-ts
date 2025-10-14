import { config } from "dotenv";
import { z } from "zod";

// Load environment variables
config();

/**
 * Enhanced environment variable schema with graceful fallbacks
 *
 * This schema demonstrates best practices for ADK agents:
 * - Required variables will cause agent startup to fail if missing
 * - Optional variables allow the agent to start with reduced functionality
 * - Default values ensure the agent has reasonable fallbacks
 */
export const envSchema = z.object({
	// Debug settings (optional with default)
	ADK_DEBUG: z.coerce
		.boolean()
		.default(false)
		.describe("Enable ADK debug logging"),

	// API Keys - Made optional for graceful degradation
	// The agent can start without these but will have limited functionality
	GOOGLE_API_KEY: z
		.string()
		.optional()
		.describe("Google/Gemini API key for LLM access"),
	OPENAI_API_KEY: z
		.string()
		.optional()
		.describe("OpenAI API key for alternative LLM access"),

	// Model configuration (with sensible defaults)
	LLM_MODEL: z
		.string()
		.default("gemini-2.0-flash-exp")
		.describe("Default LLM model to use"),

	// Server settings (optional)
	PORT: z.coerce.number().default(3000).describe("Server port"),
	HOST: z.string().default("localhost").describe("Server host"),

	// Environment
	NODE_ENV: z.string().default("development").describe("Node environment"),

	// Weather API example (optional for demo purposes)
	WEATHER_API_KEY: z
		.string()
		.optional()
		.describe("Weather API key for weather agent functionality"),
});

/**
 * Type-safe environment variables with graceful error handling
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse environment variables with enhanced error reporting
 */
function parseEnvironment():
	| { success: true; env: Env }
	| { success: false; env: Partial<Env>; errors: string[] } {
	try {
		const env = envSchema.parse(process.env);
		return { success: true, env };
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Create partial environment with available values
			const partialEnv: Partial<Env> = {};
			const errors: string[] = [];
			const missingRequired: string[] = [];
			const missingOptional: string[] = [];

			// Process each field individually to get what we can
			const shape = envSchema.shape;
			for (const [key, schema] of Object.entries(shape)) {
				try {
					(partialEnv as any)[key] = schema.parse(process.env[key]);
				} catch (fieldError) {
					if (fieldError instanceof z.ZodError) {
						const issue = fieldError.issues[0];
						if (
							issue?.code === "invalid_type" &&
							issue.received === "undefined"
						) {
							// Check if field is optional or has default
							const isOptional =
								schema.isOptional?.() || schema._def.typeName === "ZodOptional";
							const hasDefault = schema._def.typeName === "ZodDefault";

							if (isOptional && !hasDefault) {
								missingOptional.push(key);
							} else if (!isOptional && !hasDefault) {
								missingRequired.push(key);
								errors.push(`${key}: Required environment variable is missing`);
							}
							// If has default, it should have been applied, so this shouldn't happen
						} else {
							errors.push(`${key}: ${issue?.message || "Validation failed"}`);
						}
					}
				}
			}

			// Log helpful messages
			if (missingOptional.length > 0) {
				console.warn(
					`⚠️  Missing optional environment variables: ${missingOptional.join(", ")}\\n` +
						"   Agent will start with limited functionality. Consider setting these in your .env file.",
				);
			}

			if (missingRequired.length > 0) {
				console.error(
					`❌ Missing required environment variables: ${missingRequired.join(", ")}\\n` +
						"   Agent cannot start without these variables.",
				);
			}

			return { success: missingRequired.length === 0, env: partialEnv, errors };
		}

		throw error; // Re-throw non-Zod errors
	}
}

// Parse environment and export result
const envResult = parseEnvironment();

if (!envResult.success) {
	console.error("\\n" + "=".repeat(80));
	console.error("❌ ENVIRONMENT VALIDATION FAILED");
	console.error("=".repeat(80));
	console.error("\\nThe following issues were detected:");
	for (const error of envResult.errors) {
		console.error(`   • ${error}`);
	}
	console.error(
		"\\n💡 Create a .env file in your project root with the missing variables.",
	);
	console.error("   Example .env file:");
	console.error("   GOOGLE_API_KEY=your_google_api_key_here");
	console.error("   # OPENAI_API_KEY=your_openai_key_here  # Optional");
	console.error("   # WEATHER_API_KEY=your_weather_key_here  # Optional");
	console.error("\\n" + "=".repeat(80) + "\\n");

	// Exit if there are truly required variables missing
	// But allow the agent to start with warnings if only optional vars are missing
	const hasRequiredMissing = envResult.errors.some(
		(error) => !error.includes("Optional") && !error.includes("optional"),
	);

	if (hasRequiredMissing) {
		process.exit(1);
	}
}

/**
 * Validated and parsed environment variables
 * Note: This may be a partial object if some optional variables are missing
 */
export const env = envResult.env as Env;

/**
 * Helper functions to safely access potentially missing environment variables
 */
export const envHelpers = {
	/**
	 * Safely get an API key, returning undefined if not available
	 */
	getApiKey: (keyName: keyof Env): string | undefined => {
		const key = env[keyName];
		return typeof key === "string" && key.length > 0 ? key : undefined;
	},

	/**
	 * Check if a specific functionality is available based on required env vars
	 */
	hasGoogleApiKey: (): boolean => !!envHelpers.getApiKey("GOOGLE_API_KEY"),
	hasOpenAiApiKey: (): boolean => !!envHelpers.getApiKey("OPENAI_API_KEY"),
	hasWeatherApiKey: (): boolean => !!envHelpers.getApiKey("WEATHER_API_KEY"),

	/**
	 * Get available LLM providers based on API keys
	 */
	getAvailableProviders: (): string[] => {
		const providers: string[] = [];
		if (envHelpers.hasGoogleApiKey()) providers.push("google");
		if (envHelpers.hasOpenAiApiKey()) providers.push("openai");
		return providers;
	},

	/**
	 * Get best available API key in order of preference
	 */
	getBestApiKey: (): { provider: string; key: string } | null => {
		if (envHelpers.hasGoogleApiKey()) {
			return { provider: "google", key: env.GOOGLE_API_KEY! };
		}
		if (envHelpers.hasOpenAiApiKey()) {
			return { provider: "openai", key: env.OPENAI_API_KEY! };
		}
		return null;
	},
};

// Log available functionality on startup
console.log("🚀 ADK Agent Environment Configuration:");
console.log(`   Debug mode: ${env.ADK_DEBUG}`);
console.log(
	`   Available LLM providers: ${envHelpers.getAvailableProviders().join(", ") || "none"}`,
);
console.log(
	`   Weather functionality: ${envHelpers.hasWeatherApiKey() ? "enabled" : "disabled"}`,
);
console.log(`   Default model: ${env.LLM_MODEL}`);
if (envHelpers.getAvailableProviders().length === 0) {
	console.warn(
		"⚠️  No LLM API keys configured. The agent will have very limited functionality.",
	);
	console.warn(
		"   Consider setting GOOGLE_API_KEY or OPENAI_API_KEY in your .env file.",
	);
}
console.log("");
