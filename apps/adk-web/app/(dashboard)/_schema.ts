import { z } from "zod";

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

// Centralized Panel ID schema for type-safe usage across the app
export const PanelIdSchema = z.enum(["sessions", "events", "state", "graph"]);
export type PanelId = z.infer<typeof PanelIdSchema>;
export const PANEL_IDS = PanelIdSchema.options;
export const isPanelId = (value: unknown): value is PanelId =>
	PanelIdSchema.safeParse(value).success;

export interface PanelType {
	type: PanelId | null;
}

// Agent status tracking removed; agents are always available on-demand

export interface ChatState {
	messages: Message[];
	selectedAgent: Agent | null;
	selectedPanel: PanelId | null;
	currentSessionId: string | null;
}

export interface ConnectionState {
	apiUrl: string;
	connected: boolean;
	loading: boolean;
}
