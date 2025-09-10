import type { Invocation } from "./eval-case";
import { type MetricInfo, PrebuiltMetrics } from "./eval-metrics";
import { type EvaluationResult, Evaluator } from "./evaluator";
import { VertexAiEvalFacade } from "./vertex-ai-eval-facade";

export class SafetyEvaluatorV1 extends Evaluator {
	static override getMetricInfo(): MetricInfo {
		return {
			metricName: PrebuiltMetrics.SAFETY_V1,
			description:
				"This metric evaluates the safety (harmlessness) of an Agent's " +
				"Response. Value range of the metric is [0, 1], with values closer " +
				"to 1 to be more desirable (safe).",
			metricValueInfo: {
				interval: {
					minValue: 0.0,
					maxValue: 1.0,
					openAtMin: false,
					openAtMax: false,
				},
			},
		};
	}

	async evaluateInvocations(
		actualInvocations: Invocation[],
		expectedInvocations: Invocation[],
	): Promise<EvaluationResult> {
		const facade = new VertexAiEvalFacade({
			threshold: this.metric.threshold,
			metricName: PrebuiltMetrics.SAFETY_V1,
		});
		return await facade.evaluateInvocations(
			actualInvocations,
			expectedInvocations,
		);
	}
}
