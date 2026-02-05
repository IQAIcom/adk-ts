import type { VectorStore } from "./vector-storage-provider";

// Import types only - these are stripped at compile time
import type {
	QdrantClient as QdrantClientType,
	QdrantClientParams,
} from "@qdrant/js-client-rest";

/**
 * Configuration for QdrantVectorStore.
 */
export interface QdrantVectorStoreConfig {
	/**
	 * Qdrant server URL.
	 * @default "http://localhost:6333"
	 */
	url?: string;

	/**
	 * API key for Qdrant Cloud or authenticated instances.
	 */
	apiKey?: string;

	/**
	 * Collection name to use for storing vectors.
	 * @default "memories"
	 */
	collectionName?: string;

	/**
	 * Vector dimensions. Required for auto-creating collections.
	 * If not provided, collection must already exist.
	 */
	dimensions?: number;

	/**
	 * Distance metric for similarity search.
	 * @default "Cosine"
	 */
	distance?: "Cosine" | "Euclid" | "Dot";

	/**
	 * Whether to create the collection if it doesn't exist.
	 * @default true
	 */
	createCollectionIfNotExists?: boolean;

	/**
	 * Use HTTPS for connection.
	 * @default false (auto-detected from URL)
	 */
	https?: boolean;
}

// Internal types for Qdrant client operations
interface QdrantCondition {
	key: string;
	match: { value?: string | number | boolean; any?: (string | number)[] };
}

interface QdrantFilter {
	must?: (QdrantCondition | { has_id: string[] })[];
}

interface QdrantSearchResult {
	id: string | number;
	score: number;
	payload?: Record<string, unknown>;
}

interface QdrantCollectionInfo {
	vectors_count?: number;
	points_count?: number;
	status: string;
}

interface QdrantScrollResult {
	points: Array<{ id: string | number }>;
}

interface QdrantCountResult {
	count: number;
}

/**
 * Qdrant vector store adapter for production vector search.
 *
 * Qdrant is a high-performance vector database with filtering,
 * payload storage, and distributed deployment support.
 *
 * Requires `@qdrant/js-client-rest` package to be installed:
 * ```bash
 * pnpm add @qdrant/js-client-rest
 * ```
 *
 * @example
 * ```typescript
 * // Local Qdrant instance
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({
 *     vectorStore: new QdrantVectorStore({
 *       url: "http://localhost:6333",
 *       collectionName: "agent-memories",
 *       dimensions: 1536, // OpenAI ada-002 dimensions
 *     }),
 *   }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 *
 * // Qdrant Cloud
 * const cloudStore = new QdrantVectorStore({
 *   url: "https://your-cluster.qdrant.io",
 *   apiKey: process.env.QDRANT_API_KEY,
 *   collectionName: "memories",
 *   dimensions: 1536,
 * });
 * ```
 */
export class QdrantVectorStore implements VectorStore {
	private readonly url: string;
	private readonly apiKey?: string;
	private readonly collectionName: string;
	private readonly dimensions?: number;
	private readonly distance: "Cosine" | "Euclid" | "Dot";
	private readonly createCollectionIfNotExists: boolean;
	private readonly https: boolean;

	private client: QdrantClientType | null = null;
	private initialized = false;

	constructor(config: QdrantVectorStoreConfig = {}) {
		this.url = config.url ?? "http://localhost:6333";
		this.apiKey = config.apiKey;
		this.collectionName = config.collectionName ?? "memories";
		this.dimensions = config.dimensions;
		this.distance = config.distance ?? "Cosine";
		this.createCollectionIfNotExists =
			config.createCollectionIfNotExists ?? true;
		this.https = config.https ?? this.url.startsWith("https");
	}

	/**
	 * Initialize the Qdrant client and ensure collection exists.
	 */
	private async ensureInitialized(): Promise<QdrantClientType> {
		if (this.client && this.initialized) {
			return this.client;
		}

		// Dynamic require to make Qdrant optional
		let QdrantClient: new (config: QdrantClientParams) => QdrantClientType;

		try {
			({ QdrantClient } = require("@qdrant/js-client-rest"));
		} catch {
			throw new Error(
				"QdrantVectorStore requires @qdrant/js-client-rest package. Install it with: pnpm add @qdrant/js-client-rest",
			);
		}

		// Parse URL to extract host and port
		const parsedUrl = new URL(this.url);
		const host = parsedUrl.hostname;
		const port = parsedUrl.port
			? Number.parseInt(parsedUrl.port, 10)
			: this.https
				? 443
				: 6333;

		this.client = new QdrantClient({
			host,
			port,
			apiKey: this.apiKey,
			https: this.https,
		});

		// Check if collection exists and create if needed
		if (this.createCollectionIfNotExists) {
			await this.ensureCollectionExists();
		}

		this.initialized = true;
		return this.client;
	}

	/**
	 * Ensure the collection exists, creating it if necessary.
	 */
	private async ensureCollectionExists(): Promise<void> {
		if (!this.client) return;

		try {
			await this.client.getCollection(this.collectionName);
		} catch {
			// Collection doesn't exist, create it
			if (!this.dimensions) {
				throw new Error(
					`QdrantVectorStore: Collection "${this.collectionName}" does not exist and no dimensions specified. ` +
						"Either create the collection manually or provide dimensions in config.",
				);
			}

			await this.client.createCollection(this.collectionName, {
				vectors: {
					size: this.dimensions,
					distance: this.distance,
				},
			});

			// Create payload indices for common filter fields
			await this.createPayloadIndices();
		}
	}

