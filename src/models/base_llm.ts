// Base LLM module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base LLM functionality from the Python SDK

import {
	Content,
	HarmBlockThreshold as GenAiHarmBlockThreshold,
	HarmCategory as GenAiHarmCategory,
} from "@google/genai";

export { Content };

import type { AuthCredential, AuthScheme } from "../auth/auth_credential";

// --- Enums based on Google GenAI SDK Documentation (Can keep these as is, or prefix with Adk if they differ) ---
export {
	GenAiHarmCategory as HarmCategory,
	GenAiHarmBlockThreshold as HarmBlockThreshold,
};

export enum HarmProbability {
	HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED",
	NEGLIGIBLE = "NEGLIGIBLE",
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
}

// --- Interfaces based on Google GenAI SDK Documentation (Prefixed with Adk) ---

export interface AdkSafetySetting {
	category: GenAiHarmCategory;
	threshold: GenAiHarmBlockThreshold;
}

export interface AdkSafetyRating {
	category: GenAiHarmCategory;
	probability: HarmProbability;
	blocked?: boolean;
}

// --- ADK Specific or Placeholder Interfaces ---

export interface FileData {
	mimeType?: string;
	fileUri?: string;
}

export interface AdkSchema {
	type?: string;
	properties?: Record<string, AdkSchema>;
	required?: string[];
	description?: string;
	format?: string;
	items?: AdkSchema;
	oneOf?: AdkSchema[];
	enum?: (string | number | boolean)[];
}

export interface AdkFunctionDeclaration {
	name?: string;
	description: string | undefined;
	parameters?: AdkSchema;
}

export enum AdkType {
	STRING = "STRING",
	NUMBER = "NUMBER",
	INTEGER = "INTEGER",
	BOOLEAN = "BOOLEAN",
	ARRAY = "ARRAY",
	OBJECT = "OBJECT",
}

export interface AdkFunctionCall {
	name?: string;
	args?: Record<string, unknown>;
}

// --- Original ADK Interfaces (potentially modified, now prefixed) ---

export interface LlmUsageMetadata {
	promptTokenCount?: number;
	candidatesTokenCount?: number;
	totalTokenCount?: number;
}

export interface LlmRequest {
	model?: string;
	contents?: Content[];
	tools?: AdkTool[];
	toolsDict?: Record<string, { name: string; description: string }>;
	temperature?: number;
	topP?: number;
	topK?: number;
	maxOutputTokens?: number;
	stopSequences?: string[];
	systemInstruction?: string | undefined;
	generationConfig?: AdkGenerationConfig;
	safetySettings?: AdkSafetySetting[];
	apiKey?: string;
	[key: string]: unknown;
}

export interface StructuredFunctionCallResponse {
	name?: string;
	args?: Record<string, unknown>;
	functionResponse?: {
		name: string;
		response: {
			authScheme?: AuthScheme;
			rawAuthCredential?: AuthCredential | null;
			exchangedAuthCredential?: AuthCredential | null;
			[key: string]: unknown;
		};
	};
}

export interface LlmResponse {
	text?: string | null;
	functionCalls?: AdkFunctionCall[];
	usageMetadata?: LlmUsageMetadata;
	safetyRatings?: AdkSafetyRating[];
	rawResponse?: unknown;
	finishReason?: string | undefined;
	turnComplete?: boolean;
	candidates?: AdkCandidate[];
	promptFeedback?: AdkPromptFeedback;
}

import { BaseLlmConnection } from "./base_llm_connection";

export abstract class BaseLlm {
	model: string;
	constructor(model: string) {
		this.model = model;
	}
	abstract generateContent(
		request: LlmRequest,
		stream?: boolean,
	): Promise<LlmResponse>;
	abstract generateContentAsync(
		request: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<LlmResponse, void, unknown>;
	abstract connect(request: LlmRequest): Promise<BaseLlmConnection>;
}

export interface AdkCitationSource {
	startIndex: number;
	endIndex: number;
	uri: string;
	license: string;
}

export interface AdkCitationMetadata {
	citationSources?: AdkCitationSource[];
}

export interface AdkCandidate {
	index: number;
	content: Content;
	finishReason?: string | undefined;
	safetyRatings?: AdkSafetyRating[];
	citationMetadata?: AdkCitationMetadata;
	tokenCount?: number;
}

export interface AdkPromptFeedback {
	blockReason?: BlockReason;
	safetyRatings?: AdkSafetyRating[];
	blockReasonMessage?: string;
}

export enum BlockReason {
	BLOCK_REASON_UNSPECIFIED = "BLOCK_REASON_UNSPECIFIED",
	SAFETY = "SAFETY",
	OTHER = "OTHER",
}

export enum FinishReason {
	FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED",
	STOP = "STOP",
	MAX_TOKENS = "MAX_TOKENS",
	SAFETY = "SAFETY",
	RECITATION = "RECITATION",
	OTHER = "OTHER",
}

export interface AdkPart {
	text?: string;
	inlineData?: { mimeType?: string; data?: string };
	fileData?: FileData;
	functionCall?: AdkFunctionCall;
	functionResponse?: AdkFunctionResponse;
}

export interface AdkToolConfig {
	functionCallingConfig?: FunctionCallingConfig;
}

export enum FunctionCallingMode {
	MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
	AUTO = "AUTO",
	ANY = "ANY",
	NONE = "NONE",
}

export interface AdkTool {
	functionDeclarations?: AdkFunctionDeclaration[];
}

export interface AdkGenerationConfig {
	temperature?: number;
	topP?: number;
	topK?: number;
	candidateCount?: number;
	maxOutputTokens?: number;
	stopSequences?: string[];
	responseMimeType?: string;
	responseSchema?: AdkSchema;
}

export interface AdkFunctionResponse {
	name?: string;
	response?: Record<string, unknown>;
}

export interface FunctionCallingConfig {
	mode?: FunctionCallingMode;
	allowedFunctionNames?: string[];
}

export interface CachedContent {
	name: string;
}
