/**
 * Utility functions to check model capabilities
 */

/**
 * Extracts the base model name from various formats:
 * - Direct: "gpt-4o" -> "gpt-4o"
 * - OpenRouter: "openai/gpt-4o" -> "gpt-4o"
 * - OpenRouter: "google/gemini-2.5-flash" -> "gemini-2.5-flash"
 * - Vercel AI SDK: May be wrapped in other formats
 *
 * @param modelName - The model name/identifier in any format
 * @returns The base model name without provider prefix
 */
function extractBaseModelName(modelName: string): string {
	const normalized = modelName.toLowerCase().trim();

	// Handle OpenRouter format: "provider/model-name"
	// Examples: "openai/gpt-4o", "google/gemini-2.5-flash", "anthropic/claude-3-5-sonnet"
	if (normalized.includes("/")) {
		const parts = normalized.split("/");
		if (parts.length >= 2) {
			// Return the model part (everything after the last slash)
			return parts[parts.length - 1];
		}
	}

	// Return as-is for direct model names
	return normalized;
}

/**
 * Checks if a model supports audio input
 *
 * Supported models:
 * - Google Gemini models (gemini-*)
 * - OpenAI gpt-4o models (gpt-4o, gpt-4o-mini, gpt-4o-2024-*, etc.)
 *
 * Supports multiple formats:
 * - Direct model names: "gpt-4o", "gemini-2.5-flash"
 * - OpenRouter format: "openai/gpt-4o", "google/gemini-2.5-flash"
 * - Agent names that may contain model info
 *
 * @param modelName - The model name/identifier in any format
 * @returns true if the model supports audio input
 */
export function supportsAudioInput(
	modelName: string | null | undefined,
): boolean {
	if (!modelName) return false;

	// Extract base model name (handles OpenRouter format)
	const baseModel = extractBaseModelName(modelName);

	// Google Gemini models support audio
	// Check for: gemini-*, google/gemini-*, or agent names containing "gemini"
	if (
		baseModel.includes("gemini") ||
		modelName.toLowerCase().includes("gemini")
	) {
		return true;
	}

	// OpenAI gpt-4o models support audio
	// Check for: gpt-4o, gpt-4o-mini, gpt-4o-2024-*, etc.
	if (baseModel.startsWith("gpt-4o")) {
		return true;
	}

	// OpenAI gpt-4-turbo models may support audio (check specific versions)
	if (baseModel.startsWith("gpt-4-turbo")) {
		// Only newer versions with audio support
		return baseModel.includes("2024-11") || baseModel.includes("2024-12");
	}

	// Check if model name contains gpt-4o (for agent names like "gpt-4o-agent")
	if (modelName.toLowerCase().includes("gpt-4o")) {
		return true;
	}

	return false;
}

/**
 * Gets a user-friendly message explaining why audio isn't supported
 *
 * @param modelName - The model name/identifier (can be in any format)
 * @returns A message explaining the limitation
 */
export function getAudioUnsupportedMessage(
	modelName: string | null | undefined,
): string {
	if (!modelName) {
		return "Voice input is not available. Please select an agent with a supported model (GPT-4o or Gemini).";
	}

	const baseModel = extractBaseModelName(modelName);
	const normalized = modelName.toLowerCase();

	// Check for specific unsupported model types
	if (baseModel.startsWith("gpt-3.5") || normalized.includes("gpt-3.5")) {
		return "Voice input is not supported for GPT-3.5 models. Please use GPT-4o or Gemini models.";
	}

	if (
		(baseModel.startsWith("gpt-4") && !baseModel.startsWith("gpt-4o")) ||
		(normalized.includes("gpt-4") && !normalized.includes("gpt-4o"))
	) {
		return "Voice input is only supported for GPT-4o models. Please use GPT-4o or Gemini models.";
	}

	if (
		baseModel.startsWith("o1") ||
		baseModel.startsWith("o3") ||
		normalized.includes("o1") ||
		normalized.includes("o3")
	) {
		return "Voice input is not supported for reasoning models (o1, o3). Please use GPT-4o or Gemini models.";
	}

	if (baseModel.startsWith("claude") || normalized.includes("claude")) {
		return "Voice input is not supported for Claude models. Please use GPT-4o or Gemini models.";
	}

	// Generic message for unknown models
	return "Voice input is not supported for this model. Please use GPT-4o or Gemini models for voice input.";
}
