import type { Invocation } from "./eval-case";
import type { EvalMetric, MetricInfo } from "./eval-metrics";

export enum EvalStatus {
	PASSED = 1,
	FAILED = 2,
	NOT_EVALUATED = 3,
}

export interface PerInvocationResult {
	actualInvocation: Invocation;
	expectedInvocation: Invocation;
	score?: number;
	evalStatus: EvalStatus;
}

export interface EvaluationResult {
	overallScore?: number;

	overallEvalStatus: EvalStatus;

	perInvocationResults: PerInvocationResult[];
}

export abstract class Evaluator {
	constructor(protected readonly metric: EvalMetric) {}

	abstract evaluateInvocations(
		actualInvocations: Invocation[],
		expectedInvocations: Invocation[],
	): Promise<EvaluationResult>;

	static getMetricInfo(metricName?: string): MetricInfo {
		throw new Error("getMetricInfo() must be implemented by subclass");
	}
}
