import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
	MemoryDeleteFilter,
	MemoryRecord,
	MemorySearchQuery,
	MemorySearchResult,
	MemoryStorageProvider,
} from "../types";

/**
 * Configuration for FileStorageProvider
 */
export interface FileStorageProviderConfig {
	/**
	 * Base directory path for storing memory files.
	 * Files will be organized as: basePath/{userId}/{appName}/
	 */
	basePath: string;

	/**
	 * File format for storing memories.
	 * - "json": Store as JSON files (default, easier to parse)
	 * - "markdown": Store as Markdown files (OpenClaw-style, human-readable)
	 */
	format?: "json" | "markdown";
}

/**
 * File-based storage provider for memories.
 *
 * Stores memories as files on disk, organized by user and app.
 * Supports both JSON and Markdown formats.
 *
 * This is similar to OpenClaw's file-based memory approach.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new FileStorageProvider({
 *     basePath: './data/memories',
 *     format: 'markdown',
 *   }),
 * });
 * ```
 */
export class FileStorageProvider implements MemoryStorageProvider {
	private readonly basePath: string;
	private readonly format: "json" | "markdown";

	// In-memory index for faster search
	private readonly index: Map<string, MemoryRecord> = new Map();
	private indexLoaded = false;

	constructor(config: FileStorageProviderConfig) {
		this.basePath = config.basePath;
		this.format = config.format ?? "json";

		// Ensure base directory exists
		if (!existsSync(this.basePath)) {
			mkdirSync(this.basePath, { recursive: true });
		}
	}

	/**
	 * Store a memory record to disk.
	 */
	async store(record: MemoryRecord): Promise<void> {
		const dirPath = this.getDirectoryPath(record.userId, record.appName);
		const filePath = this.getFilePath(record);

		// Ensure directory exists
		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}

		// Write file
		const content =
			this.format === "markdown"
				? this.recordToMarkdown(record)
				: JSON.stringify(record, null, 2);

		writeFileSync(filePath, content, "utf-8");

