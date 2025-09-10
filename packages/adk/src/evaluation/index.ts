// Core evaluator primitives
export {
	EvalStatus,
	type PerInvocationResult,
	type EvaluationResult,
	Evaluator,
} from "./evaluator";

// Metric definitions & configs
export {
	PrebuiltMetrics,
	type EvalMetric,
	type EvalMetricResult,
	type EvalMetricResultPerInvocation,
	type JudgeModelOptions,
	type Interval,
	type MetricInfo,
	type MetricValueInfo,
	type EvaluateConfig,
} from "./eval-metrics";

// Data model for evaluation cases & sets
export type {
	IntermediateData,
	Invocation,
	EvalCase,
	SessionInput,
} from "./eval-case";
export type { EvalSet } from "./eval-set";

// Evaluation results
export { EvalResult } from "./eval-result";
export type { EvalCaseResult, EvalSetResult } from "./eval-result";

// High-level agent evaluation runner
export { AgentEvaluator } from "./agent-evaluator";

// Optional service abstraction (kept public if users stream / compose evaluations)
export { LocalEvalService } from "./local-eval-service";

// Prebuilt evaluators (public)
export { TrajectoryEvaluator } from "./trajectory-evaluator";
export { RougeEvaluator } from "./final-response-match-v1";
export { FinalResponseMatchV2Evaluator } from "./final-response-match-v2";
export { SafetyEvaluatorV1 } from "./safety-evaluator";
