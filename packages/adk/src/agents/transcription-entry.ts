import type { Blob, Content } from "@google/genai";

/**
 * Store the data that can be used for transcription.
 */
export class TranscriptionEntry {
	/**
	 * The role that created this data, typically "user" or "model". For function
	 * call, this is None.
	 */
	role?: string;

	/**
	 * The data that can be used for transcription
	 */
	data: Blob | Content;

	constructor(options: {
		role?: string;
		data: Blob | Content;
	}) {
		this.role = options.role;
		this.data = options.data;
	}
}
