import type { EventActions } from "./event-actions";
import type { FunctionCall } from "../models/llm-response"; // Our existing FunctionCall from LLM response

// --- Parts for Event.content (inspired by google.genai.types.Part) ---
export interface TextPart {
	type: "text";
	text: string;
}

export interface FunctionCallPart {
	type: "function_call";
	functionCall: FunctionCall; // Using our existing FunctionCall type
}

export interface FunctionResponsePart {
	type: "function_response";
	functionResponse: {
		name: string;
		/** The response from the function, can be any structured data */
		response: Record<string, any> | string; // Or a more specific type if known
	};
}

// TODO: Define ToolCallPart, ToolResponsePart, BlobPart if needed for full parity
// For now, focusing on text, function_call, function_response as per Python Event helpers

export type EventPart = TextPart | FunctionCallPart | FunctionResponsePart; // Add other parts as defined
// --- End Parts ---

// Placeholder for Google's GroundingMetadata if specific fields are needed later.
// For now, it can be a generic object or omitted.
interface GroundingMetadata {
	[key: string]: any;
}

/**
 * Represents an event in a conversation between agents and users.
 * Ported and adapted from Python's Event class (which inherits LlmResponse).
 */
export interface Event {
	/**
	 * The content of the event, composed of various parts.
	 * Maps to Python's `types.Content.parts`.
	 */
	content?: EventPart[];

	/**
	 * Grounding metadata. From Google's GenAI types.
	 */
	groundingMetadata?: GroundingMetadata; // Optional, as in Python

	/**
	 * Indicates whether the text content is part of an unfinished text stream.
	 */
	partial?: boolean;

	/**
	 * Indicates whether the response from the model is complete (streaming).
	 */
	turnComplete?: boolean;

	/**
	 * Error code if the event represents an error.
	 */
	errorCode?: string;

	/**
	 * Error message if the event represents an error.
	 */
	errorMessage?: string;

	/**
	 * Flag indicating that LLM was interrupted.
	 */
	interrupted?: boolean;

	/**
	 * Custom metadata for the event.
	 */
	customMetadata?: Record<string, any>;

	// Fields specific to Python Event class
	/**
	 * The invocation ID of the event.
	 */
	invocationId: string; // Required in TS, was string = '' in Python

	/**
	 * 'user' or the name of the agent, indicating who appended the event.
	 */
	author: string;

	/**
	 * The actions taken by the agent.
	 */
	actions?: EventActions; // Defaults to empty in Python, so optional or init with default in TS

	/**
	 * Set of ids of the long running function calls.
	 */
	longRunningToolIds?: Set<string>;

	/**
	 * The branch of the event (e.g., agent_1.agent_2).
	 */
	branch?: string;

	/**
	 * The unique identifier of the event. Auto-generated if not provided.
	 */
	id: string; // Auto-generated in Python, should be handled similarly

	/**
	 * The timestamp of the event (number of seconds since epoch).
	 */
	timestamp: number; // Python: float, JS: number

	// Helper methods from Python Event class can be implemented as static functions
	// or instance methods if Event becomes a class.
	// For now, defining data structure.
}

/**
 * Generates a new unique ID for an event.
 */
export function generateEventId(): string {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < 8; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

/**
 * Helper to get function calls from an Event's content.
 * @param event The event object
 * @returns An array of FunctionCall objects, or an empty array.
 */
export function getFunctionCallsFromEvent(event: Event): FunctionCall[] {
	const calls: FunctionCall[] = [];
	if (event.content) {
		for (const part of event.content) {
			if (part.type === "function_call") {
				calls.push(part.functionCall);
			}
		}
	}
	return calls;
}

/**
 * Helper to get function responses from an Event's content.
 * @param event The event object
 * @returns An array of FunctionResponsePart objects, or an empty array.
 */
export function getFunctionResponsesFromEvent(
	event: Event,
): FunctionResponsePart[] {
	const responses: FunctionResponsePart[] = [];
	if (event.content) {
		for (const part of event.content) {
			if (part.type === "function_response") {
				responses.push(part);
			}
		}
	}
	return responses;
}

// is_final_response and has_trailing_code_execution_result would require more detailed
// knowledge of how content parts (like CodeExecutionResult) are structured in TS.
// These can be added later if Event becomes a class or if needed by the runner.
