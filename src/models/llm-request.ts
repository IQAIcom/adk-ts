import type { FunctionDeclaration } from "./function-declaration";
// import type { ToolCall } from "./llm-response"; // Likely not needed directly here if using FunctionCallPart

/**
 * Revised message role types for the Content/Part model.
 * 'system' messages are typically handled via specific configuration fields, not as a role here.
 * 'assistant' role is generally mapped to 'model'.
 * 'tool' and 'function' roles in the old model map to 'function' role for a Content object
 * that contains FunctionResponsePart(s), or a 'model' role Content containing FunctionCallPart(s).
 */
export type Role = "user" | "model" | "function";

// --- Part Definitions ---

/**
 * A discrete piece of data in a Content object.
 */
export interface TextPart {
	text: string;
	// No 'type' field needed if discriminated by presence of properties
}

export interface InlineDataPart {
	inlineData: {
		mimeType: string; // e.g., "image/png", "application/pdf"
		data: string; // Base64 encoded string
	};
}

// Corresponds to google.generativeai.types.FunctionCall
export interface FunctionCallData {
	name: string;
	args: Record<string, any>;
	id?: string; // OpenAI tool_calls require an ID
}

export interface FunctionCallPart {
	functionCall: FunctionCallData;
}

// Corresponds to google.generativeai.types.FunctionResponse
export interface FunctionResponseData {
	name: string;
	response: Record<string, any>; // The actual data returned by the function
}

export interface FunctionResponsePart {
	functionResponse: FunctionResponseData;
}

/**
 * Union of all possible Part types.
 */
export type Part =
	| TextPart
	| InlineDataPart
	| FunctionCallPart
	| FunctionResponsePart;

// --- Content Definition (replaces Message) ---

/**
 * Represents a single piece of content in the conversation, analogous to google.generativeai.types.Content.
 * It has a role and an array of Parts.
 */
export interface Content {
	role: Role;
	parts: Part[];
}

// --- Commenting out old structures ---
/*
export type MessageRole =
	| "user"
	| "assistant"
	| "system"
	| "function"
	| "tool"
	| "model";

export interface TextContent {
	type: "text";
	text: string;
}

export interface ImageContent {
	type: "image";
	image_url: {
		url: string;
	};
}

export type MessageContent =
	| string
	| TextContent
	| ImageContent
	| Array<TextContent | ImageContent>;

export interface Message {
	role: MessageRole;
	content: MessageContent;
	name?: string;
	function_call?: { // This was from llm-response, now FunctionCallPart
		name: string;
		arguments: string; // Now Record<string, any> in FunctionCallData
	};
	tool_calls?: ToolCall[]; // Replaced by FunctionCallPart(s) in model's Content
	tool_call_id?: string; // Relevant for function responses, 'name' in FunctionResponsePart
}
*/

/**
 * Configuration for LLM requests - this might need future alignment
 * with google.generativeai.types.GenerateContentConfig.
 * For now, keeping its structure but its 'functions' field will need
 * careful handling with the new Content/Part model.
 */
export interface LLMRequestConfig {
	temperature?: number;
	max_tokens?: number; // in Google SDK, this is often maxOutputTokens
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	functions?: FunctionDeclaration[]; // In Google SDK, this is part of GenerateContentConfig.tools
	// TODO: Consider adding safetySettings, toolConfig, systemInstruction etc. from GenerateContentConfig
}

/**
 * Represents a request to an LLM, now using the Content/Part model.
 */
export class LLMRequest {
	/**
	 * The conversation history, composed of Content objects.
	 */
	contents: Content[];

	/**
	 * LLM configuration parameters.
	 */
	config: LLMRequestConfig;

	// TODO: Add model?: string; (like in Python LlmRequest)
	// TODO: Add tools_dict?: Record<string, BaseTool>; (like in Python LlmRequest for mapping)
	// TODO: Add methods like append_tools, append_instructions, set_output_schema if needed.

	constructor(data: {
		contents: Content[];
		config?: LLMRequestConfig;
		// model?: string;
	}) {
		this.contents = data.contents;
		this.config = data.config || {};
		// this.model = data.model;
	}
}
