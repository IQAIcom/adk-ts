import type { BaseAgent } from "./agents/base-agent";
import { InvocationContext } from "./agents/invocation-context";
import { RunConfig } from "./agents/run-config";
import { Event } from "./events/event";
import type { BaseMemoryService } from "./memory/base-memory-service";
import { InMemoryMemoryService } from "./memory/in-memory-memory-service";
import type { Message } from "./models/llm-request";
import type { SessionService } from "./sessions/base-session-service";
import { InMemorySessionService } from "./sessions/in-memory-session-service";
import type { Session } from "./sessions/session";
import type { MessageRole } from "./models/llm-request";

/**
 * The Runner class is used to run agents.
 * It manages the execution of an agent within a session, handling message
 * processing, event generation, and interaction with various services.
 */
export class Runner {
	/**
	 * The app name of the runner.
	 */
	appName: string;

	/**
	 * The root agent to run.
	 */
	agent: BaseAgent;

	/**
	 * The session service for the runner.
	 */
	sessionService: SessionService;

	/**
	 * The memory service for the runner.
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Initializes the Runner.
	 */
	constructor({
		appName,
		agent,
		sessionService,
		memoryService,
	}: {
		appName: string;
		agent: BaseAgent;
		sessionService: SessionService;
		memoryService?: BaseMemoryService;
	}) {
		this.appName = appName;
		this.agent = agent;
		this.sessionService = sessionService;
		this.memoryService = memoryService;
	}

	/**
	 * Main entry method to run the agent in this runner.
	 */
	async *runAsync({
		userId,
		sessionId,
		newMessage,
		runConfig = new RunConfig(),
	}: {
		userId: string;
		sessionId: string;
		newMessage: Message;
		runConfig?: RunConfig;
	}): AsyncGenerator<Event, void, unknown> {
		// Get the session
		const session = await this.sessionService.getSession(sessionId);
		if (!session) {
			throw new Error(`Session not found: ${sessionId}`);
		}

		// Create invocation context
		const invocationContext = this._newInvocationContext({
			session,
			newMessage,
			runConfig,
		});

		// Append new message to session if provided
		if (newMessage) {
			await this._appendNewMessageToSession({
				session,
				newMessage,
				invocationContext,
			});
		}

		// Get responses from agent
		let lastPartialEvent: Event | null = null;
		let assistantContent = "";

		try {
			// Run the agent and yield events
			for await (const response of this.agent.runStreaming(invocationContext)) {
				const event = new Event({
					invocationId: invocationContext.sessionId,
					author: "assistant",
					content: response.content || "",
					function_call: response.function_call,
					tool_calls: response.tool_calls,
					partial: response.is_partial,
					raw_response: response.raw_response,
				});
				if (!event.is_partial && event.content) {
					session.messages = session.messages || [];
					session.messages.push({
						role: "assistant" as MessageRole,
						content: event.content,
					});
					await this.sessionService.appendEvent(session, event);
				}

				// Track partial events for debugging
				if (event.is_partial) {
					lastPartialEvent = event;
				}

				if (response.role === "assistant" && response.content) {
					assistantContent += response.content;
				}

				yield event;
			}

			if (assistantContent.trim()) {
				session.messages = session.messages || [];
				session.messages.push({
					role: "assistant",
					content: assistantContent,
				});
				await this.sessionService.updateSession(session);
			}
		} catch (error) {
			console.error("Error running agent:", error);

			// If we had partial events but no final event, create a final event
			if (lastPartialEvent && session.events && session.events.length === 0) {
				const finalEvent = new Event({
					invocationId: invocationContext.sessionId,
					author: "assistant",
					content: "Sorry, there was an error processing your request.",
					partial: false,
				});
				await this.sessionService.appendEvent(session, finalEvent);
				yield finalEvent;
			}

			throw error;
		}
	}

	/**
	 * Appends a new message to the session.
	 */
	private async _appendNewMessageToSession({
		session,
		newMessage,
		invocationContext,
	}: {
		session: Session;
		newMessage: Message;
		invocationContext: InvocationContext;
	}): Promise<void> {
		// Create and append the event
		const event = new Event({
			invocationId: invocationContext.sessionId, // Using sessionId as invocationId for now
			author: "user",
			content:
				typeof newMessage.content === "string" ? newMessage.content : null,
		});

		if (event.author === "user" || event.author === "assistant") {
			session.messages = session.messages || [];
			session.messages.push({
				role: event.author as MessageRole,
				content: event.content,
			});
		}
		await this.sessionService.appendEvent(session, event);
	}

	/**
	 * Creates a new invocation context.
	 */
	private _newInvocationContext({
		session,
		newMessage,
		runConfig = new RunConfig(),
	}: {
		session: Session;
		newMessage?: Message;
		runConfig?: RunConfig;
	}): InvocationContext {
		return new InvocationContext({
			sessionId: session.id,
			messages: [
				...(session.messages || []),
				...(newMessage ? [newMessage] : []),
			],
			config: runConfig,
			userId: session.userId,
			appName: this.appName,
			sessionService: this.sessionService,
			memoryService: this.memoryService,
			metadata: session.metadata || {},
		});
	}
}

/**
 * An in-memory Runner for testing and development.
 */
export class InMemoryRunner extends Runner {
	/**
	 * Initializes the InMemoryRunner.
	 */
	constructor(
		agent: BaseAgent,
		{ appName = "InMemoryRunner" }: { appName?: string } = {},
	) {
		const inMemorySessionService = new InMemorySessionService();

		super({
			appName,
			agent,
			sessionService: inMemorySessionService,
			memoryService: new InMemoryMemoryService(),
		});
	}
}
