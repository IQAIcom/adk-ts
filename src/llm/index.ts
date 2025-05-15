/**
 * Re-exports from models directory for backward compatibility
 *
 * The LLM implementations have been moved to the models directory
 * to match the Python structure. This file provides re-exports
 * to maintain compatibility with existing code.
 */

import { AnthropicLLM } from "./providers/anthropic/anthropic-llm";
import { GoogleLLM } from "./providers/google/google-llm";
import { OpenAILLM } from "./providers/openai/openai-llm";

import {
	BaseLLM,
	// AnthropicLLM, // Now imported directly
	// GoogleLLM,    // Now imported directly
	// OpenAILLM,    // Now imported directly
} from "../models"; // BaseLLM is still in ../models

export {
	BaseLLM,
	AnthropicLLM, // Re-export the directly imported ones
	GoogleLLM,
	OpenAILLM,
};

// Re-export LiteLLM placeholder
export { default as LiteLLM } from "./providers/litellm/lite-llm";

// Re-export registry for convenience
export * from "./registry";
