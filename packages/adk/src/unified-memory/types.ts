export interface UnifiedMemoryConfig {
	appName: string;
	userId: string;
	lastMessages?: number | false;
	workingMemory?: WorkingMemoryConfig;
}

export interface WorkingMemoryConfig {
	enabled: boolean;
	template?: string;
}

export interface SimpleMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

export const defaultUnifiedMemoryConfig = {
	lastMessages: 40,
};
