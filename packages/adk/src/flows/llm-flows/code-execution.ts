import { LlmAgent } from "@adk/agents";
import type { Content } from "@google/genai";
import type { InvocationContext } from "../../agents/invocation-context";
import { BaseCodeExecutor } from "../../code-executors/base-code-executor";
import { BuiltInCodeExecutor } from "../../code-executors/built-in-code-executor";
import {
	type CodeExecutionResult,
	CodeExecutionUtils,
	type File,
} from "../../code-executors/code-execution-utils";
import { CodeExecutorContext } from "../../code-executors/code-executor-context";
import { Event } from "../../events/event";
import { EventActions } from "../../events/event-actions";
import type { LlmRequest } from "../../models/llm-request";
import type { LlmResponse } from "../../models/llm-response";
import {
	BaseLlmRequestProcessor,
	BaseLlmResponseProcessor,
} from "./base-llm-processor";

/**
 * Data file utility structure for code execution
 */
interface DataFileUtil {
	extension: string;
	loaderCodeTemplate: string;
}

/**
 * Map of MIME types to data file utilities
 */
const DATA_FILE_UTIL_MAP: Record<string, DataFileUtil> = {
	"text/csv": {
		extension: ".csv",
		loaderCodeTemplate: "pd.read_csv('{filename}')",
	},
};

/**
 * Helper library code for data file exploration (Python code)
 */
const DATA_FILE_HELPER_LIB = `
import pandas as pd

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

    # Explore unique total values in columns using \`.unique()\`.
    df_unique_count = df.apply(lambda x: len(x.unique()))

    # Explore unique values in columns using \`.unique()\`.
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
 * Helper function to check if agent has code executor
 */
function hasCodeExecutor(agent: any): agent is {
	codeExecutor?: BaseCodeExecutor;
	name: string;
} {
	return agent && typeof agent === "object" && "codeExecutor" in agent;
}

/**
 * Request processor for code execution
 */
class CodeExecutionRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		// Use type assertion to access codeExecutor
		const agent = invocationContext.agent;

		// Check if agent has code executor capability
		if (!hasCodeExecutor(agent)) {
			return;
		}

		// Use instanceof for type-safe check
		if (!(agent instanceof LlmAgent) || !agent.codeExecutor) {
			return;
		}

		// Run preprocessing
		yield* runPreProcessor(invocationContext, llmRequest);

		// Convert code execution parts to text parts
		if (!(agent.codeExecutor instanceof BaseCodeExecutor)) {
			return;
		}

		for (const content of llmRequest.contents || []) {
			CodeExecutionUtils.convertCodeExecutionParts(
				content,
				agent.codeExecutor.codeBlockDelimiters[0] || ["", ""],
				agent.codeExecutor.executionResultDelimiters,
			);
		}
	}
}

/**
 * Response processor for code execution
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

		yield* runPostProcessor(invocationContext, llmResponse);
	}
}

/**
 * Pre-process the user message by adding data file processing
 */
async function* runPreProcessor(
	invocationContext: InvocationContext,
	llmRequest: LlmRequest,
): AsyncGenerator<Event> {
	const agent = invocationContext.agent as any; // Type assertion for codeExecutor

	if (!hasCodeExecutor(agent)) {
		return;
	}

	const codeExecutor = agent.codeExecutor as BaseCodeExecutor;

	if (!codeExecutor || !(codeExecutor instanceof BaseCodeExecutor)) {
		return;
	}

	// Handle BuiltInCodeExecutor specially
	if (codeExecutor instanceof BuiltInCodeExecutor) {
		codeExecutor.processLlmRequest(llmRequest);
		return;
	}

	// Skip if data file optimization is disabled
	if (!codeExecutor.optimizeDataFile) {
		return;
	}

	const codeExecutorContext = new CodeExecutorContext(
		invocationContext.session.state as any, // Type assertion for State compatibility
	);

	// Skip if error count exceeds max retry attempts
	if (
		codeExecutorContext.getErrorCount(invocationContext.invocationId) >=
		codeExecutor.errorRetryAttempts
	) {
		return;
	}

	// [Step 1] Extract data files from the session history and store them in memory
	const allInputFiles = extractAndReplaceInlineFiles(
		codeExecutorContext,
		llmRequest,
	);

	// [Step 2] Run explore_df code on new data files
	const processedFileNames = new Set(
		codeExecutorContext.getProcessedFileNames(),
	);
	const filesToProcess = allInputFiles.filter(
		(f) => !processedFileNames.has(f.name),
	);

	for (const file of filesToProcess) {
		const codeStr = getDataFilePreprocessingCode(file);
		if (!codeStr) {
			continue;
		}

		// Emit the code to execute and add it to the LLM request
		const codeContent: Content = {
			role: "model",
			parts: [
				{ text: `Processing input file: \`${file.name}\`` },
				CodeExecutionUtils.buildExecutableCodePart(codeStr),
			],
		};

		llmRequest.contents = llmRequest.contents || [];
		llmRequest.contents.push(structuredClone(codeContent));

		yield new Event({
			invocationId: invocationContext.invocationId,
			author: agent.name,
			branch: invocationContext.branch,
			content: codeContent,
		});

		// Execute the code
		const codeExecutionResult = await codeExecutor.executeCode(
			invocationContext,
			{
				code: codeStr,
				inputFiles: [file],
				executionId: getOrSetExecutionId(
					invocationContext,
					codeExecutorContext,
				),
			},
		);

		// Update processing results
		codeExecutorContext.updateCodeExecutionResult(
			invocationContext.invocationId,
			codeStr,
			codeExecutionResult.stdout,
			codeExecutionResult.stderr,
		);
		codeExecutorContext.addProcessedFileNames([file.name]);

		// Emit execution result
		const executionResultEvent = await postProcessCodeExecutionResult(
			invocationContext,
			codeExecutorContext,
			codeExecutionResult,
		);
		yield executionResultEvent;
		llmRequest.contents.push(structuredClone(executionResultEvent.content!));
	}
}

