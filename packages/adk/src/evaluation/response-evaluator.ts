import {
	EvalStatus,
	type EvaluationResult,
	Evaluator,
	type PerInvocationResult,
} from "./evaluator";
import {
	type EvalMetric,
	type MetricInfo,
	PrebuiltMetrics,
} from "./eval-metrics";
import type { Invocation } from "./eval-case";
import type { Content } from "@google/genai";
import { VertexAiEvalFacade } from "./vertex-ai-eval-facade";

export class ResponseEvaluator extends Evaluator {
	private metricName: PrebuiltMetrics;
	private threshold: number;

	constructor(evalMetric: EvalMetric) {
		super(evalMetric);

		if (evalMetric.metricName === PrebuiltMetrics.RESPONSE_EVALUATION_SCORE) {
			this.metricName = PrebuiltMetrics.RESPONSE_EVALUATION_SCORE;
		} else if (evalMetric.metricName === PrebuiltMetrics.RESPONSE_MATCH_SCORE) {
			this.metricName = PrebuiltMetrics.RESPONSE_MATCH_SCORE;
		} else {
			throw new Error(`Metric ${evalMetric.metricName} is not supported.`);
		}

		this.threshold = evalMetric.threshold;
	}

	static getMetricInfo(metricName: PrebuiltMetrics): MetricInfo {
		if (metricName === PrebuiltMetrics.RESPONSE_EVALUATION_SCORE) {
			return {
				metricName: PrebuiltMetrics.RESPONSE_EVALUATION_SCORE,
				description:
					"This metric evaluates how coherent agent's response was. Value range of this metric is [1,5], with values closer to 5 more desirable.",
				metricValueInfo: {
					interval: {
						minValue: 1.0,
						maxValue: 5.0,
						openAtMin: false,
						openAtMax: false,
					},
				},
			};
		}
		if (metricName === PrebuiltMetrics.RESPONSE_MATCH_SCORE) {
			return {
				metricName: PrebuiltMetrics.RESPONSE_MATCH_SCORE,
				description:
					"This metric evaluates if agent's final response matches a golden/expected final response using Rouge_1 metric. Value range for this metric is [0,1], with values closer to 1 more desirable.",
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
		throw new Error(`Metric ${metricName} is not supported.`);
	}

	async evaluateInvocations(
		actualInvocations: Invocation[],
		expectedInvocations: Invocation[],
	): Promise<EvaluationResult> {
		if (this.metricName === PrebuiltMetrics.RESPONSE_MATCH_SCORE) {
			return this.evaluateRougeScore(actualInvocations, expectedInvocations);
		}

		const vertexAiFacade = new VertexAiEvalFacade({
			threshold: this.threshold,
			metricName: this.metricName,
		});

		return vertexAiFacade.evaluateInvocations(
			actualInvocations,
			expectedInvocations,
		);
	}

	private async evaluateRougeScore(
		actualInvocations: Invocation[],
		expectedInvocations: Invocation[],
	): Promise<EvaluationResult> {
		if (actualInvocations.length !== expectedInvocations.length) {
			throw new Error("Number of actual and expected invocations must match");
		}

		const results: PerInvocationResult[] = [];

		for (let i = 0; i < actualInvocations.length; i++) {
			const actual = actualInvocations[i];
			const expected = expectedInvocations[i];

			const result = await this.evaluateInvocation(actual, expected);
			results.push(result);
		}

		const scores = results
			.map((r) => r.score)
			.filter((s): s is number => s !== undefined);

		const overallScore =
			scores.length > 0
				? scores.reduce((a, b) => a + b, 0) / scores.length
				: undefined;

		const overallStatus =
			overallScore !== undefined && overallScore >= this.threshold
				? EvalStatus.PASSED
				: EvalStatus.FAILED;

		return {
			overallScore,
			overallEvalStatus: overallStatus,
			perInvocationResults: results,
		};
	}

	private async evaluateInvocation(
		actual: Invocation,
		expected: Invocation,
	): Promise<PerInvocationResult> {
		if (!actual.finalResponse || !expected.finalResponse) {
			return {
				actualInvocation: actual,
				expectedInvocation: expected,
				evalStatus: EvalStatus.NOT_EVALUATED,
			};
		}

		const score = await this.computeRougeScore(
			actual.finalResponse,
			expected.finalResponse,
		);

		return {
			actualInvocation: actual,
			expectedInvocation: expected,
			score,
			evalStatus:
				score >= this.threshold ? EvalStatus.PASSED : EvalStatus.FAILED,
		};
	}

	private async computeRougeScore(
		actual: Content,
		expected: Content,
	): Promise<number> {
		const actualText = this.extractText(actual);
		const expectedText = this.extractText(expected);

		if (!actualText.trim() || !expectedText.trim()) {
			return 0;
		}

		const actualTokens = this.tokenizeText(actualText);
		const expectedTokens = this.tokenizeText(expectedText);

		const actualUnigrams = new Set(actualTokens);
		const expectedUnigrams = new Set(expectedTokens);

		const commonUnigrams = new Set(
			[...actualUnigrams].filter((token) => expectedUnigrams.has(token)),
		);

		const precision =
			actualUnigrams.size > 0 ? commonUnigrams.size / actualUnigrams.size : 0;

		const recall =
			expectedUnigrams.size > 0
				? commonUnigrams.size / expectedUnigrams.size
				: 0;

		const fmeasure =
			precision + recall > 0
				? (2 * precision * recall) / (precision + recall)
				: 0;

		return fmeasure;
	}

	private extractText(content: Content): string {
		if (content?.parts) {
			return content.parts
				.map((p) => p.text || "")
				.filter((text) => text.length > 0)
				.join(" ");
		}
		return "";
	}

	private tokenizeText(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(/\s+/)
			.filter((token) => token.length > 0);
	}
}
