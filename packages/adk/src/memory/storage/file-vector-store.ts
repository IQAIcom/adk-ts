import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Logger } from "../../logger";
import type { MemoryContent } from "../types";
import type { VectorStore } from "./vector-storage-provider";

/**
 * Configuration for FileVectorStore
 */
export interface FileVectorStoreConfig {
	/**
	 * Base directory path for storing files.
	 * Structure: basePath/vectors.json + basePath/summaries/*.md
	 */
	basePath: string;

	/**
	 * Whether to write human-readable markdown summaries.
	 * These can be exposed to users for transparency.
	 * Default: true
	 */
	writeSummaries?: boolean;

	/**
	 * Storage format for vectors.
	 * - "json": Human-readable JSON (default, larger files)
	 * - "binary": Compact Float32 binary (smaller, faster)
	 */
	format?: "json" | "binary";
}

/**
 * Vector index entry stored in the index file
 */
interface VectorEntry {
	id: string;
	/** Vector stored as array (json) or base64 (binary) */
	vector: number[] | string;
	metadata: Record<string, unknown>;
}

/**
 * Index file structure
 */
interface VectorIndex {
	version: 1;
	format: "json" | "binary";
	dimensions: number | null;
	entries: VectorEntry[];
}

/**
 * File-based vector store with persistent storage.
 *
 * Stores vectors to disk for semantic search persistence across restarts.
 * Optionally writes human-readable markdown summaries for user transparency.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({
 *     vectorStore: new FileVectorStore({
 *       basePath: './data/memories',
 *       writeSummaries: true,
 *     }),
 *   }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 * ```
 */
export class FileVectorStore implements VectorStore {
	private readonly basePath: string;
	private readonly writeSummaries: boolean;
	private readonly format: "json" | "binary";
	private readonly logger = new Logger({ name: "FileVectorStore" });

	private readonly indexPath: string;
	private readonly summariesPath: string;

	// In-memory cache of the index
	private index: VectorIndex | null = null;

	constructor(config: FileVectorStoreConfig) {
		this.basePath = config.basePath;
		this.writeSummaries = config.writeSummaries ?? true;
		this.format = config.format ?? "json";

		this.indexPath = join(this.basePath, "vectors.json");
		this.summariesPath = join(this.basePath, "summaries");

		// Ensure directories exist
		if (!existsSync(this.basePath)) {
			mkdirSync(this.basePath, { recursive: true });
		}
		if (this.writeSummaries && !existsSync(this.summariesPath)) {
			mkdirSync(this.summariesPath, { recursive: true });
		}

		// Load existing index
		this.loadIndex();

		this.logger.debug("Initialized", {
			basePath: this.basePath,
			format: this.format,
			writeSummaries: this.writeSummaries,
			existingEntries: this.index?.entries.length ?? 0,
		});
	}

	/**
	 * Upsert a vector with metadata.
	 */
	async upsert(params: {
		id: string;
		vector: number[];
		metadata: Record<string, unknown>;
	}): Promise<void> {
		this.ensureIndex();

		const { id, vector, metadata } = params;

		// Update dimensions if first entry
		if (this.index!.dimensions === null) {
			this.index!.dimensions = vector.length;
		}

		// Encode vector based on format
		const encodedVector =
			this.format === "binary" ? this.encodeVector(vector) : vector;

		// Find existing entry or add new
		const existingIdx = this.index!.entries.findIndex((e) => e.id === id);
		const entry: VectorEntry = {
			id,
			vector: encodedVector,
			metadata,
		};

		if (existingIdx >= 0) {
			this.index!.entries[existingIdx] = entry;
		} else {
			this.index!.entries.push(entry);
		}

		// Persist index
		this.saveIndex();

		// Write human-readable summary if enabled
		if (this.writeSummaries && metadata.content) {
			this.writeSummaryFile(id, metadata);
		}

		this.logger.debug("Vector upserted", { id });
	}

