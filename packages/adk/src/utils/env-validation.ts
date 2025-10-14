import { config } from "dotenv";
import { ZodSchema, z } from "zod";

/**
 * Options for environment validation with graceful fallbacks
 */
export interface EnvValidationOptions {
	/** Whether to load .env files automatically (default: true) */
	loadDotEnv?: boolean;
	/** Whether to throw errors on validation failure (default: true) */
	throwOnError?: boolean;
	/** Whether to log warnings for missing optional variables (default: true) */
	warnOnMissing?: boolean;
	/** Custom warning/error logger */
	logger?: {
		warn: (message: string) => void;
		error: (message: string) => void;
	};
}

/**
 * Result of environment validation
 */
export interface EnvValidationResult<T> {
	/** Whether validation succeeded */
	success: boolean;
	/** Parsed and validated environment variables (partial if validation failed) */
	data: Partial<T>;
	/** Missing required variables */
	missingRequired: string[];
	/** Missing optional variables that have no defaults */
	missingOptional: string[];
	/** Validation errors */
	errors: string[];
}

/**
 * Enhanced environment validation with graceful fallbacks
 *
 * @example
 * ```typescript
 * // Define schema with optional fallbacks
 * const envSchema = z.object({
 *   REQUIRED_API_KEY: z.string(),
 *   OPTIONAL_API_KEY: z.string().optional(),
 *   DEBUG: z.coerce.boolean().default(false),
 *   PORT: z.coerce.number().default(3000)
 * });
 *
 * // Validate with graceful fallbacks
 * const result = validateEnvWithFallbacks(envSchema, {
 *   throwOnError: false, // Don't throw, return partial results
 *   warnOnMissing: true  // Log warnings for missing vars
 * });
 *
 * if (result.success) {
 *   // All required vars present
 *   const env = result.data as z.infer<typeof envSchema>;
 * } else {
 *   // Handle partial success
 *   console.log('Missing required:', result.missingRequired);
 *   // Can still use available vars from result.data
 * }
 * ```
 */
export function validateEnvWithFallbacks<T extends Record<string, any>>(
	schema: ZodSchema<T>,
	options: EnvValidationOptions = {},
): EnvValidationResult<T> {
	const {
		loadDotEnv = true,
		throwOnError = true,
		warnOnMissing = true,
		logger = console,
	} = options;

	// Load .env files if requested
	if (loadDotEnv) {
		config({ override: false });
	}

	const result: EnvValidationResult<T> = {
		success: false,
		data: {},
		missingRequired: [],
		missingOptional: [],
		errors: [],
	};

	try {
		// Attempt full validation
		const parsed = schema.parse(process.env);
		result.success = true;
		result.data = parsed;
		return result;
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Parse Zod errors to extract missing variables
			const issues = error.issues;
			const schemaShape = getSchemaShape(schema);

			for (const issue of issues) {
				const fieldName = issue.path?.[0]?.toString();
				if (!fieldName) continue;

				const fieldDef = schemaShape[fieldName];
				const isOptional = isFieldOptional(fieldDef);
				const hasDefault = fieldHasDefault(fieldDef);

				if (issue.code === "invalid_type" && issue.expected !== "undefined") {
					if (isOptional || hasDefault) {
						result.missingOptional.push(fieldName);
					} else {
						result.missingRequired.push(fieldName);
					}
				}

				result.errors.push(`${fieldName}: ${issue.message}`);
			}

			// Try to create partial results with available environment variables
			result.data = createPartialEnvData(schema, process.env);

			// Log warnings for missing variables
			if (warnOnMissing) {
				if (result.missingRequired.length > 0) {
					logger.error(
						`❌ Missing required environment variables: ${result.missingRequired.join(", ")}`,
					);
				}
				if (result.missingOptional.length > 0) {
					logger.warn(
						`⚠️  Missing optional environment variables: ${result.missingOptional.join(", ")}`,
					);
				}
			}

			// Set success to true if no required vars are missing
			result.success = result.missingRequired.length === 0;

			if (throwOnError && !result.success) {
				throw new Error(
					`Environment validation failed. Missing required variables: ${result.missingRequired.join(", ")}`,
				);
			}
		} else {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
			if (throwOnError) {
				throw error;
			}
		}
	}

	return result;
}

/**
 * Create a safe environment validation that never throws
 */
