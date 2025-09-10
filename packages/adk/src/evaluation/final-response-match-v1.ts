import type { Content } from "@google/genai";
import type { Invocation } from "./eval-case";
import {
	type EvalMetric,
	type MetricInfo,
	PrebuiltMetrics,
} from "./eval-metrics";
import {
	EvalStatus,
	type EvaluationResult,
	Evaluator,
	type PerInvocationResult,
} from "./evaluator";

export class RougeEvaluator extends Evaluator {
	private evalMetric: EvalMetric;

	constructor(evalMetric: EvalMetric) {
		super(evalMetric);
		this.evalMetric = evalMetric;
	}

	static override getMetricInfo(): MetricInfo {
		return {
			metricName: PrebuiltMetrics.RESPONSE_MATCH_SCORE,
			description:
				"This metric evaluates if the agent's final response matches a " +
				"golden/expected final response using Rouge_1 metric. Value range " +
				"for this metric is [0,1], with values closer to 1 more desirable.",
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
		let totalScore = 0.0;
		let numInvocations = 0;
		const perInvocationResults: PerInvocationResult[] = [];

		for (let i = 0; i < actualInvocations.length; i++) {
			const actual = actualInvocations[i];
			const expected = expectedInvocations[i];
			const reference = getTextFromContent(expected.finalResponse);
			const response = getTextFromContent(actual.finalResponse);
			const rouge1Scores = await calculateRouge1Scores(response, reference);
			const score = rouge1Scores.fmeasure;

			perInvocationResults.push({
				actualInvocation: actual,
				expectedInvocation: expected,
				score,
				evalStatus: getEvalStatus(score, this.evalMetric.threshold),
			});

			totalScore += score;
			numInvocations++;
		}

		if (perInvocationResults.length > 0) {
			const overallScore = totalScore / numInvocations;
			return {
				overallScore,
				overallEvalStatus: getEvalStatus(
					overallScore,
					this.evalMetric.threshold,
				),
				perInvocationResults,
			};
		}

		return {
			overallEvalStatus: EvalStatus.NOT_EVALUATED,
			perInvocationResults: [],
		};
	}
}

interface RougeScores {
	precision: number;
	recall: number;
	fmeasure: number;
}

function getTextFromContent(content?: Content): string {
	if (content?.parts) {
		return content.parts
			.map((part) => part.text)
			.filter(Boolean)
			.join("\n");
	}
	return "";
}

function getEvalStatus(score: number, threshold: number): EvalStatus {
	return score >= threshold ? EvalStatus.PASSED : EvalStatus.FAILED;
}

function calculateRouge1Scores(
	response: string,
	reference: string,
): RougeScores {
	if (!response.trim() || !reference.trim()) {
		return { precision: 0, recall: 0, fmeasure: 0 };
	}

	const responseTokens = tokenizeText(response);
	const referenceTokens = tokenizeText(reference);

	const responseUnigrams = new Set(responseTokens);
	const referenceUnigrams = new Set(referenceTokens);

	const commonUnigrams = new Set(
		[...responseUnigrams].filter((token) => referenceUnigrams.has(token)),
	);

	const precision =
		responseUnigrams.size > 0 ? commonUnigrams.size / responseUnigrams.size : 0;

	const recall =
		referenceUnigrams.size > 0
			? commonUnigrams.size / referenceUnigrams.size
			: 0;

	const fmeasure =
		precision + recall > 0
			? (2 * precision * recall) / (precision + recall)
			: 0;

	return { precision, recall, fmeasure };
}

function tokenizeText(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((token) => token.length > 0);
}