	/**
	 * Search for similar vectors.
	 */
	async search(params: {
		vector: number[];
		topK: number;
		filter?: Record<string, unknown>;
	}): Promise<
		Array<{ id: string; score: number; metadata: Record<string, unknown> }>
	> {
		this.ensureIndex();

		const { vector, topK, filter } = params;
		const results: Array<{
			id: string;
			score: number;
			metadata: Record<string, unknown>;
		}> = [];

		for (const entry of this.index!.entries) {
			// Apply filters
			if (filter && !this.matchesFilter(entry.metadata, filter)) {
				continue;
			}

			// Decode vector if binary format
			const entryVector =
				typeof entry.vector === "string"
					? this.decodeVector(entry.vector)
					: entry.vector;

			// Calculate cosine similarity
			const score = this.cosineSimilarity(vector, entryVector);

			results.push({
				id: entry.id,
				score,
				metadata: entry.metadata,
			});
		}

		// Sort by score descending and return top K
		return results.sort((a, b) => b.score - a.score).slice(0, topK);
	}

	/**
	 * Delete vectors by IDs or filter.
	 */
	async delete(params: {
		ids?: string[];
		filter?: Record<string, unknown>;
	}): Promise<number> {
		this.ensureIndex();

		const { ids, filter } = params;
		const initialCount = this.index!.entries.length;
		const deletedIds: string[] = [];

		if (ids && ids.length > 0) {
			// Delete by IDs
			this.index!.entries = this.index!.entries.filter((e) => {
				if (ids.includes(e.id)) {
					deletedIds.push(e.id);
					return false;
				}
				return true;
			});
		} else if (filter) {
			// Delete by filter
			this.index!.entries = this.index!.entries.filter((e) => {
				if (this.matchesFilter(e.metadata, filter)) {
					deletedIds.push(e.id);
					return false;
				}
				return true;
			});
		}

		const deleted = initialCount - this.index!.entries.length;

		if (deleted > 0) {
			// Persist changes
			this.saveIndex();

			// Delete summary files
			for (const id of deletedIds) {
				this.deleteSummaryFile(id);
			}

			this.logger.debug("Vectors deleted", { count: deleted });
		}

		return deleted;
	}

	/**
	 * Count vectors matching filter.
	 */
	async count(filter?: Record<string, unknown>): Promise<number> {
		this.ensureIndex();

		if (!filter) {
			return this.index!.entries.length;
		}

		return this.index!.entries.filter((e) =>
			this.matchesFilter(e.metadata, filter),
		).length;
	}

	/**
	 * Clear all vectors and summaries.
	 */
	clear(): void {
		this.index = this.createEmptyIndex();
		this.saveIndex();

		// Clear summaries directory
		if (this.writeSummaries && existsSync(this.summariesPath)) {
			const files = require("node:fs").readdirSync(this.summariesPath);
			for (const file of files) {
				try {
					unlinkSync(join(this.summariesPath, file));
				} catch {
					// Ignore errors
				}
			}
		}

		this.logger.debug("Store cleared");
	}

	/**
	 * Get path to summaries directory (for user access).
	 */
	getSummariesPath(): string {
		return this.summariesPath;
	}

	// ─────────────────────────────────────────────────────────────
	// Private methods
	// ─────────────────────────────────────────────────────────────

	private createEmptyIndex(): VectorIndex {
		return {
			version: 1,
			format: this.format,
			dimensions: null,
			entries: [],
		};
	}

	private loadIndex(): void {
		if (existsSync(this.indexPath)) {
			try {
				const content = readFileSync(this.indexPath, "utf-8");
				this.index = JSON.parse(content) as VectorIndex;
				this.logger.debug("Index loaded", {
					entries: this.index.entries.length,
				});
			} catch (error) {
				this.logger.warn("Failed to load index, creating new", {
					error: error instanceof Error ? error.message : String(error),
				});
				this.index = this.createEmptyIndex();
			}
		} else {
			this.index = this.createEmptyIndex();
		}
	}

