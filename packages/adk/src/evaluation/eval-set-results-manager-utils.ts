import { type EvalCaseResult, EvalResult } from "./eval-result";

export function sanitizeEvalSetResultName(evalSetResultName: string): string {
	return evalSetResultName.replace(/\//g, "_");
}

export function createEvalSetResult(
	appName: string,
	evalSetId: string,
	evalCaseResults: EvalCaseResult[],
): EvalResult {
	const timestamp = Date.now() / 1000;
	const evalSetResultId = `${appName}_${evalSetId}_${timestamp}`;
	const evalSetResultName = sanitizeEvalSetResultName(evalSetResultId);

	return new EvalResult({
		evalSetResultId,
		evalSetResultName,
		evalSetId,
		evalCaseResults,
		creationTimestamp: timestamp,
	});
}
