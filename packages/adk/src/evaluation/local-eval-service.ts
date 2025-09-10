import type { BaseAgent } from "@adk/agents";
import { AgentBuilder } from "@adk/agents";
import { BaseEvalService } from "./base-eval-service";
import type { EvalCase, Invocation } from "./eval-case";
import type { EvaluateConfig } from "./eval-metrics";
import type { EvalResult } from "./eval-result";
import type { EvalSet } from "./eval-set";
import { EvalStatus } from "./evaluator";
import { DEFAULT_METRIC_EVALUATOR_REGISTRY } from "./metric-evaluator-registry";

export class LocalEvalService extends BaseEvalService {
	private runner: any;

	constructor(
		private readonly agent: BaseAgent,
		private readonly parallelism: number = 4,
	) {
		super();
		this.initializeRunner();
	}

	private async initializeRunner() {
		if ("ask" in this.agent) {
			this.runner = this.agent;
		} else {
			try {
				const { runner } = await AgentBuilder.create("eval_agent")
					.withModel("gemini-2.5-flash")
					.withDescription("Agent for evaluation purposes")
					.build();

				this.runner = {
					ask: async (message: string) => {
						return await runner.ask(message);
					},
				};
			} catch (error) {
				console.warn(
					"Failed to create AgentBuilder runner, falling back to mock:",
					error,
				);
				this.runner = {
					ask: async (message: string) => {
						return `Mock response to: ${message}`;
					},
				};
			}
		}
	}

	async *performInference(request: {
		evalSetId: string;
		evalCases: EvalSet[];
	}): AsyncGenerator<Invocation[], void> {
		for (const evalSet of request.evalCases) {
			for (const evalCase of evalSet.evalCases) {
				// Generate expected invocations from provided finalResponse if present
				const expected: Invocation[] = [];
				for (const convo of evalCase.conversation) {
					if (convo.finalResponse) {
						expected.push({
							invocationId: `${evalCase.evalId}-expected-${expected.length}`,
							userContent: convo.userContent,
							finalResponse: convo.finalResponse,
							intermediateData: convo.intermediateData,
							creationTimestamp: convo.creationTimestamp,
						});
					}
				}
				const actual = await this.runInference(evalCase);
				yield [...expected, ...actual];
			}
		}
	}

	async *evaluate(request: {
		inferenceResults: Invocation[][];
		evaluateConfig: EvaluateConfig;
	}): AsyncGenerator<EvalResult, void> {
		const { inferenceResults, evaluateConfig } = request;

		const resultsByCase = new Map<string, Invocation[]>();
		for (const result of inferenceResults) {
			const invocationId = result[0].invocationId;
			if (!invocationId) continue;

			const lastHyphenIndex = invocationId.lastIndexOf("-");
			const evalId =
				lastHyphenIndex !== -1
					? invocationId.substring(0, lastHyphenIndex)
					: invocationId;

			const existing = resultsByCase.get(evalId) || [];
			resultsByCase.set(evalId, [...existing, ...result]);
		}

		for (const [evalId, results] of resultsByCase) {
			const evalResult: EvalResult = {
				evalSetResultId: `${evalId}-result-${Date.now()}`,
				evalSetId: evalId,
				evalCaseResults: [],
				creationTimestamp: Date.now(),
			};

			for (const evalMetric of evaluateConfig.evalMetrics) {
				const evaluator =
					DEFAULT_METRIC_EVALUATOR_REGISTRY.getEvaluator(evalMetric);

				const actual = results.filter(
					(r) => !r.invocationId?.includes("expected"),
				);
				const expected = results.filter((r) =>
					r.invocationId?.includes("expected"),
				);

				const result = await evaluator.evaluateInvocations(actual, expected);

				evalResult.evalCaseResults.push({
					evalSetId: evalId,
					evalId: evalId,
					finalEvalStatus: (result.perInvocationResults.length > 0
						? result.perInvocationResults[0].evalStatus
						: EvalStatus.NOT_EVALUATED) as EvalStatus,
					overallEvalMetricResults: [],
					sessionId: evalId,
					evalMetricResultPerInvocation: result.perInvocationResults.map(
						(r) => ({
							actualInvocation: r.actualInvocation,
							expectedInvocation: r.expectedInvocation,
							evalMetricResults: [
								{
									metricName: evalMetric.metricName,
									threshold: evalMetric.threshold,
									score: r.score,
									evalStatus: r.evalStatus,
								},
							],
						}),
					),
				});
			}

			yield evalResult;
		}
	}

	private async runInference(evalCase: EvalCase): Promise<Invocation[]> {
		const results: Invocation[] = [];

		if (!this.runner) {
			await this.initializeRunner();
		}

		if (evalCase.sessionInput) {
			try {
				if (this.runner.initializeSession) {
					await this.runner.initializeSession(evalCase.sessionInput);
				} else if (this.runner.setSessionState) {
					await this.runner.setSessionState(evalCase.sessionInput);
				} else {
					console.log(
						`Session input provided for ${evalCase.evalId}:`,
						evalCase.sessionInput,
					);
				}
			} catch (error) {
				console.warn(
					`Failed to initialize session for ${evalCase.evalId}:`,
					error,
				);
			}
		}

		for (const invocation of evalCase.conversation) {
			try {
				const response = await this.runner.ask(invocation.userContent);

				results.push({
					invocationId: `${evalCase.evalId}-${results.length}`,
					userContent: invocation.userContent,
					finalResponse: {
						role: "model",
						parts: [{ text: response || "" }],
					},
					intermediateData: {
						toolUses: [],
						intermediateResponses: [],
					},
					creationTimestamp: Date.now(),
				});
			} catch (error) {
				console.error(`Error running inference for ${evalCase.evalId}:`, error);
				results.push({
					invocationId: `${evalCase.evalId}-${results.length}`,
					userContent: invocation.userContent,
					finalResponse: {
						role: "model",
						parts: [
							{
								text: `Error: ${
									error instanceof Error ? error.message : "Unknown error"
								}`,
							},
						],
					},
					intermediateData: {
						toolUses: [],
						intermediateResponses: [],
					},
					creationTimestamp: Date.now(),
				});
			}
		}

		return results;
	}
}
