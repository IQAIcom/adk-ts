import type { EnhancedRunner, LlmAgent } from "@iqai/adk";

export interface Agent {
	relativePath: string;
	name: string;
	absolutePath: string;
	instance?: LlmAgent; // Store the loaded agent instance
}

export interface LoadedAgent {
	agent: LlmAgent;
	runner: EnhancedRunner; // AgentBuilder's enhanced runner
	sessionId: string; // Session ID for this agent instance
	userId: string; // User ID for session management
	appName: string; // App name for session management
}

export interface ServerConfig {
	agentsDir: string;
	port: number;
	host: string;
	quiet: boolean;
}

export interface AgentListResponse {
	path: string;
	name: string;
	directory: string;
	relativePath: string;
}

export interface MessageRequest {
	message: string;
}

export interface MessageResponse {
	response: string;
}

export interface MessagesResponse {
	messages: Array<{
		id: number;
		type: "user" | "assistant";
		content: string;
		timestamp: string;
	}>;
}
