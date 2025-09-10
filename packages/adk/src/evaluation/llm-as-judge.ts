import { LlmResponse } from "../models/llm-response";
import type { LlmModel } from "@adk/models";
import type { Invocation } from "./eval-case";
import type { EvalMetric, JudgeModelOptions } from "./eval-metrics";
import {
	type EvaluationResult,
	Evaluator,
	type PerInvocationResult,
} from "./evaluator";
import { getEvalStatus, Label } from "./llm-as-judge-utils";
import { LLMRegistry } from "@adk/models";

export type CritiqueParser = (response: string) => Label;

export class LlmAsJudge {
	async sampleJudge(
		prompt: string,
		numSamples: number,
		critiqueParser: CritiqueParser,
		judgeModelOptions?: JudgeModelOptions,
	): Promise<Label[]> {
		const modelName = judgeModelOptions?.judgeModel || "gemini-2.5-flash";
		const model = LLMRegistry.getModelOrCreate(modelName);
		const config = judgeModelOptions?.judgeModelConfig || {};
		const samples: Label[] = [];
		for (let i = 0; i < numSamples; i++) {
			try {
				const response = await (model as LlmModel).generateContent({
					prompt,
					...config,
				});
				const label = critiqueParser(response.text);
				if (label !== Label.NOT_FOUND) {
					samples.push(label);
				}
			} catch (error) {
				console.error("Error sampling judge model:", error);
			}
		}
		return samples;
	}
}

export abstract class LlmAsJudgeEvaluator extends Evaluator {
	private readonly llmAsJudge: LlmAsJudge;
	private readonly judgeModelOptions: JudgeModelOptions;

	constructor(evalMetric: EvalMetric) {
		super(evalMetric);
		if (!evalMetric.judgeModelOptions) {
			throw new Error("Judge model options is required for LlmAsJudge.");
		}
		this.judgeModelOptions = evalMetric.judgeModelOptions;
		this.llmAsJudge = new LlmAsJudge();
	}

	protected abstract formatAutoRaterPrompt(
		actual: Invocation,
		expected: Invocation,
	): string;

	protected abstract convertAutoRaterResponseToScore(
		autoRaterResponse: LlmResponse,
	): number | undefined;

	protected abstract aggregatePerInvocationSamples(
		perInvocationSamples: PerInvocationResult[],
	): PerInvocationResult;

	protected abstract aggregateInvocationResults(
		perInvocationResults: PerInvocationResult[],
	): EvaluationResult;

	async evaluateInvocations(
		actualInvocations: Invocation[],
		expectedInvocations: Invocation[],
	): Promise<EvaluationResult> {
		const perInvocationResults: PerInvocationResult[] = [];

		for (let i = 0; i < actualInvocations.length; i++) {
			const actual = actualInvocations[i];
			const expected = expectedInvocations[i];
			const autoRaterPrompt = this.formatAutoRaterPrompt(actual, expected);

			const critiqueParser = (response: string): Label => {
				const score = this.convertAutoRaterResponseToScore(
					new LlmResponse({ text: response }),
				);
				return score !== undefined && score >= this.metric.threshold
					? Label.VALID
					: Label.INVALID;
			};

			const labels = await this.llmAsJudge.sampleJudge(
				autoRaterPrompt,
				this.judgeModelOptions.numSamples || 5,
				critiqueParser,
				this.judgeModelOptions,
			);

			if (labels.length > 0) {
				const score =
					labels.filter((l) => l === Label.VALID).length / labels.length;
				perInvocationResults.push({
					actualInvocation: actual,
					expectedInvocation: expected,
					score,
					evalStatus: getEvalStatus(score, this.metric.threshold),
				});
			}
		}

		return this.aggregateInvocationResults(perInvocationResults);
	}
}
