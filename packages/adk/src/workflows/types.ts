import type { z } from "zod";

export type WorkflowStatus =
	| "pending"
	| "running"
	| "suspended"
	| "success"
	| "failed";

export type StepStatus =
	| "pending"
	| "running"
	| "suspended"
	| "success"
	| "failed";

export interface StepSuccess<TInput, TOutput> {
	status: "success";
	output: TOutput;
	payload: TInput;
	startedAt: number;
	endedAt: number;
}

export interface StepSuspended<TInput, TSuspend> {
	status: "suspended";
	payload: TInput;
	suspendPayload?: TSuspend;
	startedAt: number;
	suspendedAt: number;
}

export interface StepResumed<TInput, TOutput, TResume> {
	status: "success";
	output: TOutput;
	payload: TInput;
	resumePayload?: TResume;
	startedAt: number;
	endedAt: number;
	suspendedAt?: number;
	resumedAt?: number;
}

export interface StepFailed<TInput> {
	status: "failed";
	error: Error;
	payload: TInput;
	startedAt: number;
	endedAt: number;
}

export type StepResult<TInput, TOutput, TResume, TSuspend> =
	| StepSuccess<TInput, TOutput>
	| StepSuspended<TInput, TSuspend>
	| StepResumed<TInput, TOutput, TResume>
	| StepFailed<TInput>;

export interface WorkflowResultSuccess<TOutput, TStepResults> {
	status: "success";
	result: TOutput;
	steps: TStepResults;
}

export interface WorkflowResultSuspended<TStepResults> {
	status: "suspended";
	steps: TStepResults;
	suspendedStep: string;
	suspendPayload?: unknown;
}

export interface WorkflowResultFailed<TStepResults> {
	status: "failed";
	error: Error;
	steps: TStepResults;
}

export type WorkflowResult<TOutput, TStepResults> =
	| WorkflowResultSuccess<TOutput, TStepResults>
	| WorkflowResultSuspended<TStepResults>
	| WorkflowResultFailed<TStepResults>;

export type SuspendFunction<TSuspend = unknown> = (payload?: TSuspend) => never;

export interface ExecuteContext<
	TInput = unknown,
	TResume = unknown,
	TSuspend = unknown,
> {
	runId: string;
	workflowId: string;
	inputData: TInput;
	resumeData?: TResume;
	suspend: SuspendFunction<TSuspend>;
	getStepResult: <T>(stepId: string) => T | undefined;
}

export type ExecuteFunction<
	TInput = unknown,
	TOutput = unknown,
	TResume = unknown,
	TSuspend = unknown,
> = (context: ExecuteContext<TInput, TResume, TSuspend>) => Promise<TOutput>;

export interface StepDefinition<
	TId extends string = string,
	TInput = unknown,
	TOutput = unknown,
	TResume = unknown,
	TSuspend = unknown,
> {
	id: TId;
	description?: string;
	inputSchema?: z.ZodType<TInput>;
	outputSchema?: z.ZodType<TOutput>;
	resumeSchema?: z.ZodType<TResume>;
	suspendSchema?: z.ZodType<TSuspend>;
	execute: ExecuteFunction<TInput, TOutput, TResume, TSuspend>;
}

export interface Step<
	TId extends string = string,
	TInput = unknown,
	TOutput = unknown,
	TResume = unknown,
	TSuspend = unknown,
> {
	id: TId;
	description?: string;
	inputSchema?: z.ZodType<TInput>;
	outputSchema?: z.ZodType<TOutput>;
	resumeSchema?: z.ZodType<TResume>;
	suspendSchema?: z.ZodType<TSuspend>;
	execute: ExecuteFunction<TInput, TOutput, TResume, TSuspend>;
}

export interface WorkflowConfig<
	TId extends string = string,
	TInput = unknown,
	TOutput = unknown,
> {
	id: TId;
	description?: string;
	inputSchema?: z.ZodType<TInput>;
	outputSchema?: z.ZodType<TOutput>;
}

export interface WorkflowSnapshot {
	runId: string;
	workflowId: string;
	status: WorkflowStatus;
	input: unknown;
	stepResults: Record<string, StepResult<unknown, unknown, unknown, unknown>>;
	suspendedStepId?: string;
	suspendPayload?: unknown;
	createdAt: number;
	updatedAt: number;
}
