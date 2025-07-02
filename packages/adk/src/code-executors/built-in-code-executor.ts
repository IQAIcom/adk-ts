import type {
	GenerateContentConfig,
	Tool,
	ToolCodeExecution,
} from "@google/genai";
import {
	BaseCodeExecutor,
	type BaseCodeExecutorConfig,
} from "./base-code-executor";
import type {
	CodeExecutionInput,
	CodeExecutionResult,
} from "./code-execution-utils";
import type { InvocationContext } from "../agents/invocation-context";
import type { LlmRequest } from "../models";

/**
 * A code executor that uses the Model's built-in code executor.
 *
 * Currently only supports Gemini 2.0+ models, but will be expanded to
 * other models.
 */
export class BuiltInCodeExecutor extends BaseCodeExecutor {
	constructor(config: BaseCodeExecutorConfig = {}) {
		super(config);
	}

	async executeCode(
		invocationContext: InvocationContext,
		codeExecutionInput: CodeExecutionInput,
	): Promise<CodeExecutionResult> {
		// This method is intentionally not implemented as the built-in
		// code executor relies on the model's native code execution capabilities
		// The actual execution happens within the model during generation
		throw new Error(
			"BuiltInCodeExecutor.executeCode should not be called directly",
		);
	}

	/**
	 * Pre-process the LLM request for Gemini 2.0+ models to use the code execution tool
	 */
	processLlmRequest(llmRequest: LlmRequest): void {
		if (!llmRequest.model?.startsWith("gemini-2")) {
			throw new Error(
				`Gemini code execution tool is not supported for model ${llmRequest.model}`,
			);
		}

		// Initialize config if not present
		if (!llmRequest.config) {
			llmRequest.config = {} as GenerateContentConfig;
		}

		// Initialize tools array if not present
		if (!llmRequest.config.tools) {
			llmRequest.config.tools = [];
		}

		// Add code execution tool
		const codeExecutionTool: Tool = {
			codeExecution: {} as ToolCodeExecution,
		};

		llmRequest.config.tools.push(codeExecutionTool);
	}
}
