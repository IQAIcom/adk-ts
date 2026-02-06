import type { Step, StepDefinition, ExecuteFunction } from "./types";

export function createStep<
	TId extends string,
	TInput,
	TOutput,
	TResume = unknown,
	TSuspend = unknown,
>(
	definition: StepDefinition<TId, TInput, TOutput, TResume, TSuspend>,
): Step<TId, TInput, TOutput, TResume, TSuspend> {
	return {
		id: definition.id,
		description: definition.description,
		inputSchema: definition.inputSchema,
		outputSchema: definition.outputSchema,
		resumeSchema: definition.resumeSchema,
		suspendSchema: definition.suspendSchema,
		execute: definition.execute,
	};
}

export type { Step, StepDefinition, ExecuteFunction };
