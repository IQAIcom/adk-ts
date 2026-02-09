export interface Thread {
	id: string;
	resourceId: string;
	title?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type MessageType = "text" | "tool-call" | "tool-result";

export interface Message {
	id: string;
	threadId: string;
	role: MessageRole;
	content: string | MessageContent[];
	type: MessageType;
	createdAt: Date;
	toolCallId?: string;
	toolName?: string;
	toolArgs?: Record<string, unknown>;
}

export interface MessageContent {
	type: "text" | "image" | "tool-call" | "tool-result";
	text?: string;
	imageUrl?: string;
	toolCallId?: string;
	toolName?: string;
	toolArgs?: Record<string, unknown>;
	toolResult?: unknown;
}

export interface WorkingMemoryConfig {
	enabled: boolean;
	template?: string;
	scope?: "thread" | "resource";
}

export interface SemanticRecallConfig {
	topK: number;
	messageRange?: number | { before: number; after: number };
	threshold?: number;
}

export interface MemoryConfig {
	lastMessages?: number | false;
	semanticRecall?: boolean | SemanticRecallConfig;
	workingMemory?: WorkingMemoryConfig;
}

export const defaultMemoryConfig: MemoryConfig = {
	lastMessages: 40,
	semanticRecall: false,
	workingMemory: {
		enabled: false,
		template: `# User Information
- **Name**: 
- **Location**: 
- **Preferences**: 
- **Goals**: 
`,
		scope: "resource",
	},
};

export interface ThreadListOptions {
	resourceId?: string;
	limit?: number;
	offset?: number;
}

export interface ThreadListResult {
	threads: Thread[];
	total: number;
}

export interface MessageListOptions {
	threadId: string;
	limit?: number;
	before?: Date;
	after?: Date;
}

export interface RecallOptions {
	threadId: string;
	resourceId?: string;
	query?: string;
	config?: MemoryConfig;
}

export interface RecallResult {
	messages: Message[];
	workingMemory?: string | null;
}

export interface MemoryEmbeddingProvider {
	embed(text: string): Promise<number[]>;
	embedBatch?(texts: string[]): Promise<number[][]>;
	readonly dimensions: number;
}

export interface VectorSearchResult {
	messageId: string;
	score: number;
}

export interface MemoryStoreConfig {
	embeddingProvider?: MemoryEmbeddingProvider;
}
