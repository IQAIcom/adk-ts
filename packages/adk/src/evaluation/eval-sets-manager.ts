import type { EvalSet } from "./eval-set";
import type { EvalCase } from "./eval-case";

export interface EvalSetsManager {
	listEvalSets(appName: string): Promise<EvalSet[]>;

	getEvalSet(appName: string, evalSetId: string): Promise<EvalSet | undefined>;

	createEvalSet(appName: string, evalSet: EvalSet): Promise<EvalSet>;

	updateEvalSet(appName: string, evalSet: EvalSet): Promise<EvalSet>;

	deleteEvalSet(appName: string, evalSetId: string): Promise<void>;

	getEvalCase(
		appName: string,
		evalSetId: string,
		evalCaseId: string,
	): Promise<EvalCase | undefined>;

	createEvalCase(
		appName: string,
		evalSetId: string,
		evalCase: EvalCase,
	): Promise<EvalCase>;

	updateEvalCase(
		appName: string,
		evalSetId: string,
		evalCase: EvalCase,
	): Promise<EvalCase>;

	deleteEvalCase(
		appName: string,
		evalSetId: string,
		evalCaseId: string,
	): Promise<void>;
}
