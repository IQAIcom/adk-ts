import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Content } from "@google/genai";
import type { Event } from "../events/event";
import type { Session } from "../sessions/session";
import { formatTimestamp } from "./_utils";
import type {
	BaseMemoryService,
	SearchMemoryResponse,
} from "./base-memory-service";
import type { MemoryEntry } from "./memory-entry";

interface VertexRagStoreRagResource {
	rag_corpus: string;
}

interface VertexRagStore {
	rag_resources: VertexRagStoreRagResource[];
	similarity_top_k?: number;
	vector_distance_threshold: number;
	rag_corpora?: string[];
}

interface RagContext {
	source_display_name: string;
	text?: string;
}

interface RagResponse {
	contexts: {
		contexts: RagContext[];
	};
}

// Mock Vertex AI RAG functions - replace with actual SDK imports
interface VertexRag {
	upload_file(options: {
		corpus_name: string;
		path: string;
		display_name: string;
	}): Promise<void>;

	retrieval_query(options: {
		text: string;
		rag_resources?: VertexRagStoreRagResource[];
		rag_corpora?: string[];
		similarity_top_k?: number;
		vector_distance_threshold?: number;
	}): Promise<RagResponse>;
}

// You'll need to import the actual Vertex AI RAG SDK
// import { rag } from 'vertex-ai-sdk'; // Replace with actual import
const rag: VertexRag = {
	async upload_file(options) {
		// Mock implementation - replace with actual SDK call
		console.log("Mock upload_file:", options);
	},
	async retrieval_query(options) {
		// Mock implementation - replace with actual SDK call
		console.log("Mock retrieval_query:", options);
		return { contexts: { contexts: [] } };
	},
};

/**
 * Merge event lists that have overlapping timestamps
 */
function _mergeEventLists(eventLists: Event[][]): Event[][] {
	const merged: Event[][] = [];

	while (eventLists.length > 0) {
		const current = eventLists.shift()!;
		const currentTs = new Set(current.map((event) => event.timestamp));
		let mergeFound = true;

		// Keep merging until no new overlap is found
		while (mergeFound) {
			mergeFound = false;
			const remaining: Event[][] = [];

			for (const other of eventLists) {
				const otherTs = new Set(other.map((event) => event.timestamp));

				// Check if there's overlap
				const hasOverlap = Array.from(currentTs).some((ts) => otherTs.has(ts));

				if (hasOverlap) {
					// Overlap exists, so we merge and use the merged list to check again
					const newEvents = other.filter((e) => !currentTs.has(e.timestamp));
					current.push(...newEvents);
					newEvents.forEach((e) => currentTs.add(e.timestamp));
					mergeFound = true;
				} else {
					remaining.push(other);
				}
			}

			eventLists.splice(0, eventLists.length, ...remaining);
		}

		merged.push(current);
	}

	return merged;
}

/**
 * A memory service that uses Vertex AI RAG for storage and retrieval.
 */
export class VertexAiRagMemoryService implements BaseMemoryService {
	private _vertexRagStore: VertexRagStore;

	/**
	 * Initializes a VertexAiRagMemoryService.
	 *
	 * @param ragCorpus The name of the Vertex AI RAG corpus to use. Format:
	 *   `projects/{project}/locations/{location}/ragCorpora/{rag_corpus_id}`
	 *   or `{rag_corpus_id}`
	 * @param similarityTopK The number of contexts to retrieve.
	 * @param vectorDistanceThreshold Only returns contexts with vector distance
	 *   smaller than the threshold.
	 */
	constructor(
		ragCorpus?: string,
		similarityTopK?: number,
		vectorDistanceThreshold = 10,
	) {
		this._vertexRagStore = {
			rag_resources: ragCorpus ? [{ rag_corpus: ragCorpus }] : [],
			similarity_top_k: similarityTopK,
			vector_distance_threshold: vectorDistanceThreshold,
		};
	}

