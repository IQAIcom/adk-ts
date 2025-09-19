import type { BaseAgent, EnhancedRunner } from "@iqai/adk";

export interface Agent {
	relativePath: string;
	name: string;
	absolutePath: string;
	projectRoot: string;
	instance?: BaseAgent; // Store the loaded agent instance
}

export interface LoadedAgent {
	agent: BaseAgent;
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
	attachments?: Array<{
		name: string;
		mimeType: string;
		data: string; // base64-encoded content
	}>;
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

export interface SessionResponse {
	id: string;
	appName: string;
	userId: string;
	state: Record<string, any>;
	eventCount: number;
	lastUpdateTime: number;
	createdAt: number;
}

export interface SessionsResponse {
	sessions: SessionResponse[];
}

export interface CreateSessionRequest {
	state?: Record<string, any>;
	sessionId?: string;
}

export interface EventsResponse {
	events: Array<{
		id: string;
		author: string;
		timestamp: number;
		content: any;
		actions: any;
		functionCalls: any[];
		functionResponses: any[];
		branch?: string;
		isFinalResponse: boolean;
	}>;
	totalCount: number;
}

export interface StateResponse {
	agentState: Record<string, any>;
	userState: Record<string, any>;
	sessionState: Record<string, any>;
	metadata: {
		lastUpdated: number;
		changeCount: number;
		totalKeys: number;
		sizeBytes: number;
	};
}

export interface StateUpdateRequest {
	path: string;
	value: any;
}
