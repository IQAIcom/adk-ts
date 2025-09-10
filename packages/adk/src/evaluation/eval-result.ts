import type { Session } from "../sessions/session";
import {
	EvalMetric,
	type EvalMetricResult,
	type EvalMetricResultPerInvocation,
} from "./eval-metrics";
import type { EvalStatus } from "./evaluator";

export interface EvalCaseResult {
	evalSetId: string;

	evalId: string;

	finalEvalStatus: EvalStatus;

	overallEvalMetricResults: EvalMetricResult[];

	evalMetricResultPerInvocation: EvalMetricResultPerInvocation[];

	sessionId: string;

	sessionDetails?: Session;

	userId?: string;
}

export interface EvalSetResult {
	evalSetResultId: string;
	evalSetResultName?: string;
	evalSetId: string;
	evalCaseResults: EvalCaseResult[];
	creationTimestamp: number;
}

export class EvalResult implements EvalSetResult {
	evalSetResultId: string;
	evalSetResultName?: string;
	evalSetId: string;
	evalCaseResults: EvalCaseResult[];
	creationTimestamp: number;

	constructor(init: Partial<EvalSetResult>) {
		this.evalSetResultId = init.evalSetResultId || "";
		this.evalSetResultName = init.evalSetResultName;
		this.evalSetId = init.evalSetId || "";
		this.evalCaseResults = init.evalCaseResults || [];
		this.creationTimestamp = init.creationTimestamp || Date.now() / 1000;
	}
}
