import { AnthropicLlm } from "./anthropic-llm";
import { GoogleLlm } from "./google-llm";
import { LLMRegistry } from "./llm-registry";
import { OpenAiLlm } from "./openai-llm";

/**
 * Register all LLM providers
 */
export function registerProviders(): void {
	// Register Google models
	LLMRegistry.registerLLM(GoogleLlm);
	LLMRegistry.registerLLM(AnthropicLlm);
	LLMRegistry.registerLLM(OpenAiLlm);
}

// Auto-register all providers
registerProviders();
