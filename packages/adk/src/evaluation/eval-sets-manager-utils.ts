import type { EvalCase } from "./eval-case";
import type { EvalSet } from "./eval-set";
import type { EvalSetsManager } from "./eval-sets-manager";

export async function getEvalSetFromAppAndId(
	evalSetsManager: EvalSetsManager,
	appName: string,
	evalSetId: string,
): Promise<EvalSet> {
	const evalSet = await evalSetsManager.getEvalSet(appName, evalSetId);
	if (!evalSet) {
		throw new Error(`Eval set \`${evalSetId}\` not found.`);
	}
	return evalSet;
}

export function getEvalCaseFromEvalSet(
	evalSet: EvalSet,
	evalCaseId: string,
): EvalCase | undefined {
	return evalSet.evalCases.find((evalCase) => evalCase.evalId === evalCaseId);
}

export function addEvalCaseToEvalSet(
	evalSet: EvalSet,
	evalCase: EvalCase,
): EvalSet {
	const evalCaseId = evalCase.evalId;

	if (evalSet.evalCases.some((x) => x.evalId === evalCaseId)) {
		throw new Error(
			`Eval id \`${evalCaseId}\` already exists in \`${evalSet.evalSetId}\` eval set.`,
		);
	}

	evalSet.evalCases.push(evalCase);
	return evalSet;
}

export function updateEvalCaseInEvalSet(
	evalSet: EvalSet,
	updatedEvalCase: EvalCase,
): EvalSet {
	const evalCaseId = updatedEvalCase.evalId;
	const evalCaseToUpdate = getEvalCaseFromEvalSet(evalSet, evalCaseId);

	if (!evalCaseToUpdate) {
		throw new Error(
			`Eval case \`${evalCaseId}\` not found in eval set \`${evalSet.evalSetId}\`.`,
		);
	}

	evalSet.evalCases = evalSet.evalCases.filter((x) => x.evalId !== evalCaseId);
	evalSet.evalCases.push(updatedEvalCase);
	return evalSet;
}

export function deleteEvalCaseFromEvalSet(
	evalSet: EvalSet,
	evalCaseId: string,
): EvalSet {
	const evalCaseToDelete = getEvalCaseFromEvalSet(evalSet, evalCaseId);

	if (!evalCaseToDelete) {
		throw new Error(
			`Eval case \`${evalCaseId}\` not found in eval set \`${evalSet.evalSetId}\`.`,
		);
	}

	evalSet.evalCases = evalSet.evalCases.filter((x) => x.evalId !== evalCaseId);
	return evalSet;
}