/**
 * Post-process the model response by extracting and executing code
 */
async function* runPostProcessor(
	invocationContext: InvocationContext,
	llmResponse: LlmResponse,
): AsyncGenerator<Event> {
	const agent = invocationContext.agent as any; // Type assertion for codeExecutor

	if (!hasCodeExecutor(agent)) {
		return;
	}

	const codeExecutor = agent.codeExecutor as BaseCodeExecutor;

	if (!(codeExecutor instanceof BaseCodeExecutor)) {
		return;
	}

	if (!llmResponse || !llmResponse.content) {
		return;
	}

	// Skip BuiltInCodeExecutor
	if (codeExecutor instanceof BuiltInCodeExecutor) {
		return;
	}

	const codeExecutorContext = new CodeExecutorContext(
		invocationContext.session.state as any, // Type assertion for State compatibility
	);

	// Skip if error count exceeds max retry attempts
	if (
		codeExecutorContext.getErrorCount(invocationContext.invocationId) >=
		codeExecutor.errorRetryAttempts
	) {
		return;
	}

	// [Step 1] Extract code from model response
	const responseContent = llmResponse.content;
	const codeStr = CodeExecutionUtils.extractCodeAndTruncateContent(
		responseContent,
		codeExecutor.codeBlockDelimiters,
	);

	// Terminal state: no code to execute
	if (!codeStr) {
		return;
	}

	// [Step 2] Execute code and emit events
	yield new Event({
		invocationId: invocationContext.invocationId,
		author: agent.name,
		branch: invocationContext.branch,
		content: responseContent,
		actions: new EventActions(),
	});

	const codeExecutionResult = await codeExecutor.executeCode(
		invocationContext,
		{
			code: codeStr,
			inputFiles: codeExecutorContext.getInputFiles(),
			executionId: getOrSetExecutionId(invocationContext, codeExecutorContext),
		},
	);

	codeExecutorContext.updateCodeExecutionResult(
		invocationContext.invocationId,
		codeStr,
		codeExecutionResult.stdout,
		codeExecutionResult.stderr,
	);

	yield await postProcessCodeExecutionResult(
		invocationContext,
		codeExecutorContext,
		codeExecutionResult,
	);

	// [Step 3] Skip processing original model response to continue code generation
	llmResponse.content = undefined;
}

/**
 * Extracts and replaces inline files with file names in the LLM request
 */
