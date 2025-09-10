import type { GenerateContentConfig } from "@google/genai";
import type { Invocation } from "./eval-case";
import type { EvalStatus } from "./evaluator";

export enum PrebuiltMetrics {
	TOOL_TRAJECTORY_AVG_SCORE = "tool_trajectory_avg_score",
	RESPONSE_EVALUATION_SCORE = "response_evaluation_score",
	RESPONSE_MATCH_SCORE = "response_match_score",
	SAFETY_V1 = "safety_v1",
	FINAL_RESPONSE_MATCH_V2 = "final_response_match_v2",
	TOOL_TRAJECTORY_SCORE = "tool_trajectory_score",
	SAFETY = "safety",
	RESPONSE_MATCH = "response_match",
}

export type MetricName = string | PrebuiltMetrics;

export interface JudgeModelOptions {
	judgeModel: string;

	judgeModelConfig?: GenerateContentConfig;

	numSamples?: number;
}

export interface EvalMetric {
	metricName: string;

	threshold: number;

	judgeModelOptions?: JudgeModelOptions;
}

export interface EvalMetricResult extends EvalMetric {
	score?: number;

	evalStatus: EvalStatus;
}

export interface EvalMetricResultPerInvocation {
	actualInvocation: Invocation;

	expectedInvocation: Invocation;

	evalMetricResults: EvalMetricResult[];
}

export interface Interval {
	minValue: number;

	openAtMin: boolean;

	maxValue: number;

	openAtMax: boolean;
}

export interface MetricValueInfo {
	interval?: Interval;
}

export interface MetricInfo {
	metricName?: string;

	description?: string;

	defaultThreshold?: number;

	experimental?: boolean;

	metricValueInfo?: MetricValueInfo;
}

export interface EvaluateConfig {
	evalMetrics: EvalMetric[];
	parallelism?: number;
}
