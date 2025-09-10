import type { FunctionCall } from "@google/genai";
import type { Invocation } from "./eval-case";
import { type MetricInfo, PrebuiltMetrics } from "./eval-metrics";
import {
	EvalStatus,
	type EvaluationResult,
	Evaluator,
	type PerInvocationResult,
} from "./evaluator";

export class TrajectoryEvaluator extends Evaluator {
	static override getMetricInfo(): MetricInfo {
		return {
			metricName: PrebuiltMetrics.TOOL_TRAJECTORY_AVG_SCORE,
			description:
				"This metric compares two tool call trajectories (expected vs. " +
				"actual) for the same user interaction. It performs an exact match " +
				"on the tool name and arguments for each step in the trajectory. " +
				"A score of 1.0 indicates a perfect match, while 0.0 indicates a " +
				"mismatch. Higher values are better.",
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
		let totalToolUseAccuracy = 0.0;
		let numInvocations = 0;
		const perInvocationResults: PerInvocationResult[] = [];

		for (let i = 0; i < actualInvocations.length; i++) {
			const actual = actualInvocations[i];
			const expected = expectedInvocations[i];

			if (
				!actual.intermediateData?.toolUses ||
				!expected.intermediateData?.toolUses
			) {
				perInvocationResults.push({
					actualInvocation: actual,
					expectedInvocation: expected,
					evalStatus: EvalStatus.NOT_EVALUATED,
				});
				continue;
			}

			const toolUseAccuracy = this.areToolCallsEqual(
				actual.intermediateData.toolUses,
				expected.intermediateData.toolUses,
			)
				? 1.0
				: 0.0;

			perInvocationResults.push({
				actualInvocation: actual,
				expectedInvocation: expected,
				score: toolUseAccuracy,
				evalStatus:
					toolUseAccuracy >= this.metric.threshold
						? EvalStatus.PASSED
						: EvalStatus.FAILED,
			});

			totalToolUseAccuracy += toolUseAccuracy;
			numInvocations++;
		}

		const overallScore =
			numInvocations > 0 ? totalToolUseAccuracy / numInvocations : 0;

		return {
			overallScore,
			overallEvalStatus:
				overallScore >= this.metric.threshold
					? EvalStatus.PASSED
					: EvalStatus.FAILED,
			perInvocationResults,
		};
	}

	private areToolCallsEqual(
		actual: FunctionCall[],
		expected: FunctionCall[],
	): boolean {
		if (actual.length !== expected.length) {
			return false;
		}

		return actual.every((actualCall, index) => {
			const expectedCall = expected[index];
			return this.isToolCallEqual(actualCall, expectedCall);
		});
	}

	private isToolCallEqual(
		actual: FunctionCall,
		expected: FunctionCall,
	): boolean {
		if (actual.name !== expected.name) {
			return false;
		}

		const actualArgs = actual.args || {};
		const expectedArgs = expected.args || {};

		const actualKeys = Object.keys(actualArgs).sort();
		const expectedKeys = Object.keys(expectedArgs).sort();

		if (actualKeys.length !== expectedKeys.length) {
			return false;
		}

		return actualKeys.every((key, index) => {
			const expectedKey = expectedKeys[index];
			if (key !== expectedKey) {
				return false;
			}
			return (
				JSON.stringify(actualArgs[key]) === JSON.stringify(expectedArgs[key])
			);
		});
	}
}