		// Update index
		this.index.set(record.id, record);
	}

	/**
	 * Search memories using keyword matching.
	 */
	async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
		// Ensure index is loaded
		await this.loadIndex(query.userId, query.appName);

		const searchTerms = query.query.toLowerCase().split(/\s+/);
		const results: MemorySearchResult[] = [];
		const limit = query.limit ?? 5;

		for (const record of this.index.values()) {
			// Filter by userId
			if (record.userId !== query.userId) continue;

			// Filter by appName if specified
			if (query.appName && record.appName !== query.appName) continue;

			// Apply additional filters
			if (query.filters) {
				if (
					query.filters.sessionId &&
					record.sessionId !== query.filters.sessionId
				)
					continue;
				if (query.filters.before && record.timestamp > query.filters.before)
					continue;
				if (query.filters.after && record.timestamp < query.filters.after)
					continue;
			}

			// Calculate relevance score
			const score = this.calculateScore(record, searchTerms);
			if (score > 0) {
				results.push({ memory: record, score });
			}
		}

		// Sort by score descending and apply limit
		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Delete memories matching the filter.
	 */
	async delete(filter: MemoryDeleteFilter): Promise<number> {
		let deleted = 0;

		// Find matching records
		const toDelete: MemoryRecord[] = [];

		for (const record of this.index.values()) {
			if (this.matchesFilter(record, filter)) {
				toDelete.push(record);
			}
		}

		// Delete files and update index
		for (const record of toDelete) {
			const filePath = this.getFilePath(record);

			try {
				if (existsSync(filePath)) {
					unlinkSync(filePath);
				}
				this.index.delete(record.id);
				deleted++;
			} catch {
				// Ignore errors for individual files
			}
		}

		return deleted;
	}

	/**
	 * Count memories matching the filter.
	 */
	async count(filter: MemoryDeleteFilter): Promise<number> {
		// Load all indexes if needed
		if (filter.userId && filter.appName) {
			await this.loadIndex(filter.userId, filter.appName);
		}

		let count = 0;

		for (const record of this.index.values()) {
			if (this.matchesFilter(record, filter)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Get the directory path for a user/app combination.
	 */
	private getDirectoryPath(userId: string, appName: string): string {
		// Sanitize paths to prevent directory traversal
		const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
		const safeAppName = appName.replace(/[^a-zA-Z0-9_-]/g, "_");

		return join(this.basePath, safeUserId, safeAppName);
	}

	/**
	 * Get the file path for a memory record.
	 */
	private getFilePath(record: MemoryRecord): string {
		const dirPath = this.getDirectoryPath(record.userId, record.appName);
		const extension = this.format === "markdown" ? "md" : "json";

		// Use date + session ID for filename (similar to OpenClaw)
		const date = record.timestamp.split("T")[0];
		const safeSessionId = record.sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");

		return join(dirPath, `${date}_${safeSessionId}_${record.id}.${extension}`);
	}

	/**
	 * Load index from disk for a user/app.
	 */
	private async loadIndex(userId: string, appName?: string): Promise<void> {
		if (this.indexLoaded) return;

		const userPath = join(
			this.basePath,
			userId.replace(/[^a-zA-Z0-9_-]/g, "_"),
		);

		if (!existsSync(userPath)) return;

		const appDirs = appName
			? [appName.replace(/[^a-zA-Z0-9_-]/g, "_")]
			: readdirSync(userPath);

		for (const appDir of appDirs) {
			const appPath = join(userPath, appDir);

			try {
				const files = readdirSync(appPath);

				for (const file of files) {
					const filePath = join(appPath, file);

					try {
						const record = this.readRecordFromFile(filePath);
						if (record) {
							this.index.set(record.id, record);
						}
					} catch {
						// Skip invalid files
					}
				}
			} catch {
				// Skip if directory doesn't exist or can't be read
			}
		}

		this.indexLoaded = true;
	}

	/**
	 * Read a memory record from a file.
	 */
	private readRecordFromFile(filePath: string): MemoryRecord | null {
		try {
			const content = readFileSync(filePath, "utf-8");

			if (filePath.endsWith(".json")) {
				return JSON.parse(content) as MemoryRecord;
			}
			if (filePath.endsWith(".md")) {
				return this.markdownToRecord(content, filePath);
			}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Convert a memory record to Markdown format.
	 */
	private recordToMarkdown(record: MemoryRecord): string {
		const lines: string[] = [];

		// Frontmatter
		lines.push("---");
		lines.push(`id: ${record.id}`);
		lines.push(`sessionId: ${record.sessionId}`);
		lines.push(`userId: ${record.userId}`);
		lines.push(`appName: ${record.appName}`);
		lines.push(`timestamp: ${record.timestamp}`);
		lines.push("---");
		lines.push("");

		// Summary
		if (record.content.summary) {
			lines.push("## Summary");
			lines.push("");
			lines.push(record.content.summary);
			lines.push("");
		}

		// Key Facts
		if (record.content.keyFacts && record.content.keyFacts.length > 0) {
			lines.push("## Key Facts");
			lines.push("");
			for (const fact of record.content.keyFacts) {
				lines.push(`- ${fact}`);
			}
			lines.push("");
		}

		// Entities
		if (record.content.entities && record.content.entities.length > 0) {
			lines.push("## Entities");
			lines.push("");
			for (const entity of record.content.entities) {
				const relation = entity.relation ? ` (${entity.relation})` : "";
				lines.push(`- **${entity.name}** [${entity.type}]${relation}`);
			}
			lines.push("");
		}

		// Segments
		if (record.content.segments && record.content.segments.length > 0) {
			lines.push("## Topics");
			lines.push("");
			for (const segment of record.content.segments) {
				lines.push(`### ${segment.topic}`);
				lines.push("");
				lines.push(segment.summary);
				if (segment.relevance) {
					lines.push("");
					lines.push(`*Relevance: ${segment.relevance}*`);
				}
				lines.push("");
			}
		}

		// Raw Text
		if (record.content.rawText) {
			lines.push("## Conversation");
			lines.push("");
			lines.push("```");
			lines.push(record.content.rawText);
			lines.push("```");
			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Parse a Markdown file back to a memory record.
	 */
	private markdownToRecord(
		content: string,
		_filePath: string,
	): MemoryRecord | null {
		try {
			// Parse frontmatter
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
			if (!frontmatterMatch) return null;

			const frontmatter: Record<string, string> = {};
			for (const line of frontmatterMatch[1].split("\n")) {
				const [key, ...valueParts] = line.split(": ");
				if (key && valueParts.length > 0) {
					frontmatter[key.trim()] = valueParts.join(": ").trim();
				}
			}

			// Extract sections
			const body = content.slice(frontmatterMatch[0].length);

			// Simple extraction - look for summary section
			const summaryMatch = body.match(/## Summary\n\n([\s\S]*?)(?=\n##|$)/);
			const summary = summaryMatch ? summaryMatch[1].trim() : undefined;

			// Extract raw text from conversation section
			const rawTextMatch = body.match(
				/## Conversation\n\n```\n([\s\S]*?)\n```/,
			);
			const rawText = rawTextMatch ? rawTextMatch[1] : undefined;

			return {
				id: frontmatter.id || "",
				sessionId: frontmatter.sessionId || "",
				userId: frontmatter.userId || "",
				appName: frontmatter.appName || "",
				timestamp: frontmatter.timestamp || "",
				content: {
					summary,
					rawText,
				},
			};
		} catch {
			return null;
		}
	}

	/**
	 * Calculate keyword match score.
	 */
	private calculateScore(record: MemoryRecord, searchTerms: string[]): number {
		const content = record.content;
		const searchableTexts: string[] = [];

		if (content.summary) searchableTexts.push(content.summary);
		if (content.rawText) searchableTexts.push(content.rawText);
		if (content.keyFacts) searchableTexts.push(...content.keyFacts);
		if (content.segments) {
			for (const seg of content.segments) {
				searchableTexts.push(seg.topic, seg.summary);
			}
		}
		if (content.entities) {
			for (const entity of content.entities) {
				searchableTexts.push(entity.name);
				if (entity.relation) searchableTexts.push(entity.relation);
			}
		}

		const fullText = searchableTexts.join(" ").toLowerCase();
		let matches = 0;

		for (const term of searchTerms) {
			if (fullText.includes(term)) matches++;
		}

		return searchTerms.length > 0 ? matches / searchTerms.length : 0;
	}

	/**
	 * Check if a record matches the given filter.
	 */
	private matchesFilter(
		record: MemoryRecord,
		filter: MemoryDeleteFilter,
	): boolean {
		if (filter.ids && filter.ids.length > 0) {
			return filter.ids.includes(record.id);
		}

		if (filter.userId && record.userId !== filter.userId) return false;
		if (filter.appName && record.appName !== filter.appName) return false;
		if (filter.sessionId && record.sessionId !== filter.sessionId) return false;
		if (filter.before && record.timestamp > filter.before) return false;
		if (filter.after && record.timestamp < filter.after) return false;

		return true;
	}
}
