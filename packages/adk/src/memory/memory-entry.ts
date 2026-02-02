import type { Content } from "@google/genai";

/**
 * Represent one memory entry
 */
export interface MemoryEntry {
	/**
	 * The main content of the memory
	 */
	content: Content;

	/**
	 * The author of the memory
	 */
	author?: string;

	/**
	 * The timestamp when the original content of this memory happened.
	 *
	 * This string will be forwarded to LLM. Preferred format is ISO 8601 format.
	 */
	timestamp?: string;
}
