import type { Content } from "@google/genai";
import { SpanStatusCode, context, trace } from "@opentelemetry/api";
import type { BaseAgent } from "./agents/base-agent";
import { InvocationContext } from "./agents/invocation-context";
import { newInvocationContextId } from "./agents/invocation-context";
import { LlmAgent } from "./agents/llm-agent";
import { RunConfig } from "./agents/run-config";
import type { BaseArtifactService } from "./artifacts/base-artifact-service";
import { InMemoryArtifactService } from "./artifacts/in-memory-artifact-service";
import { Event } from "./events/event";
import { Logger } from "./logger";
import type { BaseMemoryService } from "./memory/base-memory-service";
import { InMemoryMemoryService } from "./memory/in-memory-memory-service";
import type { BaseSessionService } from "./sessions/base-session-service";
import { InMemorySessionService } from "./sessions/in-memory-session-service";
import type { Session } from "./sessions/session";
import { tracer } from "./telemetry";

/**
 * Find function call event if last event is function response.
 */
export function _findFunctionCallEventIfLastEventIsFunctionResponse(
	session: Session,
): Event | null {
	const events = session.events;
	if (!events || events.length === 0) {
		return null;
	}

	const lastEvent = events[events.length - 1];
	if (lastEvent.content?.parts?.some((part) => part.functionResponse)) {
		const functionCallId = lastEvent.content.parts.find(
			(part) => part.functionResponse,
		)?.functionResponse?.id;

		if (!functionCallId) return null;

		// Look backwards for the corresponding function call
		for (let i = events.length - 2; i >= 0; i--) {
			const event = events[i];
			const functionCalls = event.getFunctionCalls?.() || [];

			for (const functionCall of functionCalls) {
				if (functionCall.id === functionCallId) {
					return event;
				}
			}
		}
	}

	return null;
}

/**
 * The Runner class is used to run agents.
 * It manages the execution of an agent within a session, handling message
 * processing, event generation, and interaction with various services like
 * artifact storage, session management, and memory.
 */
export class Runner<T extends BaseAgent = BaseAgent> {
	/**
	 * The app name of the runner.
	 */
	appName: string;

	/**
	 * The root agent to run.
	 */
	agent: T;

	/**
	 * The artifact service for the runner.
	 */
	artifactService?: BaseArtifactService;

	/**
	 * The session service for the runner.
	 */
	sessionService: BaseSessionService;

	/**
	 * The memory service for the runner.
	 */
	memoryService?: BaseMemoryService;

	protected logger = new Logger({ name: "Runner" });

	/**
	 * Initializes the Runner.
	 */
	constructor({
		appName,
		agent,
		artifactService,
		sessionService,
		memoryService,
	}: {
		appName: string;
		agent: T;
		artifactService?: BaseArtifactService;
		sessionService: BaseSessionService;
		memoryService?: BaseMemoryService;
	}) {
		this.appName = appName;
		this.agent = agent;
		this.artifactService = artifactService;
		this.sessionService = sessionService;
		this.memoryService = memoryService;
	}

