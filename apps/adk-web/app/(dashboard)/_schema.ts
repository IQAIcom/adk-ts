export interface Agent {
	path: string;
	name: string;
	directory: string;
	relativePath: string;
}

export interface Message {
	id: number;
	type: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
}

export interface Session {
	id: string;
	appName: string;
	userId: string;
	state: Record<string, any>;
	eventCount: number;
	lastUpdateTime: number;
	createdAt: number;
}

export interface Event {
	id: string;
	author: string;
	timestamp: number;
	content: any;
	actions: any;
	functionCalls: any[];
	functionResponses: any[];
	branch?: string;
	isFinalResponse: boolean;
}

export interface PanelType {
	type: "sessions" | "events" | "state" | null;
}

// Agent status tracking removed; agents are always available on-demand

export interface ChatState {
	messages: Message[];
	selectedAgent: Agent | null;
	selectedPanel: PanelType["type"];
	currentSessionId: string | null;
}

export interface ConnectionState {
	apiUrl: string;
	connected: boolean;
	loading: boolean;
}
