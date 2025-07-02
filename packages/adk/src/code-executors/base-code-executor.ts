import type {
	CodeExecutionInput,
	CodeExecutionResult,
} from "./code-execution-utils";
import type { InvocationContext } from "../agents/invocation-context";

export interface BaseCodeExecutorConfig {
	/**
	 * If true, extract and process data files from the model request
	 * and attach them to the code executor.
	 * Supported data file MimeTypes are [text/csv].
	 * Default to false.
	 */
	optimizeDataFile?: boolean;

	/**
	 * Whether the code executor is stateful. Default to false.
	 */
	stateful?: boolean;

	/**
	 * The number of attempts to retry on consecutive code execution errors.
	 * Default to 2.
	 */
	errorRetryAttempts?: number;

	/**
	 * The list of the enclosing delimiters to identify the code blocks.
	 * For example, the delimiter ['```python\n', '\n```'] can be
	 * used to identify code blocks with the following format:
	 *
	 * ```python
	 * print("hello")
	 * ```
	 */
	codeBlockDelimiters?: Array<[string, string]>;

	/**
	 * The delimiters to format the code execution result.
	 */
	executionResultDelimiters?: [string, string];
}

export abstract class BaseCodeExecutor {
	protected readonly config: Required<BaseCodeExecutorConfig>;

	constructor(config: BaseCodeExecutorConfig = {}) {
		this.config = {
			optimizeDataFile: config.optimizeDataFile ?? false,
			stateful: config.stateful ?? false,
			errorRetryAttempts: config.errorRetryAttempts ?? 2,
			codeBlockDelimiters: config.codeBlockDelimiters ?? [
				["`tool_code\n", "\n`"],
				["`python\n", "\n`"],
			],
			executionResultDelimiters: config.executionResultDelimiters ?? [
				"`tool_output\n",
				"\n`",
			],
		};
	}

	/**
	 * Executes code and returns the code execution result.
	 */
	abstract executeCode(
		invocationContext: InvocationContext,
		codeExecutionInput: CodeExecutionInput,
	): Promise<CodeExecutionResult>;

	// Getters for configuration
	get optimizeDataFile(): boolean {
		return this.config.optimizeDataFile;
	}

	get stateful(): boolean {
		return this.config.stateful;
	}

	get errorRetryAttempts(): number {
		return this.config.errorRetryAttempts;
	}

	get codeBlockDelimiters(): Array<[string, string]> {
		return this.config.codeBlockDelimiters;
	}

	get executionResultDelimiters(): [string, string] {
		return this.config.executionResultDelimiters;
	}
}
