/**
 * @deprecated Legacy memory service - will be removed in next major version.
 * Use MemoryService with InMemoryStorageProvider instead.
 */

import type { Content } from "@google/genai";
import type { Event } from "../events/event";
import type { Session } from "../sessions/session";

/**
 * @deprecated Use MemoryRecord instead. Will be removed in next major version.
 */
export interface MemoryEntry {
	content: Content;
	author?: string;
	timestamp?: string;
}

/**
 * @deprecated Use MemorySearchResult[] instead. Will be removed in next major version.
 */
export interface SearchMemoryResponse {
	memories: MemoryEntry[];
}

/**
 * @deprecated Use MemoryStorageProvider interface instead. Will be removed in next major version.
 */
export interface BaseMemoryService {
	addSessionToMemory(session: Session): Promise<void>;
	searchMemory(params: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse>;
}

function formatTimestamp(timestamp?: number | Date): string {
	if (!timestamp) return new Date().toISOString();
	return typeof timestamp === "number"
		? new Date(timestamp).toISOString()
		: timestamp.toISOString();
}

function userKey(appName: string, userId: string): string {
	return `${appName}/${userId}`;
}

function extractWordsLower(text: string): Set<string> {
	const words = text.match(/[A-Za-z]+/g) || [];
	return new Set(words.map((word) => word.toLowerCase()));
}

/**
 * @deprecated Use MemoryService with InMemoryStorageProvider instead.
 * Will be removed in next major version.
 *
 * @example
 * ```typescript
 * // Migration:
 * // Old:
 * const memory = new InMemoryMemoryService();
 *
 * // New:
 * import { MemoryService, InMemoryStorageProvider } from '@iqai/adk';
 * const memory = new MemoryService({ storage: new InMemoryStorageProvider() });
 * ```
 */
export class InMemoryMemoryService implements BaseMemoryService {
	private _sessionEvents: Map<string, Map<string, Event[]>> = new Map();

	constructor() {
		console.warn(
			"[DEPRECATED] InMemoryMemoryService is deprecated. Use MemoryService with InMemoryStorageProvider instead.",
		);
	}

	async addSessionToMemory(session: Session): Promise<void> {
		const key = userKey(session.appName, session.userId);
		if (!this._sessionEvents.has(key)) {
			this._sessionEvents.set(key, new Map());
		}
		const userSessions = this._sessionEvents.get(key)!;
		const filteredEvents = session.events.filter(
			(event) => event.content?.parts,
		);
		userSessions.set(session.id, filteredEvents);
	}

	async searchMemory(options: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse> {
		const key = userKey(options.appName, options.userId);
		if (!this._sessionEvents.has(key)) {
			return { memories: [] };
		}

		const wordsInQuery = new Set(options.query.toLowerCase().split(" "));
		const memories: MemoryEntry[] = [];

		for (const sessionEvents of this._sessionEvents.get(key)!.values()) {
			for (const event of sessionEvents) {
				if (!event.content?.parts) continue;

				const textParts = event.content.parts
					.filter((part) => part.text)
					.map((part) => part.text!)
					.join(" ");

				const wordsInEvent = extractWordsLower(textParts);
				if (wordsInEvent.size === 0) continue;

				const hasMatch = Array.from(wordsInQuery).some((w) =>
					wordsInEvent.has(w),
				);
				if (hasMatch) {
					memories.push({
						content: event.content as Content,
						author: event.author,
						timestamp: formatTimestamp(event.timestamp),
					});
				}
			}
		}

		return { memories };
	}

	clear(): void {
		this._sessionEvents.clear();
	}
}
