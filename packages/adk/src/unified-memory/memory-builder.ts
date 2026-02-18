import { Event } from "../events/event";
import { EventActions } from "../events/event-actions";
import type { MemoryService } from "../memory/memory-service";
import type { MemorySearchResult } from "../memory/types";
import {
	type BaseSessionService,
	type ListSessionsResponse,
} from "../sessions/base-session-service";
import { InMemorySessionService } from "../sessions/in-memory-session-service";
import type { Session } from "../sessions/session";
import {
	defaultUnifiedMemoryConfig,
	type SimpleMessage,
	type UnifiedMemoryConfig,
} from "./types";

const WORKING_MEMORY_KEY = "__working_memory__";

export class MemoryBuilder {
	private sessionService: BaseSessionService;
	private memoryService?: MemoryService;
	private appName: string;
	private userId: string;
	private lastMessages: number | false;
	private workingMemoryEnabled: boolean;
	private workingMemoryTemplate?: string;

	constructor(config: UnifiedMemoryConfig) {
		this.appName = config.appName;
		this.userId = config.userId;
		this.lastMessages =
			config.lastMessages ?? defaultUnifiedMemoryConfig.lastMessages;
		this.sessionService = new InMemorySessionService();
		this.workingMemoryEnabled = config.workingMemory?.enabled ?? false;
		this.workingMemoryTemplate = config.workingMemory?.template;
	}

	static create(config: UnifiedMemoryConfig): MemoryBuilder {
		return new MemoryBuilder(config);
	}

	withSessionService(service: BaseSessionService): MemoryBuilder {
		this.sessionService = service;
		return this;
	}

	withMemoryService(service: MemoryService): MemoryBuilder {
		this.memoryService = service;
		return this;
	}

	withAppName(appName: string): MemoryBuilder {
		this.appName = appName;
		return this;
	}

	withUserId(userId: string): MemoryBuilder {
		this.userId = userId;
		return this;
	}

	async createSession(
		state?: Record<string, unknown>,
		sessionId?: string,
	): Promise<Session> {
		const initialState: Record<string, unknown> = { ...state };

		if (this.workingMemoryEnabled && this.workingMemoryTemplate) {
			initialState[WORKING_MEMORY_KEY] = this.workingMemoryTemplate;
		}

		return this.sessionService.createSession(
			this.appName,
			this.userId,
			initialState,
			sessionId,
		);
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		return this.sessionService.getSession(this.appName, this.userId, sessionId);
	}

	async listSessions(): Promise<ListSessionsResponse> {
		return this.sessionService.listSessions(this.appName, this.userId);
	}

	async deleteSession(sessionId: string): Promise<void> {
		return this.sessionService.deleteSession(
			this.appName,
			this.userId,
			sessionId,
		);
	}

	async addMessage(session: Session, message: SimpleMessage): Promise<Event> {
		const author =
			message.role === "user"
				? "user"
				: message.role === "assistant"
					? "model"
					: "system";

		const event = new Event({
			author,
			content: {
				role: author,
				parts: [{ text: message.content }],
			},
		});

		const appended = await this.sessionService.appendEvent(session, event);

		if (this.memoryService) {
			await this.memoryService.addSessionToMemory(session);
		}

		return appended;
	}

	async addEvent(session: Session, event: Event): Promise<Event> {
		const appended = await this.sessionService.appendEvent(session, event);

		if (this.memoryService) {
			await this.memoryService.addSessionToMemory(session);
		}

		return appended;
	}

	async recall(sessionId: string): Promise<SimpleMessage[]> {
		const session = await this.sessionService.getSession(
			this.appName,
			this.userId,
			sessionId,
			this.lastMessages === false
				? undefined
				: { numRecentEvents: this.lastMessages },
		);

		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		return session.events.map((event) => ({
			role: this.eventAuthorToRole(event.author),
			content: this.extractEventText(event),
		}));
	}

	async recallEvents(sessionId: string): Promise<Event[]> {
		const session = await this.sessionService.getSession(
			this.appName,
			this.userId,
			sessionId,
			this.lastMessages === false
				? undefined
				: { numRecentEvents: this.lastMessages },
		);

		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		return session.events;
	}

	async search(query: string): Promise<MemorySearchResult[]> {
		if (!this.memoryService) {
			throw new Error(
				"MemoryService is required for search. Use withMemoryService() to configure one.",
			);
		}

		return this.memoryService.search({
			query,
			userId: this.userId,
			appName: this.appName,
		});
	}

	async getWorkingMemory(sessionId: string): Promise<string | null> {
		const session = await this.sessionService.getSession(
			this.appName,
			this.userId,
			sessionId,
		);

		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		const stored = session.state[WORKING_MEMORY_KEY] as string | undefined;

		if (stored) return stored;

		if (this.workingMemoryEnabled && this.workingMemoryTemplate) {
			return this.workingMemoryTemplate;
		}

		return null;
	}

	async updateWorkingMemory(session: Session, content: string): Promise<void> {
		const event = new Event({
			author: "system",
			actions: new EventActions({
				stateDelta: { [WORKING_MEMORY_KEY]: content },
			}),
		});

		await this.sessionService.appendEvent(session, event);
	}

	async endSession(sessionId: string): Promise<Session | undefined> {
		const session = await this.sessionService.endSession(
			this.appName,
			this.userId,
			sessionId,
		);

		if (session && this.memoryService) {
			await this.memoryService.addSessionToMemory(session);
		}

		return session;
	}

	getSessionService(): BaseSessionService {
		return this.sessionService;
	}

	getMemoryService(): MemoryService | undefined {
		return this.memoryService;
	}

	private eventAuthorToRole(author: string): "user" | "assistant" | "system" {
		if (author === "user") return "user";
		if (author === "system") return "system";
		return "assistant";
	}

	private extractEventText(event: Event): string {
		if (event.text) return event.text;

		if (event.content?.parts && Array.isArray(event.content.parts)) {
			const textParts = event.content.parts
				.filter(
					(part: { text?: string }) =>
						typeof part.text === "string" && part.text.length > 0,
				)
				.map((part: { text: string }) => part.text);

			if (textParts.length > 0) return textParts.join(" ");
		}

		return "";
	}
}
