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
import { LlmAsJudge } from "./llm-as-judge";
import { Label, getEvalStatus, getTextFromContent } from "./llm-as-judge-utils";

const FINAL_RESPONSE_MATCH_V2_PROMPT = `You are an expert rater for an AI agent. The AI agent is going to call an API to answer the user query and generate API tool use code based for the choice of the API and API arguments. The ideal model response should be a function call that fulfills user query, or a natural language response hedges or asks users for further clarification if a function call does not apply.
The primary focus of this rating task is to check correctness of the model responses.

The data consists of:
- A user query.
- A model generated response for the prompt. The responses can consist of:
  - Natural language, when the model is asking for clarification, or tells the user it does not possess the requested functionality / option.
  - Code, in the form of one or multiple python function calls, and additional code as needed, for when the model is fulfilling the user request.
You can use the help from a reference response annotated by a human rater. This reference response is of high quality. You can compare the agent's response with the reference response and decide if the agent's response is valid.
Note sometimes the reference response only contains the key entities of the correct answer and you need to be flexible to allow the agent response to contain more information than the reference response, or to present the key entities in a different format or structure or in shorter or longer format.
When the agent response is provided in the form of tables/dataframes or should be best provided in the form of tables/dataframes: focus on the key entities and main components requested in the user query and check whether you can retrieve those from the agent response. Likewise, if you have the reference response, then find out the key entities and main components in them and check whether you can retrieve those from the agent response. If the prompt does not specify any format instructions and the main items/components are included in the response then tolerate the differences in the formatting of those tables/dataframes.

You should follow the constitutions below very carefully to rate the model response:
- Allow flexibility of format even when reference code only uses one of the possible format, unless API spec or user prompt has explicit format requirement
  - e.g. For state name, allow both abbreviation and full name unless API spec has explicit requirement. e.g. both 'tx' and 'Texas' should be allowed in the agent response even when reference code only uses one of them.
  - e.g. If a reference response list outputs in a list format, the agent response is allowed to use sentence format and vice versa unless user prompt explicitly asks for a specific format.
  - e.g. For numbers, allow flexibility of formatting, e.g. 1000000 vs 1,000,000.
- The model shouldn't assume that it doesn't have access to according data or incapable of answering the question if reference response is able to find a legit answer.
- If the model response contains the correct final answer, rate it as valid even when the model response contains more information than the reference response.
- If the user prompt has csv or other table format data, don't read it yourself. Trust the reference response final answer instead.
- When the validation needs maths, date calculations, do not use your own calculator. Trust the reference response final answer instead.
- Be mindful about unit of numbers. For example, if the reference response says 100 miles, but the model response says 100 km, it is invalid.
- When the agent response or the reference response is provided in the form of tables/dataframes: focus on the key entities and main components requested in the user query and check whether you can retrieve those from the agent response and whether those match the reference response. If the user query does not specify any format instructions and the main items/components are included in the response then tolerate the differences in the formatting of those tables/dataframes.
- When the answer is in numeric format, check whether there are any format requirements in the numeric format, rounding, precision, number of decimals, etc. specified in the user query and the prompt. If there are no such instructions, then tolerate different numerical formats.
- When the answer is in numeric format and there are rounding or precision differences between the agent response and the reference response, if no further instructions are provided evaluate if the rounding strategy or precision in the agent response follows the standards for that entity. For instance, model accuracy scores must be reported with at least two decimal places (e.g., 0.798 → 0.80 is acceptable,  but 0.7 is not).

Below are the inputs:
{{
  "User prompt": {prompt},
  "Agent response": {response},
  "Reference response": {golden_response},
}}

The answer should be a json alone which follows the json structure below:
{{
  "reasoning": [reasoning],
  "is_the_agent_response_valid": [valid or invalid],
}}
Answer with assertiveness:
`;

const DEFAULT_NUM_SAMPLES = 5;

function parseCritique(response: string): Label {
	const labelMatchIsResponseValid = response.match(
		/"is_the_agent_response_valid":\s*\[*[\n\s]*"*([^"^\]^\s]*)"*[\n\s]*\]*\s*[,\n\}]/,
	);

	if (labelMatchIsResponseValid?.[1]) {
		const label = labelMatchIsResponseValid[1].toLowerCase();
		return label === "valid" ? Label.VALID : Label.INVALID;
	}

	return Label.NOT_FOUND;
}

export class FinalResponseMatchV2Evaluator extends Evaluator {
	constructor(
		evalMetric: EvalMetric,
		private readonly llmAsJudge = new LlmAsJudge(),
	) {
		super(evalMetric);
	}

	static override getMetricInfo(): MetricInfo {
		return {
			metricName: PrebuiltMetrics.FINAL_RESPONSE_MATCH_V2,
			description:
				"This metric evaluates if the agent's final response matches a " +
				"golden/expected final response using an LLM judge. Value range " +
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
		const perInvocationResults: PerInvocationResult[] = [];
		let totalScore = 0;
		let numInvocations = 0;

		if (!actualInvocations.length) {
			return {
				overallEvalStatus: EvalStatus.NOT_EVALUATED,
				perInvocationResults: [],
			};
		}

		for (let i = 0; i < actualInvocations.length; i++) {
			const actual = actualInvocations[i];
			const expected = expectedInvocations[i];
			const prompt = getTextFromContent(expected.userContent);
			const response = getTextFromContent(actual.finalResponse);
			const goldenResponse = getTextFromContent(expected.finalResponse);

			const formattedPrompt = FINAL_RESPONSE_MATCH_V2_PROMPT.replace(
				"{prompt}",
				prompt,
			)
				.replace("{response}", response)
				.replace("{golden_response}", goldenResponse);

			const numSamples =
				this.metric.judgeModelOptions?.numSamples ?? DEFAULT_NUM_SAMPLES;
			const labels = await this.llmAsJudge.sampleJudge(
				formattedPrompt,
				numSamples,
				parseCritique,
				this.metric.judgeModelOptions,
			);

			const score =
				labels.filter((l) => l === Label.VALID).length / labels.length;
			perInvocationResults.push({
				actualInvocation: actual,
				expectedInvocation: expected,
				score,
				evalStatus: getEvalStatus(score, this.metric.threshold),
			});

			totalScore += score;
			numInvocations++;
		}

		const overallScore = totalScore / numInvocations;
		return {
			overallScore,
			overallEvalStatus: getEvalStatus(overallScore, this.metric.threshold),
			perInvocationResults,
		};
	}
}
