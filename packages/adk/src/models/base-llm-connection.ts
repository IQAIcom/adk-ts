import type { Blob, Content } from "@google/genai";
import type { LlmResponse } from "./llm-response";

// Re-export types for convenience
export type { Blob, Content };

/**
 * The base class for a live model connection.
 */
export abstract class BaseLLMConnection {
	/**
	 * Sends the conversation history to the model.
	 *
	 * You call this method right after setting up the model connection.
	 * The model will respond if the last content is from user, otherwise it will
	 * wait for new user input before responding.
	 *
	 * @param history The conversation history to send to the model.
	 */
	abstract sendHistory(history: Content[]): Promise<void>;

	/**
	 * Sends a user content to the model.
	 *
	 * The model will respond immediately upon receiving the content.
	 * If you send function responses, all parts in the content should be function
	 * responses.
	 *
	 * @param content The content to send to the model.
	 */
	abstract sendContent(content: Content): Promise<void>;

	/**
	 * Sends a chunk of audio or a frame of video to the model in realtime.
	 *
	 * The model may not respond immediately upon receiving the blob. It will do
	 * voice activity detection and decide when to respond.
	 *
	 * @param blob The blob to send to the model.
	 */
	abstract sendRealtime(blob: Blob): Promise<void>;

	/**
	 * Receives the model response using the llm server connection.
	 *
	 * @returns LlmResponse: The model response.
	 */
	abstract receive(): AsyncGenerator<LlmResponse, void, unknown>;

	/**
	 * Closes the llm server connection.
	 */
	abstract close(): Promise<void>;
}