	/**
	 * Create payload indices for efficient filtering.
	 */
	private async createPayloadIndices(): Promise<void> {
		if (!this.client) return;

		const indexFields = ["userId", "appName", "sessionId", "namespace"];

		for (const field of indexFields) {
			try {
				await this.client.createPayloadIndex(this.collectionName, {
					field_name: field,
					field_schema: "keyword",
				});
			} catch {
				// Index may already exist, ignore error
			}
		}

		// Timestamp index for range queries
		try {
			await this.client.createPayloadIndex(this.collectionName, {
				field_name: "timestamp",
				field_schema: "keyword",
			});
		} catch {
			// Ignore
		}
	}

	/**
	 * Upsert a vector with metadata.
	 */
	async upsert(params: {
		id: string;
		vector: number[];
		metadata: Record<string, unknown>;
	}): Promise<void> {
		const client = await this.ensureInitialized();

		await client.upsert(this.collectionName, {
			wait: true,
			points: [
				{
					id: params.id,
					vector: params.vector,
					payload: params.metadata,
				},
			],
		});
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
		const client = await this.ensureInitialized();

		const searchParams: {
			vector: number[];
			limit: number;
			with_payload: boolean;
			filter?: QdrantFilter;
		} = {
			vector: params.vector,
			limit: params.topK,
			with_payload: true,
		};

		// Convert filter to Qdrant format
		if (params.filter && Object.keys(params.filter).length > 0) {
			searchParams.filter = this.buildQdrantFilter(params.filter);
		}

		const results: QdrantSearchResult[] = await client.search(
			this.collectionName,
			searchParams,
		);

		return results.map((point) => ({
			id: String(point.id),
			score: point.score,
			metadata: (point.payload as Record<string, unknown>) ?? {},
		}));
	}

	/**
	 * Delete vectors by IDs or filter.
	 */
	async delete(params: {
		ids?: string[];
		filter?: Record<string, unknown>;
	}): Promise<number> {
		const client = await this.ensureInitialized();

		// Get count before deletion for accurate return value
		let countBefore = 0;
		try {
			if (params.ids) {
				// Count points by IDs
				const scrollResult: QdrantScrollResult = await client.scroll(
					this.collectionName,
					{
						filter: {
							must: [
								{
									has_id: params.ids,
								},
							],
						},
						limit: params.ids.length,
						with_payload: false,
						with_vector: false,
					},
				);
				countBefore = scrollResult.points.length;
			} else if (params.filter) {
				const qdrantFilter = this.buildQdrantFilter(params.filter);
				const countResult: QdrantCountResult = await client.count(
					this.collectionName,
					{
						filter: qdrantFilter,
						exact: true,
					},
				);
				countBefore = countResult.count;
			}
		} catch {
			// Ignore count errors
		}

		if (params.ids && params.ids.length > 0) {
			await client.delete(this.collectionName, {
				wait: true,
				points: params.ids,
			});
		} else if (params.filter) {
			const qdrantFilter = this.buildQdrantFilter(params.filter);
			await client.delete(this.collectionName, {
				wait: true,
				filter: qdrantFilter,
			});
		}

		return countBefore;
	}

	/**
	 * Count vectors matching filter.
	 */
	async count(filter?: Record<string, unknown>): Promise<number> {
		const client = await this.ensureInitialized();

		const countParams: { filter?: QdrantFilter; exact: boolean } = {
			exact: true,
		};

		if (filter && Object.keys(filter).length > 0) {
			countParams.filter = this.buildQdrantFilter(filter);
		}

		const result: QdrantCountResult = await client.count(
			this.collectionName,
			countParams,
		);
		return result.count;
	}

	/**
	 * Convert generic filter to Qdrant filter format.
	 */
	private buildQdrantFilter(filter: Record<string, unknown>): QdrantFilter {
		const must: QdrantCondition[] = [];

		for (const [key, value] of Object.entries(filter)) {
			if (value === undefined || value === null) {
				continue;
			}

			if (
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				must.push({
					key,
					match: { value },
				});
			} else if (Array.isArray(value)) {
				// Handle array values with "any" match
				must.push({
					key,
					match: { any: value as (string | number)[] },
				});
			}
		}

		return must.length > 0 ? { must } : {};
	}

	/**
	 * Delete the collection entirely.
	 */
	async deleteCollection(): Promise<void> {
		const client = await this.ensureInitialized();
		await client.deleteCollection(this.collectionName);
		this.initialized = false;
	}

	/**
	 * Get collection info.
	 */
	async getCollectionInfo(): Promise<{
		vectorsCount: number;
		pointsCount: number;
		status: string;
	}> {
		const client = await this.ensureInitialized();
		const info: QdrantCollectionInfo = await client.getCollection(
			this.collectionName,
		);

		return {
			vectorsCount: info.vectors_count ?? 0,
			pointsCount: info.points_count ?? 0,
			status: info.status,
		};
	}
}