export function safeEnvValidation<T extends Record<string, any>>(
	schema: ZodSchema<T>,
	options: Omit<EnvValidationOptions, "throwOnError"> = {},
): EnvValidationResult<T> {
	return validateEnvWithFallbacks(schema, { ...options, throwOnError: false });
}

/**
 * Create an environment object with sensible defaults for missing values
 */
function createPartialEnvData<T>(
	schema: ZodSchema<T>,
	env: Record<string, any>,
): Partial<T> {
	const result: Partial<T> = {};
	const schemaShape = getSchemaShape(schema);

	for (const [key, fieldDef] of Object.entries(schemaShape)) {
		try {
			// Try to parse individual field with its default
			const value = fieldDef.parse(env[key]);
			(result as any)[key] = value;
		} catch {
			// Field failed validation, skip it or use a safe default
			const hasDefault = fieldHasDefault(fieldDef);
			if (hasDefault) {
				try {
					// Try with undefined to trigger default
					const value = fieldDef.parse(undefined);
					(result as any)[key] = value;
				} catch {
					// Even default failed, skip this field
				}
			}
		}
	}

	return result;
}

/**
 * Extract schema shape from Zod schema
 */
function getSchemaShape(schema: any): Record<string, any> {
	if (schema._def?.shape) {
		return schema._def.shape();
	}
	if (schema.shape) {
		return schema.shape;
	}
	return {};
}

/**
 * Check if a Zod field is optional
 */
function isFieldOptional(field: any): boolean {
	return field?._def?.typeName === "ZodOptional" || field?.isOptional?.();
}

/**
 * Check if a Zod field has a default value
 */
function fieldHasDefault(field: any): boolean {
	return (
		field?._def?.typeName === "ZodDefault" ||
		field?._def?.innerType?._def?.typeName === "ZodDefault" ||
		field?._def?.defaultValue !== undefined
	);
}

/**
 * Helper to create environment schema with common patterns
 */
export const envHelpers = {
	/**
	 * Required string environment variable
	 */
	required: (description?: string) =>
		z.string().describe(description || "Required environment variable"),

	/**
	 * Optional string environment variable
	 */
	optional: (description?: string) =>
		z
			.string()
			.optional()
			.describe(description || "Optional environment variable"),

	/**
	 * String with default value
	 */
	withDefault: (defaultValue: string, description?: string) =>
		z
			.string()
			.default(defaultValue)
			.describe(
				description || `Environment variable (default: ${defaultValue})`,
			),

	/**
	 * Boolean environment variable
	 */
	boolean: (defaultValue = false, description?: string) =>
		z.coerce
			.boolean()
			.default(defaultValue)
			.describe(
				description ||
					`Boolean environment variable (default: ${defaultValue})`,
			),

	/**
	 * Number environment variable
	 */
	number: (defaultValue?: number, description?: string) => {
		const schema = z.coerce.number();
		return defaultValue !== undefined
			? schema
					.default(defaultValue)
					.describe(
						description ||
							`Number environment variable (default: ${defaultValue})`,
					)
			: schema.describe(description || "Required number environment variable");
	},

	/**
	 * API key with optional fallback
	 */
	apiKey: (serviceName: string, required = true) => {
		const desc = `${serviceName} API key${required ? " (required)" : " (optional)"}`;
		return required
			? z.string().describe(desc)
			: z.string().optional().describe(desc);
	},
};

/**
 * Create environment validation for ADK agents with common patterns
 */
export function createAgentEnvSchema() {
	return z.object({
		// Debug mode
		ADK_DEBUG: envHelpers.boolean(false, "Enable ADK debug logging"),

		// Common API keys (all optional by default for graceful degradation)
		GOOGLE_API_KEY: envHelpers.apiKey("Google/Gemini", false),
		OPENAI_API_KEY: envHelpers.apiKey("OpenAI", false),
		ANTHROPIC_API_KEY: envHelpers.apiKey("Anthropic", false),
		AZURE_OPENAI_API_KEY: envHelpers.apiKey("Azure OpenAI", false),

		// Model configuration
		LLM_MODEL: envHelpers.withDefault(
			"gemini-2.0-flash-exp",
			"Default LLM model to use",
		),

		// Server configuration
		PORT: envHelpers.number(3000, "Server port"),
		HOST: envHelpers.withDefault("localhost", "Server host"),

		// Environment
		NODE_ENV: envHelpers.withDefault("development", "Node environment"),
	});
}