	private saveIndex(): void {
		writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2), "utf-8");
	}

	private ensureIndex(): void {
		if (!this.index) {
			this.loadIndex();
		}
	}

	/**
	 * Encode vector to base64 for binary storage.
	 */
	private encodeVector(vector: number[]): string {
		const buffer = Buffer.from(new Float32Array(vector).buffer);
		return buffer.toString("base64");
	}

	/**
	 * Decode base64 to vector array.
	 */
	private decodeVector(encoded: string): number[] {
		const buffer = Buffer.from(encoded, "base64");
		return Array.from(new Float32Array(buffer.buffer));
	}

	/**
	 * Calculate cosine similarity between two vectors.
	 */
	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) return 0;

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		const denominator = Math.sqrt(normA) * Math.sqrt(normB);
		return denominator === 0 ? 0 : dotProduct / denominator;
	}

	/**
	 * Check if metadata matches filter criteria.
	 */
	private matchesFilter(
		metadata: Record<string, unknown>,
		filter: Record<string, unknown>,
	): boolean {
		for (const [key, value] of Object.entries(filter)) {
			if (metadata[key] !== value) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Write a human-readable markdown summary file.
	 */
	private writeSummaryFile(
		id: string,
		metadata: Record<string, unknown>,
	): void {
		const rawContent = metadata.content;
		if (!rawContent) return;

		// Parse if content is a JSON string (from VectorStorageProvider)
		let content: MemoryContent;
		if (typeof rawContent === "string") {
			try {
				content = JSON.parse(rawContent) as MemoryContent;
			} catch {
				return;
			}
		} else {
			content = rawContent as MemoryContent;
		}

		const lines: string[] = [];
		const timestamp = metadata.timestamp as string | undefined;
		const sessionId = metadata.sessionId as string | undefined;

		// Header
		lines.push("---");
		lines.push(`id: ${id}`);
		if (sessionId) lines.push(`session: ${sessionId}`);
		if (timestamp) lines.push(`date: ${timestamp}`);
		lines.push("---");
		lines.push("");

		// Summary
		if (content.summary) {
			lines.push("## Summary");
			lines.push("");
			lines.push(content.summary);
			lines.push("");
		}

		// Key Facts
		if (content.keyFacts && content.keyFacts.length > 0) {
			lines.push("## Key Facts");
			lines.push("");
			for (const fact of content.keyFacts) {
				lines.push(`- ${fact}`);
			}
			lines.push("");
		}

		// Entities
		if (content.entities && content.entities.length > 0) {
			lines.push("## People & Things Mentioned");
			lines.push("");
			for (const entity of content.entities) {
				const relation = entity.relation ? ` - ${entity.relation}` : "";
				lines.push(`- **${entity.name}** (${entity.type})${relation}`);
			}
			lines.push("");
		}

		// Topics
		if (content.segments && content.segments.length > 0) {
			lines.push("## Topics Discussed");
			lines.push("");
			for (const segment of content.segments) {
				lines.push(`### ${segment.topic}`);
				lines.push("");
				lines.push(segment.summary);
				lines.push("");
			}
		}

		// Write file
		const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
		const datePrefix = timestamp ? timestamp.split("T")[0] : "unknown";
		const filePath = join(this.summariesPath, `${datePrefix}_${safeId}.md`);

		writeFileSync(filePath, lines.join("\n"), "utf-8");
	}

	/**
	 * Delete a summary file.
	 */
	private deleteSummaryFile(id: string): void {
		if (!this.writeSummaries) return;

		const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");

		// Find and delete file (we don't know the exact date prefix)
		try {
			const files = require("node:fs").readdirSync(this.summariesPath);
			for (const file of files) {
				if (file.includes(safeId) && file.endsWith(".md")) {
					unlinkSync(join(this.summariesPath, file));
					break;
				}
			}
		} catch {
			// Ignore errors
		}
	}
}
