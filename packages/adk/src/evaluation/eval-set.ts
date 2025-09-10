import type { EvalCase } from "./eval-case";

export interface EvalSet {
	evalSetId: string;

	name?: string;

	description?: string;

	evalCases: EvalCase[];

	creationTimestamp: number;
}
