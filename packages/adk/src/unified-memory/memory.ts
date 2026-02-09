import type {
	Thread,
	Message,
	MemoryConfig,
	ThreadListOptions,
	ThreadListResult,
	RecallOptions,
	RecallResult,
	MemoryEmbeddingProvider,
	SemanticRecallConfig,
} from "./types";
import { defaultMemoryConfig } from "./types";
import type { MemoryStore } from "./memory-store";
import { InMemoryStore } from "./memory-store";

function generateId(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface MemoryOptions {
	store?: MemoryStore;
	config?: MemoryConfig;
	embeddingProvider?: MemoryEmbeddingProvider;
}

export class Memory {
	private store: MemoryStore;
	private config: MemoryConfig;
	private embeddingProvider?: MemoryEmbeddingProvider;

	constructor(options?: MemoryOptions) {
		this.config = { ...defaultMemoryConfig, ...options?.config };
		this.embeddingProvider = options?.embeddingProvider;

		if (options?.store) {
			this.store = options.store;
		} else {
			this.store = new InMemoryStore({
				embeddingProvider: this.embeddingProvider,
			});
		}
	}

	getConfig(): MemoryConfig {
		return { ...this.config };
	}

	async createThread(options: {
		resourceId: string;
		threadId?: string;
		title?: string;
		metadata?: Record<string, unknown>;
	}): Promise<Thread> {
		const thread: Thread = {
			id: options.threadId ?? `thread_${generateId()}`,
			resourceId: options.resourceId,
			title: options.title ?? `Thread ${new Date().toISOString()}`,
			metadata: options.metadata,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return this.store.saveThread(thread);
	}

	async getThread(threadId: string): Promise<Thread | null> {
		return this.store.getThread(threadId);
	}

	async listThreads(options?: ThreadListOptions): Promise<ThreadListResult> {
		return this.store.listThreads(options);
	}

	async updateThread(
		threadId: string,
		updates: Partial<Pick<Thread, "title" | "metadata">>,
	): Promise<Thread | null> {
		const existing = await this.store.getThread(threadId);
		if (!existing) return null;

		const updated: Thread = {
			...existing,
			...updates,
			updatedAt: new Date(),
		};

		return this.store.saveThread(updated);
	}

	async deleteThread(threadId: string): Promise<void> {
		return this.store.deleteThread(threadId);
	}

	async addMessages(
		threadId: string,
		messages: Array<Omit<Message, "id" | "threadId" | "createdAt">>,
	): Promise<Message[]> {
		const thread = await this.store.getThread(threadId);
		if (!thread) {
			throw new Error(`Thread not found: ${threadId}`);
		}

		const now = new Date();
		const fullMessages: Message[] = messages.map((m, index) => ({
			...m,
			id: `msg_${generateId()}_${index}`,
			threadId,
			createdAt: new Date(now.getTime() + index),
		}));

		const saved = await this.store.saveMessages(fullMessages);

		await this.store.saveThread({
			...thread,
			updatedAt: new Date(),
		});

		return saved;
	}

	async recall(options: RecallOptions): Promise<RecallResult> {
		const config = { ...this.config, ...options.config };
		let messages: Message[] = [];

		const lastMessages =
			config.lastMessages === false ? 0 : (config.lastMessages ?? 40);

		if (lastMessages > 0) {
			messages = await this.store.getMessages({
				threadId: options.threadId,
				limit: lastMessages,
			});
		}

		if (config.semanticRecall && options.query && this.store.vectorSearch) {
			const semanticConfig: SemanticRecallConfig =
				typeof config.semanticRecall === "object"
					? config.semanticRecall
					: { topK: 3 };

			const searchResults = await this.store.vectorSearch(options.query, {
				threadId: options.threadId,
				resourceId: options.resourceId,
				topK: semanticConfig.topK,
			});

			if (searchResults.length > 0) {
				const existingIds = new Set(messages.map((m) => m.id));
				const allThreadMessages = await this.store.getMessages({
					threadId: options.threadId,
				});

				for (const result of searchResults) {
					if (
						semanticConfig.threshold &&
						result.score < semanticConfig.threshold
					) {
						continue;
					}

					if (!existingIds.has(result.messageId)) {
						const semanticMessage = allThreadMessages.find(
							(m) => m.id === result.messageId,
						);
						if (semanticMessage) {
							messages.unshift(semanticMessage);
							existingIds.add(result.messageId);
						}
					}
				}
			}
		}

		messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

		let workingMemory: string | null = null;
		if (config.workingMemory?.enabled) {
			const scope = config.workingMemory.scope ?? "resource";
			const key =
				scope === "thread"
					? `thread:${options.threadId}:working_memory`
					: `resource:${options.resourceId}:working_memory`;

			workingMemory = await this.store.getWorkingMemory(key);

			if (!workingMemory && config.workingMemory.template) {
				workingMemory = config.workingMemory.template;
			}
		}

		return { messages, workingMemory };
	}

	async getWorkingMemory(options: {
		threadId: string;
		resourceId?: string;
	}): Promise<string | null> {
		const scope = this.config.workingMemory?.scope ?? "resource";
		const key =
			scope === "thread"
				? `thread:${options.threadId}:working_memory`
				: `resource:${options.resourceId}:working_memory`;

		return this.store.getWorkingMemory(key);
	}

	async updateWorkingMemory(options: {
		threadId: string;
		resourceId?: string;
		content: string;
	}): Promise<void> {
		const scope = this.config.workingMemory?.scope ?? "resource";
		const key =
			scope === "thread"
				? `thread:${options.threadId}:working_memory`
				: `resource:${options.resourceId}:working_memory`;

		return this.store.saveWorkingMemory(key, options.content);
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		return this.store.deleteMessages(messageIds);
	}

	getStore(): MemoryStore {
		return this.store;
	}
}

export function createMemory(options?: MemoryOptions): Memory {
	return new Memory(options);
}
