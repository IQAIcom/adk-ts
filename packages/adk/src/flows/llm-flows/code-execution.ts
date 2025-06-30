import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import type { LlmResponse } from "../../models/llm-response";
import {
	BaseLlmRequestProcessor,
	BaseLlmResponseProcessor,
} from "./base-llm-processor";

/**
 * Data file utility structure for code execution
 * TODO: Expand this when code-executors module is ready
 */
interface DataFileUtil {
	extension: string;
	loaderCodeTemplate: string;
}

/**
 * Map of MIME types to data file utilities
 * TODO: Populate this when code execution is fully implemented
 */
const DATA_FILE_UTIL_MAP: Record<string, DataFileUtil> = {
	"text/csv": {
		extension: ".csv",
		loaderCodeTemplate: "pd.read_csv('{filename}')",
	},
};

/**
 * Helper library code for data file exploration (Python code)
 * TODO: This will be used by code executors when implemented
 */
const DATA_FILE_HELPER_LIB = `import pandas as pd

def explore_df(df: pd.DataFrame) -> None:
    """Prints some information about a pandas DataFrame."""

    with pd.option_context(
        'display.max_columns', None, 'display.expand_frame_repr', False
    ):
        # Print the column names to never encounter KeyError when selecting one.
        df_dtypes = df.dtypes

        # Obtain information about data types and missing values.
        df_nulls = (len(df) - df.isnull().sum()).apply(
            lambda x: f'{x} / {df.shape[0]} non-null'
        )

        # Explore unique total values in columns using .unique().
        df_unique_count = df.apply(lambda x: len(x.unique()))

        # Explore unique values in columns using .unique().
        df_unique = df.apply(lambda x: crop(str(list(x.unique()))))

        df_info = pd.concat(
            (
                df_dtypes.rename('Dtype'),
                df_nulls.rename('Non-Null Count'),
                df_unique_count.rename('Unique Values Count'),
                df_unique.rename('Unique Values'),
            ),
            axis=1,
        )
        df_info.index.name = 'Columns'
        print(f"""Total rows: {df.shape[0]}
Total columns: {df.shape[1]}

{df_info}""")

def crop(text: str, max_length: int = 100) -> str:
    """Crop text to maximum length with ellipsis."""
    return text if len(text) <= max_length else text[:max_length] + "..."
`;

/**
 * Request processor for code execution
 * This is a placeholder implementation that will be enhanced when code-executors are ready
 */
class CodeExecutionRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent;

		// Check if agent has code executor capability (duck typing)
		if (!("codeExecutor" in agent) || !agent.codeExecutor) {
			return;
		}

		console.log(
			"Code execution request processing - TODO: Implement when code-executors module is ready",
		);

		// TODO: When code-executors are ready, implement:
		// 1. Run pre-processor logic
		// 2. Extract and replace inline files
		// 3. Optimize data files if enabled
		// 4. Convert code execution parts to text parts
		// 5. Add data file preprocessing code

		// Placeholder: For now, just pass through without processing
		// await this.runPreProcessor(invocationContext, llmRequest);

		// This will be expanded to handle:
		// - BaseCodeExecutor integration
		// - BuiltInCodeExecutor processing
		// - Code block delimiter handling
		// - Execution result delimiter handling
		// - Data file optimization
		// - Error retry logic

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}

	/**
	 * Placeholder for pre-processor logic
	 * TODO: Implement when code-executors are ready
	 */
	private async *runPreProcessor(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		// TODO: Implement pre-processing logic:
		// - Extract data files from session history
		// - Store files in memory
		// - Mutate inline data files to text parts
		// - Add data file helper library
		// - Handle code executor context
		console.log("Code execution pre-processor - placeholder");
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}
}

/**
 * Response processor for code execution
 * This is a placeholder implementation that will be enhanced when code-executors are ready
 */
class CodeExecutionResponseProcessor extends BaseLlmResponseProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		// Skip if the response is partial (streaming)
		if (llmResponse.partial) {
			return;
		}

		const agent = invocationContext.agent;

		// Check if agent has code executor capability
		if (!("codeExecutor" in agent) || !agent.codeExecutor) {
			return;
		}

		console.log(
			"Code execution response processing - TODO: Implement when code-executors module is ready",
		);

		// TODO: When code-executors are ready, implement:
		// 1. Extract code from model response
		// 2. Execute code using code executor
		// 3. Handle execution results and errors
		// 4. Generate execution result events
		// 5. Update code executor context
		// 6. Handle output files and artifacts

		// Placeholder: For now, just pass through without processing
		// await this.runPostProcessor(invocationContext, llmResponse);

		// This will be expanded to handle:
		// - Code extraction and content truncation
		// - Code execution with proper input/output handling
		// - Error retry logic and counting
		// - Artifact service integration
		// - State delta management
		// - File processing and optimization

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}

	/**
	 * Placeholder for post-processor logic
	 * TODO: Implement when code-executors are ready
	 */
	private async *runPostProcessor(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		// TODO: Implement post-processing logic:
		// - Extract code from response and truncate content
		// - Execute code using code executor
		// - Generate code execution events
		// - Handle execution results, stdout, stderr
		// - Process output files and artifacts
		// - Update session state with execution context
		// - Handle error retry logic
		console.log("Code execution post-processor - placeholder");
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}
}

/**
 * Placeholder utility functions for code execution
 * TODO: These will be implemented when code-executors module is ready
 */
class CodeExecutionUtils {
	/**
	 * Extracts and replaces inline files with file names in the LLM request
	 * TODO: Implement when File and CodeExecutorContext are available
	 */
	static extractAndReplaceInlineFiles(llmRequest: LlmRequest): any[] {
		console.log(
			"CodeExecutionUtils.extractAndReplaceInlineFiles - placeholder",
		);
		return [];
	}

	/**
	 * Extracts code from response and truncates content
	 * TODO: Implement when code execution utilities are ready
	 */
	static extractCodeAndTruncateContent(
		content: any,
		delimiters: any,
	): string | null {
		console.log(
			"CodeExecutionUtils.extractCodeAndTruncateContent - placeholder",
		);
		return null;
	}

	/**
	 * Converts code execution parts to text parts
	 * TODO: Implement when code execution utilities are ready
	 */
	static convertCodeExecutionParts(
		content: any,
		blockDelimiters: any,
		resultDelimiters: any,
	): void {
		console.log("CodeExecutionUtils.convertCodeExecutionParts - placeholder");
	}

	/**
	 * Builds code execution result part
	 * TODO: Implement when CodeExecutionResult is available
	 */
	static buildCodeExecutionResultPart(result: any): any {
		console.log(
			"CodeExecutionUtils.buildCodeExecutionResultPart - placeholder",
		);
		return { text: "Code execution result placeholder" };
	}

	/**
	 * Gets encoded file content
	 * TODO: Implement when file utilities are ready
	 */
	static getEncodedFileContent(data: any): any {
		console.log("CodeExecutionUtils.getEncodedFileContent - placeholder");
		return { decode: () => "placeholder content" };
	}
}

/**
 * Exported request processor instance for use in flow configurations
 * Ready to be connected when code-executors module is implemented
 */
export const requestProcessor = new CodeExecutionRequestProcessor();

/**
 * Exported response processor instance for use in flow configurations
 * Ready to be connected when code-executors module is implemented
 */
export const responseProcessor = new CodeExecutionResponseProcessor();

/**
 * Export utility classes for future use
 */
export { CodeExecutionUtils, DATA_FILE_UTIL_MAP, DATA_FILE_HELPER_LIB };
