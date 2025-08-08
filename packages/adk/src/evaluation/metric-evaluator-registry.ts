import type { Evaluator } from "./evaluator";
import { ResponseEvaluator } from "./response-evaluator";
import { TrajectoryEvaluator } from "./trajectory-evaluator";
import { SafetyEvaluatorV1 } from "./safety-evaluator";
import { FinalResponseMatchV2Evaluator } from "./final-response-match-v2";
import {
	type EvalMetric,
	type MetricInfo,
	PrebuiltMetrics,
} from "./eval-metrics";

export type EvaluatorConstructor = {
	new (metric: EvalMetric): Evaluator;
	getMetricInfo(metric?: PrebuiltMetrics): MetricInfo;
};

export class MetricEvaluatorRegistry {
	private readonly registry = new Map<
		string,
		{
			evaluator: EvaluatorConstructor;
			metricInfo: MetricInfo;
		}
	>();

	getEvaluator(evalMetric: EvalMetric): Evaluator {
		const entry = this.registry.get(evalMetric.metricName);
		if (!entry) {
			throw new Error(`${evalMetric.metricName} not found in registry.`);
		}
		return new entry.evaluator(evalMetric);
	}

	registerEvaluator(
		metricInfo: MetricInfo,
		evaluator: EvaluatorConstructor,
	): void {
		const metricName = metricInfo.metricName;

		if (this.registry.has(metricName)) {
			console.info(
				`Updating Evaluator class for ${metricName} from ${
					this.registry.get(metricName)?.evaluator.name
				} to ${evaluator.name}`,
			);
		}

		this.registry.set(metricName, {
			evaluator,
			metricInfo: { ...metricInfo },
		});
	}

	getRegisteredMetrics(): MetricInfo[] {
		return Array.from(this.registry.values()).map((entry) => ({
			...entry.metricInfo,
		}));
	}
}

function getDefaultMetricEvaluatorRegistry(): MetricEvaluatorRegistry {
	const registry = new MetricEvaluatorRegistry();

	registry.registerEvaluator(
		TrajectoryEvaluator.getMetricInfo(),
		TrajectoryEvaluator as EvaluatorConstructor,
	);

	registry.registerEvaluator(
		ResponseEvaluator.getMetricInfo(PrebuiltMetrics.RESPONSE_EVALUATION_SCORE),
		ResponseEvaluator as EvaluatorConstructor,
	);

	registry.registerEvaluator(
		ResponseEvaluator.getMetricInfo(PrebuiltMetrics.RESPONSE_MATCH_SCORE),
		ResponseEvaluator as EvaluatorConstructor,
	);

	registry.registerEvaluator(
		SafetyEvaluatorV1.getMetricInfo(),
		SafetyEvaluatorV1 as EvaluatorConstructor,
	);

	registry.registerEvaluator(
		FinalResponseMatchV2Evaluator.getMetricInfo(),
		FinalResponseMatchV2Evaluator as EvaluatorConstructor,
	);

	return registry;
}

export const DEFAULT_METRIC_EVALUATOR_REGISTRY =
	getDefaultMetricEvaluatorRegistry();
