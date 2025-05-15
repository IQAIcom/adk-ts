import type { Content } from "../llm-request";

// The FunctionCall and ToolCall interfaces previously defined here are now redundant.
// Function/tool call information will be part of the `Content` object's `parts`,
// typically as a `FunctionCallPart` (defined in llm-request.ts).

/**
 * Response from an LLM, aligned with the Content/Part model.
 */
export class LLMResponse {
	/**
	 * The primary structured content of the response from the LLM.
	 * This will contain the role (e.g., 'model') and parts (text, function calls, etc.).
	 */
	content?: Content;

	/**
	 * Whether this is a partial response in a stream.
	 */
	is_partial?: boolean;

	/**
	 * Indicates whether the response from the model is complete for this turn.
	 * Only used for streaming mode.
	 */
	turn_complete?: boolean;

	/**
	 * Error code if the response is an error. Code varies by model.
	 */
	error_code?: string;

	/**
	 * Error message if the response is an error.
	 */
	error_message?: string;

	/**
	 * Raw provider response, for debugging or accessing provider-specific fields.
	 */
	raw_response?: any;

	constructor(data: {
		content?: Content;
		is_partial?: boolean;
		turn_complete?: boolean;
		error_code?: string;
		error_message?: string;
		raw_response?: any;
	}) {
		this.content = data.content;
		this.is_partial = data.is_partial || false;
		this.turn_complete = data.turn_complete;
		this.error_code = data.error_code;
		this.error_message = data.error_message;
		this.raw_response = data.raw_response;
	}
}
