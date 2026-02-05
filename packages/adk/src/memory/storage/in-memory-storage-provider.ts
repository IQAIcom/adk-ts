import type {
	MemoryDeleteFilter,
	MemoryRecord,
	MemorySearchQuery,
	MemorySearchResult,
	MemoryStorageProvider,
} from "../types";

/**
 * In-memory storage provider for development and testing.
 * Uses simple keyword matching for search.
 *
 * Note: This provider does not persist data - all memories are lost when the
 * process exits. Use a persistent storage provider for production.
 */
export class InMemoryStorageProvider implements MemoryStorageProvider {
	private memories: Map<string, MemoryRecord> = new Map();

	/**
	 * Store a memory record.
	 */
	async store(record: MemoryRecord): Promise<void> {
		this.memories.set(record.id, record);
	}

	/**
	 * Search memories using keyword matching.
	 * Searches through summary, rawText, segments, and keyFacts.
	 */
	async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
		const results: MemorySearchResult[] = [];
		const searchTerms = query.query.toLowerCase().split(/\s+/);

		for (const memory of this.memories.values()) {
			// Filter by userId
			if (memory.userId !== query.userId) {
				continue;
			}

			// Filter by appName if specified
			if (query.appName && memory.appName !== query.appName) {
				continue;
			}

			// Apply additional filters
			if (query.filters) {
				if (
					query.filters.sessionId &&
					memory.sessionId !== query.filters.sessionId
				) {
					continue;
				}
				if (query.filters.after && memory.timestamp < query.filters.after) {
					continue;
				}
				if (query.filters.before && memory.timestamp > query.filters.before) {
					continue;
				}
			}

			// Calculate relevance score based on keyword matches
			const score = this.calculateScore(memory, searchTerms);
			if (score > 0) {
				results.push({ memory, score });
			}
		}

		// Sort by score descending
		results.sort((a, b) => b.score - a.score);

		// Apply limit
		const limit = query.limit ?? 5;
		return results.slice(0, limit);
	}

	/**
	 * Delete memories matching the filter.
	 */
	async delete(filter: MemoryDeleteFilter): Promise<number> {
		let deleted = 0;

		for (const [id, memory] of this.memories.entries()) {
			if (this.matchesFilter(memory, filter)) {
				this.memories.delete(id);
				deleted++;
			}
		}

		return deleted;
	}

	/**
	 * Count memories matching the filter.
	 */
	async count(filter: MemoryDeleteFilter): Promise<number> {
		let count = 0;

		for (const memory of this.memories.values()) {
			if (this.matchesFilter(memory, filter)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Calculate relevance score for a memory based on keyword matches.
	 */
	private calculateScore(memory: MemoryRecord, searchTerms: string[]): number {
		let score = 0;
		const content = memory.content;

		// Build searchable text from memory content
		const searchableTexts: string[] = [];

		if (content.summary) {
			searchableTexts.push(content.summary);
		}

		if (content.rawText) {
			searchableTexts.push(content.rawText);
		}

		if (content.segments) {
			for (const segment of content.segments) {
				searchableTexts.push(segment.topic);
				searchableTexts.push(segment.summary);
			}
		}

		if (content.keyFacts) {
			searchableTexts.push(...content.keyFacts);
		}

		if (content.entities) {
			for (const entity of content.entities) {
				searchableTexts.push(entity.name);
				if (entity.relation) {
					searchableTexts.push(entity.relation);
				}
			}
		}

		const fullText = searchableTexts.join(" ").toLowerCase();

		// Count matching terms
		for (const term of searchTerms) {
			if (fullText.includes(term)) {
				score += 1;
			}
		}

		// Normalize score to 0-1 range
		return searchTerms.length > 0 ? score / searchTerms.length : 0;
	}

	/**
	 * Check if a memory matches the given filter.
	 */
	private matchesFilter(
		memory: MemoryRecord,
		filter: MemoryDeleteFilter,
	): boolean {
		if (filter.ids && filter.ids.length > 0) {
			return filter.ids.includes(memory.id);
		}

		if (filter.userId && memory.userId !== filter.userId) {
			return false;
		}

		if (filter.appName && memory.appName !== filter.appName) {
			return false;
		}

		if (filter.sessionId && memory.sessionId !== filter.sessionId) {
			return false;
		}

		if (filter.before && memory.timestamp > filter.before) {
			return false;
		}

		if (filter.after && memory.timestamp < filter.after) {
			return false;
		}

		return true;
	}

	/**
	 * Clear all memories (useful for testing).
	 */
	clear(): void {
		this.memories.clear();
	}

	/**
	 * Get the number of stored memories (useful for testing).
	 */
	get size(): number {
		return this.memories.size;
	}
}
