import type { Invocation } from "./eval-case";
import type { PrebuiltMetrics } from "./eval-metrics";
import {
	type EvaluationResult,
	EvalStatus,
	type PerInvocationResult,
} from "./evaluator";
import type { Content } from "@google/genai";

const ERROR_MESSAGE_SUFFIX = `
You should specify both project id and location. This metric uses Vertex Gen AI
Eval SDK, and it requires google cloud credentials.

If using an .env file add the values there, or explicitly set in the code using
the template below:

process.env.GOOGLE_CLOUD_LOCATION = <LOCATION>
process.env.GOOGLE_CLOUD_PROJECT = <PROJECT ID>
`;

export interface VertexAiEvalFacadeConfig {
	threshold: number;
	metricName: PrebuiltMetrics;
}

export class VertexAiEvalFacade {
	private threshold: number;
	private metricName: PrebuiltMetrics;

	constructor(config: VertexAiEvalFacadeConfig) {
		this.threshold = config.threshold;
		this.metricName = config.metricName;
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

			const prompt = this._getText(expected.userContent);
			const reference = this._getText(expected.finalResponse);
			const response = this._getText(actual.finalResponse);

			const evalCase = {
				prompt,
				reference,
				response,
			};

			try {
				const evalCaseResult = await VertexAiEvalFacade._performEval(
					[evalCase],
					[this.metricName],
				);

				const score = this._getScore(evalCaseResult);

				perInvocationResults.push({
					actualInvocation: actual,
					expectedInvocation: expected,
					score,
					evalStatus: this._getEvalStatus(score),
				});

				if (score !== null && score !== undefined) {
					totalScore += score;
					numInvocations++;
				}
			} catch (error) {
				console.error("Error evaluating invocation:", error);
				perInvocationResults.push({
					actualInvocation: actual,
					expectedInvocation: expected,
					score: undefined,
					evalStatus: EvalStatus.NOT_EVALUATED,
				});
			}
		}

		if (perInvocationResults.length > 0) {
			const overallScore =
				numInvocations > 0 ? totalScore / numInvocations : undefined;
			return {
				overallScore,
				overallEvalStatus: this._getEvalStatus(overallScore),
				perInvocationResults,
			};
		}

		return {
			overallScore: undefined,
			overallEvalStatus: EvalStatus.NOT_EVALUATED,
			perInvocationResults: [],
		};
	}

	private _getText(content?: Content): string {
		if (content?.parts) {
			return content.parts
				.map((p) => p.text || "")
				.filter((text) => text.length > 0)
				.join("\n");
		}
		return "";
	}

	private _getScore(evalResult: any): number | undefined {
		if (
			evalResult?.summaryMetrics?.[0]?.meanScore !== undefined &&
			typeof evalResult.summaryMetrics[0].meanScore === "number" &&
			!Number.isNaN(evalResult.summaryMetrics[0].meanScore)
		) {
			return evalResult.summaryMetrics[0].meanScore;
		}
		return undefined;
	}

	private _getEvalStatus(score?: number): EvalStatus {
		if (score !== null && score !== undefined) {
			return score >= this.threshold ? EvalStatus.PASSED : EvalStatus.FAILED;
		}
		return EvalStatus.NOT_EVALUATED;
	}

	private static async _performEval(
		dataset: Array<{ prompt: string; reference: string; response: string }>,
		metrics: PrebuiltMetrics[],
	): Promise<any> {
		const projectId = process.env.GOOGLE_CLOUD_PROJECT;
		const location = process.env.GOOGLE_CLOUD_LOCATION;

		if (!projectId) {
			throw new Error(`Missing project id. ${ERROR_MESSAGE_SUFFIX}`);
		}
		if (!location) {
			throw new Error(`Missing location. ${ERROR_MESSAGE_SUFFIX}`);
		}

		console.warn(
			"Vertex AI evaluation is not fully implemented. Using mock response.",
		);

		return {
			summaryMetrics: [
				{
					meanScore: Math.random() * 0.5 + 0.5,
				},
			],
		};
	}
}
