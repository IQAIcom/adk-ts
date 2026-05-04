/**
 * Utility functions to check model capabilities
 */

import type { AgentListItemDto as Agent } from "../Api";

/**
 * Extracts the base model name from various formats:
 *
 * Direct model names:
 *   "gpt-4o" -> "gpt-4o"
 *   "gemini-2.5-flash" -> "gemini-2.5-flash"
 *   "claude-3-5-sonnet-20241022" -> "claude-3-5-sonnet-20241022"
 *
 * Provider-prefixed (OpenRouter / Vercel AI SDK):
 *   "openai/gpt-4o" -> "gpt-4o"
 *   "google/gemini-2.5-flash" -> "gemini-2.5-flash"
 *   "anthropic/claude-3-opus" -> "claude-3-opus"
 *
 * Nested provider paths (OpenRouter via another provider):
 *   "openrouter/google/gemini-2.5-flash" -> "gemini-2.5-flash"
 *   "openrouter/openai/gpt-4o" -> "gpt-4o"
 *
 * Vertex AI format:
 *   "projects/my-proj/locations/us-central1/publishers/google/models/gemini-2.5-flash"
 *     -> "gemini-2.5-flash"
 *
 * @param modelName - The model name/identifier in any format
 * @returns The base model name without provider prefix
 */
function extractBaseModelName(modelName: string): string {
	const normalized = modelName.toLowerCase().trim();

	// Handle Vertex AI format:
	// "projects/.../publishers/google/models/gemini-2.5-flash"
	const vertexMatch = normalized.match(/\/models\/(.+)$/);
	if (vertexMatch) {
		return vertexMatch[1];
	}

	// Handle provider-prefixed formats: "provider/model" or "provider/provider/model"
	// Always take the last segment as the model name
	if (normalized.includes("/")) {
		const parts = normalized.split("/");
		return parts[parts.length - 1];
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
 * - Vercel AI SDK format: "google/gemini-2.5-flash"
 * - Vertex AI format: "projects/.../models/gemini-2.5-flash"
 * - Agent names that may contain model info
 *
 * @param modelName - The model name/identifier in any format
 * @returns true if the model supports audio input
 */
export function supportsAudioInput(
	modelName: string | null | undefined,
): boolean {
	// When we can't determine the model, default to enabled
	// (don't break voice for agents whose model we can't infer)
	if (!modelName) return true;

	// Extract base model name (handles OpenRouter, Vercel AI SDK, Vertex AI formats)
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

/**
 * Infers a model name from an agent's name and path.
 * Best-effort approach — returns null if no model pattern is found.
 */
export function inferModelNameFromAgent(agent: Agent | null): string | null {
	if (!agent) return null;

	const name = agent.name.toLowerCase();
	const path = agent.relativePath?.toLowerCase() || "";
	const combined = `${name} ${path}`;

	// Check for OpenRouter format patterns (provider/model)
	if (combined.includes("openai/gpt-4o") || combined.includes("openai/gpt4o")) {
		return "openai/gpt-4o";
	}
	if (combined.includes("google/gemini")) {
		return "google/gemini-2.5-flash";
	}

	// Check for direct model patterns in agent name
	if (name.includes("gpt-4o") || name.includes("gpt4o")) return "gpt-4o";
	if (name.includes("gemini")) {
		const geminiMatch = name.match(/gemini[-\s]?([\d.]+)?/);
		if (geminiMatch?.[1]) {
			return `gemini-${geminiMatch[1]}`;
		}
		return "gemini-2.5-flash";
	}
	if (name.includes("gpt-4") || name.includes("gpt4")) return "gpt-4";
	if (name.includes("gpt-3.5")) return "gpt-3.5-turbo";
	if (name.includes("claude")) return "claude-3-5-sonnet";

	// Check path for model indicators
	if (path.includes("gpt-4o") || path.includes("gpt4o")) return "gpt-4o";
	if (path.includes("gemini")) return "gemini-2.5-flash";

	return null;
}
