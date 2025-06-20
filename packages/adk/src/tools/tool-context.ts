import { CallbackContext } from "../agents/callback-context";
import type { InvocationContext } from "../agents/invocation-context";
import type { EventActions } from "../events/event-actions";
import type { SearchMemoryResponse } from "../memory/base-memory-service";

/**
 * The context of the tool.
 *
 * This class provides the context for a tool invocation, including access to
 * the invocation context, function call ID, event actions, and authentication
 * response. It also provides methods for requesting credentials, retrieving
 * authentication responses, listing artifacts, and searching memory.
 */
export class ToolContext extends CallbackContext {
	/**
	 * The function call id of the current tool call. This id was
	 * returned in the function call event from LLM to identify a function call.
	 * If LLM didn't return this id, ADK will assign one to it. This id is used
	 * to map function call response to the original function call.
	 */
	functionCallId?: string;

	/**
	 * Constructor for ToolContext
	 */
	constructor(
		invocationContext: InvocationContext,
		options: {
			functionCallId?: string;
			eventActions?: EventActions;
		} = {},
	) {
		super(invocationContext, { eventActions: options.eventActions });
		this.functionCallId = options.functionCallId;
	}

	/**
	 * Gets the event actions of the current tool call
	 */
	get actions(): EventActions {
		return this.eventActions;
	}

	/**
	 * Lists the filenames of the artifacts attached to the current session
	 */
	async listArtifacts(): Promise<string[]> {
		if (!this._invocationContext.artifactService) {
			throw new Error("Artifact service is not initialized.");
		}

		return await this._invocationContext.artifactService.listArtifactKeys({
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
			sessionId: this._invocationContext.session.id,
		});
	}

	/**
	 * Searches the memory of the current user
	 */
	async searchMemory(query: string): Promise<SearchMemoryResponse> {
		if (!this._invocationContext.memoryService) {
			throw new Error("Memory service is not available.");
		}

		return await this._invocationContext.memoryService.searchMemory({
			query,
			appName: this._invocationContext.appName,
			userId: this._invocationContext.userId,
		});
	}
}
