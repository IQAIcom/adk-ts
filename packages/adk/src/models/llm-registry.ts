import { Logger } from "@adk/logger";
import type { BaseLlm } from "./base-llm";
import type { LlmResponse } from "./llm-response";

interface LLMClass {
	new (model: string): BaseLlm;
	supportedModels(): string[];
}

export interface LlmModelConfig {
	temperature?: number;
	maxOutputTokens?: number;
	topP?: number;
	topK?: number;
}

export interface LlmModel {
	generateContent(
		options: { prompt: string } & LlmModelConfig,
	): Promise<LlmResponse>;
}

export class LLMRegistry {
	private static llmRegistry: Map<RegExp, LLMClass> = new Map();

	private static modelInstances: Map<string, LlmModel> = new Map();

	private static logger = new Logger({ name: "LLMRegistry" });

	static newLLM(model: string): BaseLlm {
		const llmClass = LLMRegistry.resolve(model);
		if (!llmClass) {
			throw new Error(`No LLM class found for model: ${model}`);
		}
		return new llmClass(model);
	}

	static resolve(model: string): LLMClass | null {
		for (const [regex, llmClass] of LLMRegistry.llmRegistry.entries()) {
			if (regex.test(model)) {
				return llmClass;
			}
		}
		return null;
	}

	static register(modelNameRegex: string, llmClass: LLMClass): void {
		LLMRegistry.llmRegistry.set(new RegExp(modelNameRegex), llmClass);
	}

	static registerLLM(llmClass: LLMClass): void {
		const modelPatterns = llmClass.supportedModels();
		for (const pattern of modelPatterns) {
			LLMRegistry.register(pattern, llmClass);
		}
	}

	static registerModel(name: string, model: LlmModel): void {
		LLMRegistry.modelInstances.set(name, model);
	}

	static getModel(name: string): LlmModel {
		const model = LLMRegistry.modelInstances.get(name);
		if (!model) {
			throw new Error(`Model '${name}' not found in registry`);
		}
		return model;
	}

	static hasModel(name: string): boolean {
		return LLMRegistry.modelInstances.has(name);
	}

	static unregisterModel(name: string): void {
		LLMRegistry.modelInstances.delete(name);
	}

	static getModelOrCreate(name: string): LlmModel | BaseLlm {
		if (LLMRegistry.hasModel(name)) {
			return LLMRegistry.getModel(name);
		}

		return LLMRegistry.newLLM(name);
	}

	static clear(): void {
		LLMRegistry.llmRegistry.clear();
		LLMRegistry.modelInstances.clear();
	}

	static clearModels(): void {
		LLMRegistry.modelInstances.clear();
	}

	static clearClasses(): void {
		LLMRegistry.llmRegistry.clear();
	}

	static logRegisteredModels(): void {
		const classPatterns = [...LLMRegistry.llmRegistry.entries()].map(
			([regex]) => regex.toString(),
		);
		const instanceNames = [...LLMRegistry.modelInstances.keys()];

		LLMRegistry.logger.debug("Registered LLM class patterns:", classPatterns);
		LLMRegistry.logger.debug("Registered LLM instances:", instanceNames);
	}
}
