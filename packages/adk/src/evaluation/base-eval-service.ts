import type { Invocation } from "./eval-case";
import type { EvaluateConfig } from "./eval-metrics";
import type { EvalSetResult } from "./eval-result";
import type { EvalSet } from "./eval-set";
export abstract class BaseEvalService {
	abstract performInference(request: {
		evalSetId: string;
		evalCases: EvalSet[];
	}): AsyncGenerator<Invocation[], void>;

	abstract evaluate(request: {
		inferenceResults: Invocation[][];
		evaluateConfig: EvaluateConfig;
	}): AsyncGenerator<EvalSetResult, void>;

	async *evaluateSession(session: {
		evalSetId: string;
		evalCases: EvalSet[];
		evaluateConfig: EvaluateConfig;
	}): AsyncGenerator<EvalSetResult, void> {
		const inferenceResults: Invocation[][] = [];
		for await (const result of this.performInference({
			evalSetId: session.evalSetId,
			evalCases: session.evalCases,
		})) {
			inferenceResults.push(result);
		}

		for await (const result of this.evaluate({
			inferenceResults,
			evaluateConfig: session.evaluateConfig,
		})) {
			yield result;
		}
	}
}
