import type {
	Thread,
	Message,
	ThreadListOptions,
	ThreadListResult,
	MessageListOptions,
	MemoryEmbeddingProvider,
	VectorSearchResult,
} from "./types";

export interface MemoryStore {
	saveThread(thread: Thread): Promise<Thread>;
	getThread(threadId: string): Promise<Thread | null>;
	listThreads(options?: ThreadListOptions): Promise<ThreadListResult>;
	deleteThread(threadId: string): Promise<void>;

	saveMessages(messages: Message[]): Promise<Message[]>;
	getMessages(options: MessageListOptions): Promise<Message[]>;
	deleteMessages(messageIds: string[]): Promise<void>;

	getWorkingMemory(key: string): Promise<string | null>;
	saveWorkingMemory(key: string, content: string): Promise<void>;

	vectorSearch?(
		query: string,
		options: { threadId?: string; resourceId?: string; topK: number },
	): Promise<VectorSearchResult[]>;
}

export class InMemoryStore implements MemoryStore {
	private threads: Map<string, Thread> = new Map();
	private messages: Map<string, Message[]> = new Map();
	private workingMemory: Map<string, string> = new Map();
	private embeddings: Map<string, number[]> = new Map();
	private embeddingProvider?: MemoryEmbeddingProvider;

	constructor(config?: { embeddingProvider?: MemoryEmbeddingProvider }) {
		this.embeddingProvider = config?.embeddingProvider;
	}

	async saveThread(thread: Thread): Promise<Thread> {
		const existing = this.threads.get(thread.id);
		const savedThread = {
			...thread,
			updatedAt: new Date(),
			createdAt: existing?.createdAt ?? thread.createdAt ?? new Date(),
		};
		this.threads.set(thread.id, savedThread);
		return savedThread;
	}

	async getThread(threadId: string): Promise<Thread | null> {
		return this.threads.get(threadId) ?? null;
	}

	async listThreads(options?: ThreadListOptions): Promise<ThreadListResult> {
		let threads = Array.from(this.threads.values());

		if (options?.resourceId) {
			threads = threads.filter((t) => t.resourceId === options.resourceId);
		}

		threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		const total = threads.length;
		const offset = options?.offset ?? 0;
		const limit = options?.limit ?? 100;

		return {
			threads: threads.slice(offset, offset + limit),
			total,
		};
	}

	async deleteThread(threadId: string): Promise<void> {
		this.threads.delete(threadId);
		this.messages.delete(threadId);
		for (const [key] of this.workingMemory) {
			if (key.startsWith(`thread:${threadId}`)) {
				this.workingMemory.delete(key);
			}
		}
	}

	async saveMessages(messages: Message[]): Promise<Message[]> {
		for (const message of messages) {
			const threadMessages = this.messages.get(message.threadId) ?? [];
			const existingIndex = threadMessages.findIndex(
				(m) => m.id === message.id,
			);

			if (existingIndex >= 0) {
				threadMessages[existingIndex] = message;
			} else {
				threadMessages.push(message);
			}

			this.messages.set(message.threadId, threadMessages);

			if (this.embeddingProvider && typeof message.content === "string") {
				const embedding = await this.embeddingProvider.embed(message.content);
				this.embeddings.set(message.id, embedding);
			}
		}

		return messages;
	}

	async getMessages(options: MessageListOptions): Promise<Message[]> {
		let messages = this.messages.get(options.threadId) ?? [];

		if (options.after) {
			messages = messages.filter((m) => m.createdAt > options.after!);
		}

		if (options.before) {
			messages = messages.filter((m) => m.createdAt < options.before!);
		}

		messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

		if (options.limit) {
			messages = messages.slice(-options.limit);
		}

		return messages;
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		for (const [threadId, threadMessages] of this.messages) {
			const filtered = threadMessages.filter((m) => !messageIds.includes(m.id));
			this.messages.set(threadId, filtered);
		}

		for (const id of messageIds) {
			this.embeddings.delete(id);
		}
	}

	async getWorkingMemory(key: string): Promise<string | null> {
		return this.workingMemory.get(key) ?? null;
	}

	async saveWorkingMemory(key: string, content: string): Promise<void> {
		this.workingMemory.set(key, content);
	}

	async vectorSearch(
		query: string,
		options: { threadId?: string; resourceId?: string; topK: number },
	): Promise<VectorSearchResult[]> {
		if (!this.embeddingProvider) {
			return [];
		}

		const queryEmbedding = await this.embeddingProvider.embed(query);
		const results: VectorSearchResult[] = [];

		let candidateMessages: Message[] = [];

		if (options.threadId) {
			candidateMessages = this.messages.get(options.threadId) ?? [];
		} else if (options.resourceId) {
			for (const [, msgs] of this.messages) {
				candidateMessages.push(...msgs);
			}
		} else {
			for (const [, msgs] of this.messages) {
				candidateMessages.push(...msgs);
			}
		}

		for (const message of candidateMessages) {
			const embedding = this.embeddings.get(message.id);
			if (!embedding) continue;

			const score = this.cosineSimilarity(queryEmbedding, embedding);
			results.push({ messageId: message.id, score });
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, options.topK);
	}

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

		const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
		return magnitude === 0 ? 0 : dotProduct / magnitude;
	}

	clear(): void {
		this.threads.clear();
		this.messages.clear();
		this.workingMemory.clear();
		this.embeddings.clear();
	}
}
