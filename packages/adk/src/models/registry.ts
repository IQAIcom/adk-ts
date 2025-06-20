import { GoogleLlm } from "./google-llm";
import { LLMRegistry } from "./llm-registry";

/**
 * Register all LLM providers
 */
export function registerProviders(): void {
	// Register Google models
	LLMRegistry.registerLLM(GoogleLlm);
}

// Auto-register all providers
registerProviders();