	/**
	 * Adds a session to the memory service
	 */
	async addSessionToMemory(session: Session): Promise<void> {
		// Create temporary file
		const tempFileName = `temp_${randomUUID()}.txt`;
		const tempFilePath = join(tmpdir(), tempFileName);

		try {
			const outputLines: string[] = [];

			for (const event of session.events) {
				if (!event.content || !event.content.parts) {
					continue;
				}

				const textParts = event.content.parts
					.filter((part) => part.text)
					.map((part) => part.text!.replace(/\n/g, " "));

				if (textParts.length > 0) {
					outputLines.push(
						JSON.stringify({
							author: event.author,
							timestamp: event.timestamp,
							text: textParts.join("."),
						}),
					);
				}
			}

			const outputString = outputLines.join("\n");
			writeFileSync(tempFilePath, outputString, "utf8");

			if (
				!this._vertexRagStore.rag_resources ||
				this._vertexRagStore.rag_resources.length === 0
			) {
				throw new Error("Rag resources must be set.");
			}

			for (const ragResource of this._vertexRagStore.rag_resources) {
				await rag.upload_file({
					corpus_name: ragResource.rag_corpus,
					path: tempFilePath,
					// This is the temp workaround as upload file does not support
					// adding metadata, thus use display_name to store the session info.
					display_name: `${session.appName}.${session.userId}.${session.id}`,
				});
			}
		} finally {
			// Clean up temporary file
			try {
				unlinkSync(tempFilePath);
			} catch (error) {
				console.warn("Failed to delete temporary file:", tempFilePath, error);
			}
		}
	}

	/**
	 * Searches for sessions that match the query using rag.retrieval_query
	 */
	async searchMemory(options: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse> {
		const { appName, userId, query } = options;

		const response = await rag.retrieval_query({
			text: query,
			rag_resources: this._vertexRagStore.rag_resources,
			rag_corpora: this._vertexRagStore.rag_corpora,
			similarity_top_k: this._vertexRagStore.similarity_top_k,
			vector_distance_threshold: this._vertexRagStore.vector_distance_threshold,
		});

		const memoryResults: MemoryEntry[] = [];
		const sessionEventsMap = new Map<string, Event[][]>();

		for (const context of response.contexts.contexts) {
			// Filter out context that is not related
			// TODO: Add server side filtering by app_name and user_id.
			if (!context.source_display_name.startsWith(`${appName}.${userId}.`)) {
				continue;
			}

			const sessionId = context.source_display_name.split(".").pop()!;
			const events: Event[] = [];

			if (context.text) {
				const lines = context.text.split("\n");

				for (const line of lines) {
					const trimmedLine = line.trim();
					if (!trimmedLine) {
						continue;
					}

					try {
						// Try to parse as JSON
						const eventData = JSON.parse(trimmedLine);
						const author = eventData.author || "";
						const timestamp = Number.parseFloat(eventData.timestamp || "0");
						const text = eventData.text || "";

						const content: Content = {
							parts: [{ text }],
						};

						// You'll need to import your Event class
						const event = {
							author,
							timestamp,
							content,
						} as Event;

						events.push(event);
					} catch {
						// Not valid JSON, skip this line
					}
				}
			}

			if (sessionEventsMap.has(sessionId)) {
				sessionEventsMap.get(sessionId)!.push(events);
			} else {
				sessionEventsMap.set(sessionId, [events]);
			}
		}

		// Remove overlap and combine events from the same session
		for (const [sessionId, eventLists] of sessionEventsMap.entries()) {
			const mergedEventLists = _mergeEventLists(eventLists);

			for (const events of mergedEventLists) {
				const sortedEvents = events
					.sort((a, b) => a.timestamp - b.timestamp)
					.filter((event) => event.content);

				memoryResults.push(
					...sortedEvents.map((event) => ({
						author: event.author,
						content: event.content!,
						timestamp: formatTimestamp(event.timestamp),
					})),
				);
			}
		}

		return { memories: memoryResults };
	}
}
