import type { z } from "zod";
import type {
	Step,
	WorkflowConfig,
	WorkflowResult,
	WorkflowSnapshot,
	StepResult,
	ExecuteContext,
} from "./types";
import type { SnapshotStore } from "./snapshot-store";

class SuspendError extends Error {
	constructor(public readonly suspendPayload?: unknown) {
		super("Workflow suspended");
		this.name = "SuspendError";
	}
}

function generateRunId(): string {
	return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class Run<TInput = unknown, TOutput = unknown> {
	public readonly runId: string;
	private status: "pending" | "running" | "suspended" | "success" | "failed" =
		"pending";
	private stepResults: Record<
		string,
		StepResult<unknown, unknown, unknown, unknown>
	> = {};
	private suspendedStepId?: string;
	private suspendPayload?: unknown;
	private result?: TOutput;
	private input?: TInput;
	private createdAt: number;
	private updatedAt: number;

	constructor(
		private workflow: Workflow<string, TInput, TOutput>,
		runId?: string,
	) {
		this.runId = runId ?? generateRunId();
		this.createdAt = Date.now();
		this.updatedAt = this.createdAt;
	}

	async start(
		input: TInput,
	): Promise<WorkflowResult<TOutput, typeof this.stepResults>> {
		if (this.status !== "pending") {
			throw new Error(`Cannot start run in status: ${this.status}`);
		}
		this.input = input;
		this.status = "running";
		return this.executeSteps(0);
	}

	async resume<TResume = unknown>(options: {
		resumeData: TResume;
		step?: string;
	}): Promise<WorkflowResult<TOutput, typeof this.stepResults>> {
		if (this.status !== "suspended") {
			throw new Error(`Cannot resume run in status: ${this.status}`);
		}

		const stepId = options.step ?? this.suspendedStepId;
		if (!stepId) {
			throw new Error("No suspended step to resume");
		}

		const stepIndex = this.workflow.stepGraph.findIndex((s) => s.id === stepId);
		if (stepIndex === -1) {
			throw new Error(`Step not found: ${stepId}`);
		}

		this.status = "running";
		return this.executeSteps(stepIndex, options.resumeData);
	}

	private async executeSteps(
		startIndex: number,
		resumeData?: unknown,
	): Promise<WorkflowResult<TOutput, typeof this.stepResults>> {
		const steps = this.workflow.stepGraph;
		let isFirstResumedStep = resumeData !== undefined;

		for (let i = startIndex; i < steps.length; i++) {
			const step = steps[i];
			const startedAt = Date.now();

			const context: ExecuteContext = {
				runId: this.runId,
				workflowId: this.workflow.id,
				inputData: this.input,
				resumeData: isFirstResumedStep ? resumeData : undefined,
				suspend: (payload?: unknown): never => {
					throw new SuspendError(payload);
				},
				getStepResult: <T>(stepId: string): T | undefined => {
					const result = this.stepResults[stepId];
					if (result?.status === "success") {
						return result.output as T;
					}
					return undefined;
				},
			};

			try {
				const output = await step.execute(context);
				const endedAt = Date.now();

				const previousResult = this.stepResults[step.id];
				if (previousResult?.status === "suspended") {
					this.stepResults[step.id] = {
						status: "success",
						output,
						payload: this.input,
						resumePayload: resumeData,
						startedAt: previousResult.startedAt,
						endedAt,
						suspendedAt: previousResult.suspendedAt,
						resumedAt: startedAt,
					};
				} else {
					this.stepResults[step.id] = {
						status: "success",
						output,
						payload: this.input,
						startedAt,
						endedAt,
					};
				}

				isFirstResumedStep = false;
			} catch (err) {
				if (err instanceof SuspendError) {
					this.status = "suspended";
					this.suspendedStepId = step.id;
					this.suspendPayload = err.suspendPayload;

					this.stepResults[step.id] = {
						status: "suspended",
						payload: this.input,
						suspendPayload: err.suspendPayload,
						startedAt,
						suspendedAt: Date.now(),
					};

					await this.saveSnapshot();

					return {
						status: "suspended",
						steps: this.stepResults,
						suspendedStep: step.id,
						suspendPayload: err.suspendPayload,
					};
				}

				this.status = "failed";
				const error = err instanceof Error ? err : new Error(String(err));

				this.stepResults[step.id] = {
					status: "failed",
					error,
					payload: this.input,
					startedAt,
					endedAt: Date.now(),
				};

				return {
					status: "failed",
					error,
					steps: this.stepResults,
				};
			}
		}

		this.status = "success";
		const lastStep = steps[steps.length - 1];
		const lastResult = this.stepResults[lastStep.id];
		this.result =
			lastResult?.status === "success"
				? (lastResult.output as TOutput)
				: undefined;

		await this.workflow.snapshotStore?.delete(this.workflow.id, this.runId);

		return {
			status: "success",
			result: this.result as TOutput,
			steps: this.stepResults,
		};
	}

	private async saveSnapshot(): Promise<void> {
		if (!this.workflow.snapshotStore) return;

		const snapshot: WorkflowSnapshot = {
			runId: this.runId,
			workflowId: this.workflow.id,
			status: this.status,
			input: this.input,
			stepResults: this.stepResults,
			suspendedStepId: this.suspendedStepId,
			suspendPayload: this.suspendPayload,
			createdAt: this.createdAt,
			updatedAt: Date.now(),
		};

		await this.workflow.snapshotStore.save(snapshot);
	}

	getStatus() {
		return this.status;
	}

	getStepResults() {
		return this.stepResults;
	}

	getSuspendedStepId() {
		return this.suspendedStepId;
	}

	static async fromSnapshot<TInput, TOutput>(
		workflow: Workflow<string, TInput, TOutput>,
		snapshot: WorkflowSnapshot,
	): Promise<Run<TInput, TOutput>> {
		const run = new Run<TInput, TOutput>(workflow, snapshot.runId);
		run.status = snapshot.status as Run<TInput, TOutput>["status"];
		run.input = snapshot.input as TInput;
		run.stepResults = snapshot.stepResults;
		run.suspendedStepId = snapshot.suspendedStepId;
		run.suspendPayload = snapshot.suspendPayload;
		run.createdAt = snapshot.createdAt;
		run.updatedAt = snapshot.updatedAt;
		return run;
	}
}

export class Workflow<
	TId extends string = string,
	TInput = unknown,
	TOutput = unknown,
> {
	public readonly id: TId;
	public readonly description?: string;
	public readonly inputSchema?: z.ZodType<TInput>;
	public readonly outputSchema?: z.ZodType<TOutput>;
	public stepGraph: Step[] = [];
	public snapshotStore?: SnapshotStore;
	private committed = false;

	constructor(config: WorkflowConfig<TId, TInput, TOutput>) {
		this.id = config.id;
		this.description = config.description;
		this.inputSchema = config.inputSchema;
		this.outputSchema = config.outputSchema;
	}

	step<TStepOutput>(step: Step<string, unknown, TStepOutput>): this {
		if (this.committed) {
			throw new Error("Cannot add steps to a committed workflow");
		}
		this.stepGraph.push(step);
		return this;
	}

	withSnapshotStore(store: SnapshotStore): this {
		this.snapshotStore = store;
		return this;
	}

	commit(): this {
		if (this.stepGraph.length === 0) {
			throw new Error("Workflow must have at least one step");
		}
		this.committed = true;
		return this;
	}

	createRun(runId?: string): Run<TInput, TOutput> {
		if (!this.committed) {
			throw new Error("Workflow must be committed before creating a run");
		}
		return new Run<TInput, TOutput>(this, runId);
	}

	async resumeRun(runId: string): Promise<Run<TInput, TOutput> | null> {
		if (!this.snapshotStore) {
			throw new Error("Cannot resume run without a snapshot store configured");
		}

		const snapshot = await this.snapshotStore.load(this.id, runId);
		if (!snapshot) {
			return null;
		}

		return Run.fromSnapshot<TInput, TOutput>(this, snapshot);
	}

	async listRuns(): Promise<WorkflowSnapshot[]> {
		if (!this.snapshotStore) {
			return [];
		}
		return this.snapshotStore.list(this.id);
	}
}

export function createWorkflow<
	TId extends string,
	TInput = unknown,
	TOutput = unknown,
>(
	config: WorkflowConfig<TId, TInput, TOutput>,
): Workflow<TId, TInput, TOutput> {
	return new Workflow(config);
}