function extractAndReplaceInlineFiles(
	codeExecutorContext: CodeExecutorContext,
	llmRequest: LlmRequest,
): File[] {
	const allInputFiles = codeExecutorContext.getInputFiles();
	const savedFileNames = new Set(allInputFiles.map((f) => f.name));

	// Process input files from LlmRequest and cache them
	for (let i = 0; i < (llmRequest.contents?.length || 0); i++) {
		const content = llmRequest.contents![i];

		// Only process user messages
		if (content.role !== "user" || !content.parts) {
			continue;
		}

		for (let j = 0; j < content.parts.length; j++) {
			const part = content.parts[j];

			// Skip if inline data is not supported
			if (
				!part.inlineData ||
				!(part.inlineData.mimeType in DATA_FILE_UTIL_MAP)
			) {
				continue;
			}

			// Replace inline data with file name placeholder
			const mimeType = part.inlineData.mimeType;
			const fileName = `data_${i + 1}_${j + 1}${DATA_FILE_UTIL_MAP[mimeType].extension}`;

			llmRequest.contents![i].parts![j] = {
				text: `\nAvailable file: \`${fileName}\`\n`,
			};

			// Add inline data as input file
			const file: File = {
				name: fileName,
				content: CodeExecutionUtils.getEncodedFileContent(part.inlineData.data),
				mimeType: mimeType,
			};

			if (!savedFileNames.has(fileName)) {
				codeExecutorContext.addInputFiles([file]);
				allInputFiles.push(file);
			}
		}
	}

	return allInputFiles;
}

/**
 * Returns execution ID for stateful code execution or undefined if not stateful
 */
function getOrSetExecutionId(
	invocationContext: InvocationContext,
	codeExecutorContext: CodeExecutorContext,
): string | undefined {
	const agent = invocationContext.agent as any;
	if (!hasCodeExecutor(agent) || !agent.codeExecutor?.stateful) {
		return undefined;
	}

	let executionId = codeExecutorContext.getExecutionId();
	if (!executionId) {
		executionId = invocationContext.session.id;
		codeExecutorContext.setExecutionId(executionId);
	}
	return executionId;
}

/**
 * Post-process code execution result and emit an Event
 */
async function postProcessCodeExecutionResult(
	invocationContext: InvocationContext,
	codeExecutorContext: CodeExecutorContext,
	codeExecutionResult: CodeExecutionResult,
): Promise<Event> {
	if (!invocationContext.artifactService) {
		throw new Error("Artifact service is not initialized.");
	}

	const resultContent: Content = {
		role: "model",
		parts: [
			CodeExecutionUtils.buildCodeExecutionResultPart(codeExecutionResult),
		],
	};

	const eventActions = new EventActions({
		stateDelta: codeExecutorContext.getStateDelta(),
	});

	// Handle code execution error retry
	if (codeExecutionResult.stderr) {
		codeExecutorContext.incrementErrorCount(invocationContext.invocationId);
	} else {
		codeExecutorContext.resetErrorCount(invocationContext.invocationId);
	}

	// Handle output files
	for (const outputFile of codeExecutionResult.outputFiles) {
		const version = await invocationContext.artifactService.saveArtifact({
			appName: invocationContext.appName,
			userId: invocationContext.userId,
			sessionId: invocationContext.session.id,
			filename: outputFile.name,
			artifact: {
				inlineData: {
					data: atob(outputFile.content), // Convert from base64
					mimeType: outputFile.mimeType,
				},
			},
		});
		eventActions.artifactDelta[outputFile.name] = version;
	}

	return new Event({
		invocationId: invocationContext.invocationId,
		author: invocationContext.agent.name,
		branch: invocationContext.branch,
		content: resultContent,
		actions: eventActions,
	});
}

/**
 * Returns the code to explore a data file
 */
function getDataFilePreprocessingCode(file: File): string | undefined {
	function getNormalizedFileName(fileName: string): string {
		const baseName = fileName.split(".")[0];
		// Replace non-alphanumeric characters with underscores
		let varName = baseName.replace(/[^a-zA-Z0-9_]/g, "_");

		// If filename starts with digit, prepend underscore
		if (/^\d/.test(varName)) {
			varName = `_${varName}`;
		}
		return varName;
	}

	if (!(file.mimeType in DATA_FILE_UTIL_MAP)) {
		return undefined;
	}

	const varName = getNormalizedFileName(file.name);
	const loaderCode = DATA_FILE_UTIL_MAP[
		file.mimeType
	].loaderCodeTemplate.replace("{filename}", file.name);

	return `
${DATA_FILE_HELPER_LIB}

# Load the dataframe.
${varName} = ${loaderCode}

# Use \`explore_df\` to guide my analysis.
explore_df(${varName})
`;
}

/**
 * Exported processor instances
 */
export const requestProcessor = new CodeExecutionRequestProcessor();
export const responseProcessor = new CodeExecutionResponseProcessor();

/**
 * Export utility functions for testing
 */
export {
	DATA_FILE_HELPER_LIB,
	DATA_FILE_UTIL_MAP,
	extractAndReplaceInlineFiles,
	getDataFilePreprocessingCode,
	getOrSetExecutionId,
	hasCodeExecutor,
	postProcessCodeExecutionResult,
};
