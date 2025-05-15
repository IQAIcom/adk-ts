import type { LLMResponse } from "./llm-response";

/**
 * Base class for LLM connections
 */
export abstract class BaseLLMConnection {
	/**
	 * Indicates if the connection is active
	 */
	protected _isActive = true;

	/**
	 * Gets whether the connection is active
	 */
	get isActive(): boolean {
		return this._isActive;
	}

	/**
	 * Sends a message to the LLM
	 *
	 * @param message The message to send
	 */
	abstract send(message: string): void;

	/**
	 * Handles responses from the LLM
	 *
	 * @param callback The callback to handle responses
	 */
	abstract onResponse(callback: (response: LLMResponse) => void): void;

	/**
	 * Handles errors from the LLM
	 *
	 * @param callback The callback to handle errors
	 */
	abstract onError(callback: (error: Error) => void): void;

	/**
	 * Handles the end of the connection
	 *
	 * @param callback The callback to handle the end
	 */
	abstract onEnd(callback: () => void): void;

	/**
	 * Closes the connection
	 */
	close(): void {
		this._isActive = false;
	}
}
