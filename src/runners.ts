// Runners implementation for ADK
// Port from Python's runners.py

import type { BaseAgent } from "./agents/base-agent";
import {
	InvocationContext,
	generateInvocationContextId,
} from "./agents/invocation-context";
import { RunConfig, StreamingMode } from "./agents/run-config";

import type {
	BaseArtifactService,
	ArtifactContent,
} from "./artifacts/base-artifact-service";
import type { Event, EventPart, TextPart } from "./events/event"; // Import Event and Part types
import { generateEventId } from "./events/event";
import type { EventActions } from "./events/event-actions";

import type { BaseMemoryService } from "./memory/base-memory-service";
import type { SessionService } from "./sessions/base-session-service";
import type { Session } from "./sessions/session";

// Placeholder for Google's genai types.Content if we need to map from it or to it.
// For now, the runner will create its own Event objects internally.
// type GenAiContent = any;

export interface RunnerArgs {
	appName: string;
	agent: BaseAgent;
	sessionService: SessionService;
	artifactService: BaseArtifactService; // Made mandatory as per our decision to implement it
	memoryService?: BaseMemoryService; // Optional, as in Python
}

export class Runner {
	public readonly appName: string;
	public readonly agent: BaseAgent;
	public readonly sessionService: SessionService;
	public readonly artifactService: BaseArtifactService;
	public readonly memoryService?: BaseMemoryService;

	constructor(args: RunnerArgs) {
		this.appName = args.appName;
		this.agent = args.agent;
		this.sessionService = args.sessionService;
		this.artifactService = args.artifactService;
		this.memoryService = args.memoryService;
	}

	/**
	 * Creates a new InvocationContext.
	 * Ported from Python's _new_invocation_context.
	 */
	protected _newInvocationContext(
		session: Session,
		args: {
			// new_message: GenAiContent | null, // Original Python type
			newMessageContent?: EventPart[]; // Using our EventPart[] for the content of the new user message
			runConfig?: RunConfig;
			// live_request_queue: Optional[LiveRequestQueue] = None, // For run_live, defer for now
		},
	): InvocationContext {
		const invocationId = generateInvocationContextId();
		// The agent for the context is set later by _findAgentToRun
		// and then by the agent itself when it starts running.
		return new InvocationContext({
			invocationId,
			sessionId: session.id,
			userId: session.userId,
			appName: this.appName,
			sessionService: this.sessionService,
			memoryService: this.memoryService,
			artifactService: this.artifactService,
			runConfig: args.runConfig || new RunConfig(), // Use new RunConfig()
			// Set current agent later
			// liveRequestQueue: args.live_request_queue,
			// initialMessageContent: args.newMessageContent, // If InvocationContext needs it directly
		});
	}

	/**
	 * Appends a new user message (as an Event) to the session.
	 * Handles artifact saving if applicable.
	 * Ported from Python's _append_new_message_to_session.
	 */
	protected async _appendNewMessageToSession(
		session: Session,
		newMessageParts: EventPart[], // The content for the new user message
		invocationContext: InvocationContext,
		saveInputBlobsAsArtifacts = false, // From RunConfig
	): Promise<void> {
		if (!newMessageParts || newMessageParts.length === 0) {
			// Python version raises ValueError, here we can choose to log or simply return
			console.warn("Attempted to append an empty message.");
			return;
		}

		let processedParts = [...newMessageParts];

		if (this.artifactService && saveInputBlobsAsArtifacts) {
			const newProcessedParts: EventPart[] = [];
			for (let i = 0; i < newMessageParts.length; i++) {
				const part = newMessageParts[i];
				// Assuming artifacts are passed as a specific EventPart type, e.g., BlobPart
				// For now, this logic is a placeholder. Python checks for `part.inline_data`.
				// We need to define how a client would specify a part as an artifact to be saved.
				// Let's assume for a moment that `ArtifactContent` might be directly in a part,
				// or we define a specific part type like `RawDataPart` or `FileUploadPart`.
				// If `part` is an `ArtifactContent` (e.g. { type: 'blob', data: Uint8Array, mimeType: string })
				// This is a SIMPLIFICATION and needs a proper Part type for artifacts.

				// Placeholder: If a part has a `data` and `mimeType` field, assume it's an artifact to save.
				// This needs to be replaced with a proper `BlobPart` or similar concept.
				if (
					"data" in part &&
					"mimeType" in part &&
					part.data instanceof Uint8Array
				) {
					const artifactContent = part as unknown as ArtifactContent; // Unsafe cast, for placeholder only
					const filename = `input_artifact_${invocationContext.invocationId}_${i}`;
					try {
						await this.artifactService.saveArtifact(
							this.appName,
							session.userId,
							session.id,
							filename,
							artifactContent,
						);
						newProcessedParts.push({
							type: "text",
							text: `Uploaded file: ${filename}. It is saved as an artifact.`,
						} as TextPart);
					} catch (error) {
						console.error(`Failed to save artifact ${filename}:`, error);
						newProcessedParts.push({
							type: "text",
							text: `Failed to upload file for artifact ${filename}.`,
						} as TextPart);
						// Potentially re-add the original part if saving failed and it's not sensitive data
						// newProcessedParts.push(part);
					}
				} else {
					newProcessedParts.push(part);
				}
			}
			processedParts = newProcessedParts;
		}

		const userEvent: Event = {
			id: generateEventId(),
			timestamp: Date.now() / 1000, // Seconds since epoch
			invocationId: invocationContext.invocationId,
			author: "user",
			content: processedParts,
			// actions, etc., typically not set for a raw user message event
		};

		await this.sessionService.appendEvent(session.id, userEvent);
		// Note: Python runner does not yield this user event. It's just added to history.
	}

