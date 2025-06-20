import { Logger } from "@adk/helpers/logger";
import type { BaseLlm } from "./base-llm";

/**
 * Type for LLM constructor with static methods
 */
interface LLMClass {
	new (model: string): BaseLlm;
	supportedModels(): string[];
}

const logger = new Logger({ name: "LLMRegistry" });

/**
 * Registry for LLMs
 */
export class LLMRegistry {
	/**
	 * Map of model name regex to LLM class
	 */
	private static llmRegistry: Map<RegExp, LLMClass> = new Map();

	/**
	 * Creates a new LLM instance
	 *
	 * @param model The model name
	 * @returns The LLM instance
	 */
	static newLLM(model: string): BaseLlm {
		const llmClass = LLMRegistry.resolve(model);
		if (!llmClass) {
			throw new Error(`No LLM found for model: ${model}`);
		}

		return new llmClass(model);
	}

	/**
	 * Resolves the LLM class from the model name
	 *
	 * @param model The model name
	 * @returns The LLM class
	 */
	static resolve(model: string): LLMClass | null {
		for (const [regex, llmClass] of LLMRegistry.llmRegistry.entries()) {
			if (regex.test(model)) {
				return llmClass;
			}
		}

		return null;
	}

	/**
	 * Registers a new LLM class
	 *
	 * @param modelNameRegex The regex to match model names
	 * @param llmClass The LLM class
	 */
	static register(modelNameRegex: string, llmClass: LLMClass): void {
		LLMRegistry.llmRegistry.set(new RegExp(modelNameRegex), llmClass);
	}

	/**
	 * Registers all model patterns from an LLM class
	 *
	 * @param llmClass The LLM class
	 */
	static registerLLM(llmClass: LLMClass): void {
		const modelPatterns = llmClass.supportedModels();

		for (const pattern of modelPatterns) {
			LLMRegistry.register(pattern, llmClass);
		}
	}

	/**
	 * Logs all registered models for debugging
	 */
	static logRegisteredModels(): void {
		logger.debug(
			"Registered LLM models:",
			[...LLMRegistry.llmRegistry.entries()].map(([regex]) => regex.toString()),
		);
	}
}
