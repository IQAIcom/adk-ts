import { z } from "zod";
import type { AgentListItemDto as Agent } from "../../Api";

export interface Message {
	id: number;
	type: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	author?: string; // originating agent or 'user'
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
