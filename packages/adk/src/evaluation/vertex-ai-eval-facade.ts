import type { Invocation } from "./eval-case";
import { PrebuiltMetrics } from "./eval-metrics";
import {
	type EvaluationResult,
	EvalStatus,
	type PerInvocationResult,
} from "./evaluator";
import type { Content } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";

const ERROR_MESSAGE_SUFFIX = `
You should specify both project id and location. This metric uses Vertex Gen AI
Eval SDK, and it requires google cloud credentials.

If using an .env file add the values there, or explicitly set in the code using
the template below:

process.env.GOOGLE_CLOUD_LOCATION = <LOCATION>
process.env.GOOGLE_CLOUD_PROJECT = <PROJECT ID>
`;

const VERTEX_AI_EVAL_SCOPES = [
	"https://www.googleapis.com/auth/cloud-platform",
];

export interface VertexAiEvalFacadeConfig {
	threshold: number;
	metricName: PrebuiltMetrics;
}

interface EvalResult {
	summaryMetrics: Array<{ meanScore: number | undefined }>;
}

const VERTEX_AI_METRIC_KEYS = {
	[PrebuiltMetrics.RESPONSE_EVALUATION_SCORE]: {
		inputKey: "coherence_input",
		resultKey: "coherenceResult",
	},
	[PrebuiltMetrics.SAFETY_V1]: {
		inputKey: "safety_input",
		resultKey: "safetyResult",
	},
} as const;

function getMetricKeys(metric: PrebuiltMetrics): {
	inputKey: string;
	resultKey: string;
} {
	const keys =
		VERTEX_AI_METRIC_KEYS[metric as keyof typeof VERTEX_AI_METRIC_KEYS];
	if (!keys) {
		throw new Error(
			`Metric "${metric}" is not supported by Vertex AI evaluation.`,
		);
	}
	return keys;
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
					evalCase,
					this.metricName,
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

	private _getScore(evalResult: EvalResult): number | undefined {
		const meanScore = evalResult?.summaryMetrics?.[0]?.meanScore;
		if (typeof meanScore === "number" && !Number.isNaN(meanScore)) {
			return meanScore;
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
		evalCase: { prompt: string; reference: string; response: string },
		metric: PrebuiltMetrics,
	): Promise<EvalResult> {
		const projectId = process.env.GOOGLE_CLOUD_PROJECT;
		const location = process.env.GOOGLE_CLOUD_LOCATION;

		if (!projectId) {
			throw new Error(`Missing project id. ${ERROR_MESSAGE_SUFFIX}`);
		}
		if (!location) {
			throw new Error(`Missing location. ${ERROR_MESSAGE_SUFFIX}`);
		}

		const auth = new GoogleAuth({ scopes: VERTEX_AI_EVAL_SCOPES });
		const accessToken = await auth.getAccessToken();

		if (!accessToken) {
			throw new Error(
				"Failed to obtain Google Cloud access token. Ensure Application Default Credentials are configured (e.g. run 'gcloud auth application-default login').",
			);
		}

		const { inputKey, resultKey } = getMetricKeys(metric);

		const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}:evaluateInstances`;

		const instance: Record<string, string> = {
			prediction: evalCase.response,
		};
		if (metric === PrebuiltMetrics.RESPONSE_EVALUATION_SCORE) {
			instance.reference = evalCase.reference;
		}

		const requestBody = {
			[inputKey]: {
				metric_spec: {},
				instance,
			},
		};

		let responseData: any;
		try {
			const response = await axios.post(url, requestBody, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});
			responseData = response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				const detail = error.response?.data
					? JSON.stringify(error.response.data)
					: "";
				throw new Error(
					`Vertex AI evaluation API request failed: ${error.message}${detail ? ` — ${detail}` : ""}`,
				);
			}
			throw error;
		}

		const score = responseData?.[resultKey]?.score;

		return {
			summaryMetrics: [
				{
					meanScore: typeof score === "number" ? score : undefined,
				},
			],
		};
	}
}
