import { LlmResponse } from "@adk/models";
import { v4 as uuidv4 } from "uuid";
import { EventActions } from "./event-actions";

/**
 * Options for creating an Event.
 */
interface EventOpts {
	invocationId?: string;
	author: string;
	actions?: EventActions;
	longRunningToolIds?: Set<string>;
	branch?: string;
	id?: string;
	timestamp?: number;
	content?: any;
	partial?: boolean;
}

/**
 * Represents an event in a conversation between agents and users.
 * It is used to store the content of the conversation, as well as the actions
 * taken by the agents like function calls, etc.
 */
export class Event extends LlmResponse {
	/** The invocation ID of the event. */
	invocationId = "";

	/** 'user' or the name of the agent, indicating who appended the event to the session. */
	author: string;

	/** The actions taken by the agent. */
	actions: EventActions = new EventActions();

	/**
	 * Set of ids of the long running function calls.
	 * Agent client will know from this field about which function call is long running.
	 * Only valid for function call event.
	 */
	longRunningToolIds?: Set<string>;

	/**
	 * The branch of the event.
	 * The format is like agent_1.agent_2.agent_3, where agent_1 is the parent of
	 * agent_2, and agent_2 is the parent of agent_3. Branch is used when multiple
	 * sub-agents shouldn't see their peer agents' conversation history.
	 */
	branch?: string;

	/** The unique identifier of the event. */
	id = "";

	/** The timestamp of the event (seconds since epoch). */
	timestamp: number = Math.floor(Date.now() / 1000);

	/**
	 * Constructor for Event.
	 */
	constructor(opts: EventOpts) {
		super({
			content: opts.content,
			partial: opts.partial,
		});
		this.invocationId = opts.invocationId ?? "";
		this.author = opts.author;
		this.actions = opts.actions ?? new EventActions();
		this.longRunningToolIds = opts.longRunningToolIds;
		this.branch = opts.branch;
		this.id = opts.id ?? Event.newId();
		this.timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
	}

	/**
	 * Returns whether the event is the final response of the agent.
	 */
	isFinalResponse(): boolean {
		if (this.actions.skipSummarization || this.longRunningToolIds) {
			return true;
		}
		return (
			this.getFunctionCalls().length === 0 &&
			this.getFunctionResponses().length === 0 &&
			!this.partial &&
			!this.hasTrailingCodeExecutionResult()
		);
	}

	/**
	 * Returns the function calls in the event.
	 */
	getFunctionCalls(): any[] {
		const funcCalls: any[] = [];
		if (this.content && Array.isArray(this.content.parts)) {
			for (const part of this.content.parts) {
				if (part.functionCall) {
					funcCalls.push(part.functionCall);
				}
			}
		}
		return funcCalls;
	}

	/**
	 * Returns the function responses in the event.
	 */
	getFunctionResponses(): any[] {
		const funcResponses: any[] = [];
		if (this.content && Array.isArray(this.content.parts)) {
			for (const part of this.content.parts) {
				if (part.functionResponse) {
					funcResponses.push(part.functionResponse);
				}
			}
		}
		return funcResponses;
	}

	/**
	 * Returns whether the event has a trailing code execution result.
	 */
	hasTrailingCodeExecutionResult(): boolean {
		if (
			this.content &&
			Array.isArray(this.content.parts) &&
			this.content.parts.length > 0
		) {
			return (
				this.content.parts[this.content.parts.length - 1].codeExecutionResult !=
				null
			);
		}
		return false;
	}

	/**
	 * Generates a new random ID for an event.
	 */
	static newId(): string {
		return uuidv4().replace(/-/g, "").substring(0, 8);
	}
}
