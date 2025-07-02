import type { State } from "../sessions/state";
import type { File } from "./code-execution-utils";

const CONTEXT_KEY = "_code_execution_context";
const SESSION_ID_KEY = "execution_session_id";
const PROCESSED_FILE_NAMES_KEY = "processed_input_files";
const INPUT_FILE_KEY = "_code_executor_input_files";
const ERROR_COUNT_KEY = "_code_executor_error_counts";
const CODE_EXECUTION_RESULTS_KEY = "_code_execution_results";

interface CodeExecutionResultEntry {
	code: string;
	resultStdout: string;
	resultStderr: string;
	timestamp: number;
}

/**
 * The persistent context used to configure the code executor.
 */
export class CodeExecutorContext {
	private readonly context: Record<string, any>;
	private readonly sessionState: State;

	constructor(sessionState: State) {
		this.sessionState = sessionState;
		this.context = this.getCodeExecutorContext(sessionState);
	}

	/**
	 * Gets the state delta to update in the persistent session state.
	 */
	getStateDelta(): Record<string, any> {
		// Create a deep copy of the context to update
		const contextToUpdate = JSON.parse(JSON.stringify(this.context));
		return { [CONTEXT_KEY]: contextToUpdate };
	}

	/**
	 * Gets the session ID for the code executor.
	 */
	getExecutionId(): string | null {
		if (!(SESSION_ID_KEY in this.context)) {
			return null;
		}
		return this.context[SESSION_ID_KEY];
	}

	/**
	 * Sets the session ID for the code executor.
	 */
	setExecutionId(sessionId: string): void {
		this.context[SESSION_ID_KEY] = sessionId;
	}

	/**
	 * Gets the processed file names from the session state.
	 */
	getProcessedFileNames(): string[] {
		if (!(PROCESSED_FILE_NAMES_KEY in this.context)) {
			return [];
		}
		return this.context[PROCESSED_FILE_NAMES_KEY];
	}

	/**
	 * Adds the processed file names to the session state.
	 */
	addProcessedFileNames(fileNames: string[]): void {
		if (!(PROCESSED_FILE_NAMES_KEY in this.context)) {
			this.context[PROCESSED_FILE_NAMES_KEY] = [];
		}
		this.context[PROCESSED_FILE_NAMES_KEY].push(...fileNames);
	}

	/**
	 * Gets the code executor input files from the session state.
	 */
	getInputFiles(): File[] {
		if (!(INPUT_FILE_KEY in this.sessionState)) {
			return [];
		}
		return (this.sessionState[INPUT_FILE_KEY] as any[]).map(
			(file) => file as File,
		);
	}

	/**
	 * Adds the input files to the code executor context.
	 */
	addInputFiles(inputFiles: File[]): void {
		if (!(INPUT_FILE_KEY in this.sessionState)) {
			this.sessionState[INPUT_FILE_KEY] = [];
		}

		const fileArray = this.sessionState[INPUT_FILE_KEY] as any[];
		for (const inputFile of inputFiles) {
			fileArray.push({
				name: inputFile.name,
				content: inputFile.content,
				mimeType: inputFile.mimeType,
			});
		}
	}

	/**
	 * Removes the input files and processed file names from the code executor context.
	 */
	clearInputFiles(): void {
		if (INPUT_FILE_KEY in this.sessionState) {
			this.sessionState[INPUT_FILE_KEY] = [];
		}
		if (PROCESSED_FILE_NAMES_KEY in this.context) {
			this.context[PROCESSED_FILE_NAMES_KEY] = [];
		}
	}

	/**
	 * Gets the error count from the session state.
	 */
	getErrorCount(invocationId: string): number {
		if (!(ERROR_COUNT_KEY in this.sessionState)) {
			return 0;
		}
		const errorCounts = this.sessionState[ERROR_COUNT_KEY] as Record<
			string,
			number
		>;
		return errorCounts[invocationId] ?? 0;
	}

	/**
	 * Increments the error count for the given invocation ID.
	 */
	incrementErrorCount(invocationId: string): void {
		if (!(ERROR_COUNT_KEY in this.sessionState)) {
			this.sessionState[ERROR_COUNT_KEY] = {};
		}
		const errorCounts = this.sessionState[ERROR_COUNT_KEY] as Record<
			string,
			number
		>;
		errorCounts[invocationId] = this.getErrorCount(invocationId) + 1;
	}

	/**
	 * Resets the error count for the given invocation ID.
	 */
	resetErrorCount(invocationId: string): void {
		if (!(ERROR_COUNT_KEY in this.sessionState)) {
			return;
		}
		const errorCounts = this.sessionState[ERROR_COUNT_KEY] as Record<
			string,
			number
		>;
		if (invocationId in errorCounts) {
			delete errorCounts[invocationId];
		}
	}

	/**
	 * Updates the code execution result.
	 */
	updateCodeExecutionResult(
		invocationId: string,
		code: string,
		resultStdout: string,
		resultStderr: string,
	): void {
		if (!(CODE_EXECUTION_RESULTS_KEY in this.sessionState)) {
			this.sessionState[CODE_EXECUTION_RESULTS_KEY] = {};
		}

		const results = this.sessionState[CODE_EXECUTION_RESULTS_KEY] as Record<
			string,
			CodeExecutionResultEntry[]
		>;

		if (!(invocationId in results)) {
			results[invocationId] = [];
		}

		results[invocationId].push({
			code,
			resultStdout,
			resultStderr,
			timestamp: Math.floor(Date.now() / 1000),
		});
	}

	/**
	 * Gets the code executor context from the session state.
	 */
	private getCodeExecutorContext(sessionState: State): Record<string, any> {
		if (!(CONTEXT_KEY in sessionState)) {
			sessionState[CONTEXT_KEY] = {};
		}
		return sessionState[CONTEXT_KEY] as Record<string, any>;
	}
}
