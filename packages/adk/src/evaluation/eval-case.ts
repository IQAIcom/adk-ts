import type { Content, FunctionCall, Part } from "@google/genai";

export interface IntermediateData {
	toolUses: FunctionCall[];

	intermediateResponses: Array<[string, Part[]]>;
}

export interface Invocation {
	invocationId?: string;

	userContent: Content;

	finalResponse?: Content;

	intermediateData?: IntermediateData;

	creationTimestamp: number;
}

export interface SessionInput {
	appName: string;

	userId: string;

	state: Record<string, any>;
}

export interface EvalCase {
	evalId: string;

	conversation: Invocation[];

	sessionInput?: SessionInput;
}