	/**
	 * Runs the agent synchronously.
	 * NOTE: This sync interface is only for local testing and convenience purpose.
	 * Consider using `runAsync` for production usage.
	 */
	run({
		userId,
		sessionId,
		newMessage,
		runConfig = new RunConfig(),
	}: {
		userId: string;
		sessionId: string;
		newMessage: Content;
		runConfig?: RunConfig;
	}): Generator<Event, void, unknown> {
		const eventQueue: (Event | null)[] = [];
		let queueIndex = 0;
		let asyncCompleted = false;

		const invokeRunAsync = async () => {
			try {
				for await (const event of this.runAsync({
					userId,
					sessionId,
					newMessage,
					runConfig,
				})) {
					eventQueue.push(event);
				}
			} finally {
				eventQueue.push(null);
				asyncCompleted = true;
			}
		};

		// Start the async operation
		invokeRunAsync();

		// Synchronously yield events as they become available
		return (function* () {
			while (true) {
				// Wait for next event to be available
				while (queueIndex >= eventQueue.length && !asyncCompleted) {
					// Simple busy wait - in a real implementation you might want
					// to use a more sophisticated synchronization mechanism
				}

				if (queueIndex >= eventQueue.length && asyncCompleted) {
					break;
				}

				const event = eventQueue[queueIndex++];
				if (event === null) {
					break;
				}
				yield event;
			}
		})();
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
		newMessage: Content;
		runConfig?: RunConfig;
	}): AsyncGenerator<Event, void, unknown> {
		const span = tracer.startSpan("invocation");
		const spanContext = trace.setSpan(context.active(), span);

		try {
			// Execute all invocation logic within the span context
			const session = await context.with(spanContext, () =>
				this.sessionService.getSession(this.appName, userId, sessionId),
			);

			if (!session) {
				throw new Error(`Session not found: ${sessionId}`);
			}

			const invocationContext = this._newInvocationContext(session, {
				newMessage,
				runConfig,
			});

			if (newMessage) {
				await context.with(spanContext, () =>
					this._appendNewMessageToSession(
						session,
						newMessage,
						invocationContext,
						runConfig.saveInputBlobsAsArtifacts || false,
					),
				);
			}

			invocationContext.agent = this._findAgentToRun(session, this.agent);

			// Execute agent within the span context
			const agentGenerator =
				invocationContext.agent.runAsync(invocationContext);

			while (true) {
				const result = await context.with(spanContext, () =>
					agentGenerator.next(),
				);

				if (result.done) {
					break;
				}

				const event = result.value as Event;

				if (!event.partial) {
					await context.with(spanContext, async () => {
						await this.sessionService.appendEvent(session, event);
						if (this.memoryService) {
							await this.memoryService.addSessionToMemory(session);
						}
					});
				}

				yield event;
			}
		} catch (error) {
			this.logger.debug("Error running agent:", error);
			span.recordException(error as Error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Appends a new message to the session.
	 */
	private async _appendNewMessageToSession(
		session: Session,
		newMessage: Content,
		invocationContext: InvocationContext,
		saveInputBlobsAsArtifacts = false,
	): Promise<void> {
		if (!newMessage.parts) {
			throw new Error("No parts in the new_message.");
		}

		if (this.artifactService && saveInputBlobsAsArtifacts) {
			// The runner directly saves the artifacts (if applicable) in the
			// user message and replaces the artifact data with a file name
			// placeholder.
			for (let i = 0; i < newMessage.parts.length; i++) {
				const part = newMessage.parts[i];
				if (!part.inlineData) {
					continue;
				}
				const fileName = `artifact_${invocationContext.invocationId}_${i}`;
				await this.artifactService.saveArtifact({
					appName: this.appName,
					userId: session.userId,
					sessionId: session.id,
					filename: fileName,
					artifact: part,
				});
				newMessage.parts[i] = {
					text: `Uploaded file: ${fileName}. It is saved into artifacts`,
				};
			}
		}

		// Ensure the newMessage has the correct role for content filtering
		const userContent = {
			...newMessage,
			role: "user", // Ensure role is set for content filtering
		};

		// Appends only. We do not yield the event because it's not from the model.
		const event = new Event({
			invocationId: invocationContext.invocationId,
			author: "user",
			content: userContent,
		});

		await this.sessionService.appendEvent(session, event);
	}

	/**
	 * Finds the agent to run to continue the session.
	 */
	private _findAgentToRun(session: Session, rootAgent: BaseAgent): BaseAgent {
		// If the last event is a function response, should send this response to
		// the agent that returned the corresponding function call regardless the
		// type of the agent. e.g. a remote a2a agent may surface a credential
		// request as a special long running function tool call.
		const event = _findFunctionCallEventIfLastEventIsFunctionResponse(session);
		if (event?.author) {
			return rootAgent.findAgent(event.author);
		}

		// Look through events in reverse order to find the last non-user event
		const nonUserEvents =
			session.events?.filter((e) => e.author !== "user").reverse() || [];

		for (const event of nonUserEvents) {
			if (event.author === rootAgent.name) {
				// Found root agent
				return rootAgent;
			}

			const agent = rootAgent.findSubAgent?.(event.author);
			if (!agent) {
				// Agent not found, continue looking
				this.logger.debug(
					`Event from an unknown agent: ${event.author}, event id: ${event.id}`,
				);
				continue;
			}

			if (this._isTransferableAcrossAgentTree(agent)) {
				return agent;
			}
		}

		// Falls back to root agent if no suitable agents are found in the session
		return rootAgent;
	}

	/**
	 * Whether the agent to run can transfer to any other agent in the agent tree.
	 */
	private _isTransferableAcrossAgentTree(agentToRun: BaseAgent): boolean {
		let agent: BaseAgent | null = agentToRun;

		while (agent) {
			if (!(agent instanceof LlmAgent)) {
				// Only LLM-based Agent can provide agent transfer capability
				return false;
			}

			if (agent.disallowTransferToParent) {
				return false;
			}

			agent = agent.parentAgent || null;
		}

		return true;
	}

	/**
	 * Creates a new invocation context.
	 */
	private _newInvocationContext(
		session: Session,
		{
			newMessage,
			runConfig = new RunConfig(),
		}: {
			newMessage?: Content;
			runConfig?: RunConfig;
		},
	): InvocationContext {
		const invocationId = newInvocationContextId();

		return new InvocationContext({
			artifactService: this.artifactService,
			sessionService: this.sessionService,
			memoryService: this.memoryService,
			invocationId,
			agent: this.agent,
			session,
			userContent: newMessage || null,
			liveRequestQueue: null,
			runConfig,
		});
	}
}

/**
 * An in-memory Runner for testing and development.
 */
export class InMemoryRunner<T extends BaseAgent = BaseAgent> extends Runner<T> {
	/**
	 * Deprecated. Please don't use. The in-memory session service for the runner.
	 */
	private _inMemorySessionService: InMemorySessionService;

	/**
	 * Initializes the InMemoryRunner.
	 */
	constructor(
		agent: T,
		{ appName = "InMemoryRunner" }: { appName?: string } = {},
	) {
		const inMemorySessionService = new InMemorySessionService();

		super({
			appName,
			agent,
			artifactService: new InMemoryArtifactService(),
			sessionService: inMemorySessionService,
			memoryService: new InMemoryMemoryService(),
		});

		this._inMemorySessionService = inMemorySessionService;
	}
}