	/**
	 * Finds the agent to run. For now, just returns the root agent.
	 * TODO: Port full logic from Python if more complex.
	 */
	protected _findAgentToRun(session: Session, rootAgent: BaseAgent): BaseAgent {
		// Simplistic implementation for now
		return rootAgent;
	}

	/**
	 * Main entry method to run the agent.
	 * Ported from Python's run_async.
	 */
	async runAsync(
		userId: string,
		sessionId: string,
		newMessageContent: EventPart[], // Content for the new user message
		runConfig: RunConfig = new RunConfig(), // Use new RunConfig()
	): Promise<AsyncGenerator<Event, void, void>> {
		// Using Promise<AsyncGenerator> because the generator itself is returned synchronously,
		// but its iteration is async.

		const session = await this.sessionService.getSession(sessionId);
		if (!session) {
			// TODO: Check if user_id matches session.userId for security/consistency
			throw new Error(`Session not found: ${sessionId}`);
		}
		if (session.userId !== userId) {
			throw new Error(`User ID mismatch for session ${sessionId}.`);
		}

		const invocationContext = this._newInvocationContext(session, {
			newMessageContent,
			runConfig,
		});

		if (newMessageContent && newMessageContent.length > 0) {
			await this._appendNewMessageToSession(
				session,
				newMessageContent,
				invocationContext,
				runConfig.saveInputBlobsAsArtifacts, // Corrected property name
			);
		}

		// Update invocation context with the specific agent that will run
		const agentToRun = this._findAgentToRun(session, this.agent);
		invocationContext.agent = agentToRun;
		invocationContext.currentAgentName = agentToRun.name; // Using name instead of id

		// The actual generator function
		async function* eventGenerator(
			this: Runner,
		): AsyncGenerator<Event, void, void> {
			// Type issue: agentToRun.runAsync(invocationContext) might return AsyncIterableIterator<Event>
			// which is compatible with AsyncGenerator<Event, void, void>
			for await (const event of agentToRun.runAsync(invocationContext)) {
				if (!event.partial) {
					// Only append complete events to session history via service
					// Ensure session passed to appendEvent is the latest, or that appendEvent fetches latest
					// For simplicity, assuming appendEvent handles concurrency or works with passed session id correctly.
					// The `session` variable here might be stale if events modify it directly.
					// However, our current appendEvent takes sessionId.
					await this.sessionService.appendEvent(sessionId, event);
				}
				yield event;
			}
		}
		// Bind `this` for sessionService inside the generator if it was a plain function.
		// Since it's an async generator function defined within an async method that has `this`,
		// `this` should be correctly captured.
		return eventGenerator.call(this); // Ensure `this` context is correct for the generator
	}

	// TODO: Implement sync `run` method (using threads/queues as in Python, or simplify for TS)
	// TODO: Implement `run_live` and `close_session`
}

// TODO: Implement InMemoryRunner subclass
