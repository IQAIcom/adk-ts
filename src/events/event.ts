// Event module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the event functionality from the Python SDK

import type { Content } from "../models/base_llm";
import { EventActions } from "./event_actions";

// Interface for function call part
export interface FunctionCallPart {
	functionCall?: {
		name: string;
		args: Record<string, unknown>;
	};
	functionResponse?: {
		name: string;
		response: Record<string, unknown>;
	};
}

// Interface for code execution result
export interface CodeExecutionResult {
	output?: string;
	error?: string;
}

/**
 * Represents an event in a conversation between agents and users.
 *
 * It is used to store the content of the conversation, as well as the actions
 * taken by the agents like function calls, etc.
 */
export class Event {
	private id: string;
	private invocationId: string;
	private author: string;
	private branch: string | null;
	private timestamp: number;
	private partial: boolean;
	private content: Content | null;
	private actions: EventActions;
	private longRunningToolIds: Set<string> | null;

	/**
	 * Creates a new Event instance
	 *
	 * @param options Event configuration options
	 */
	constructor(options: {
		id?: string;
		invocationId?: string;
		author: string;
		branch?: string | null;
		content?: Content | null;
		actions?: EventActions;
		timestamp?: number;
		partial?: boolean;
		longRunningToolIds?: Set<string> | null;
	}) {
		this.id = options.id || Event.newId();
		this.invocationId = options.invocationId || "";
		this.author = options.author;
		this.branch = options.branch || null;
		this.timestamp = options.timestamp || Date.now();
		this.partial = options.partial || false;
		this.content = options.content || null;
		this.actions = options.actions || new EventActions();
		this.longRunningToolIds = options.longRunningToolIds || null;
	}

	/**
	 * Gets the event ID
	 *
	 * @returns The event ID
	 */
	getId(): string {
		return this.id;
	}

	/**
	 * Gets the invocation ID
	 *
	 * @returns The invocation ID
	 */
	getInvocationId(): string {
		return this.invocationId;
	}

	/**
	 * Gets the event author
	 *
	 * @returns The author of the event
	 */
	getAuthor(): string {
		return this.author;
	}

	/**
	 * Gets the event branch
	 *
	 * @returns The branch of the event
	 */
	getBranch(): string | null {
		return this.branch;
	}

	/**
	 * Gets the event timestamp
	 *
	 * @returns The timestamp of the event
	 */
	getTimestamp(): number {
		return this.timestamp;
	}

	/**
	 * Checks if the event is partial
	 *
	 * @returns Whether the event is partial
	 */
	isPartial(): boolean {
		return this.partial;
	}

	/**
	 * Gets the event content
	 *
	 * @returns The content of the event
	 */
	getContent(): Content | null {
		return this.content;
	}

	/**
	 * Gets the event actions
	 *
	 * @returns The actions of the event
	 */
	getActions(): EventActions {
		return this.actions;
	}

	/**
	 * Gets the long running tool IDs
	 *
	 * @returns The long running tool IDs
	 */
	getLongRunningToolIds(): Set<string> | null {
		return this.longRunningToolIds;
	}

	/**
	 * Checks if the event is a final response
	 *
	 * @returns Whether the event is a final response
	 */
	isFinalResponse(): boolean {
		if (
			this.actions.skipSummarization ||
			(this.longRunningToolIds && this.longRunningToolIds.size > 0)
		) {
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
	 * Gets function calls from the event content
	 *
	 * @returns The function calls in the event
	 */
	getFunctionCalls(): FunctionCallPart[] {
		const funcCalls: FunctionCallPart[] = [];
		if (this.content?.parts) {
			for (const part of this.content.parts) {
				if (part.functionCall) {
					funcCalls.push({
						functionCall: {
							name: part.functionCall.name ?? "",
							args: part.functionCall.args ?? {},
						},
					});
				}
			}
		}
		return funcCalls;
	}

	/**
	 * Gets function responses from the event content
	 *
	 * @returns The function responses in the event
	 */
	getFunctionResponses(): FunctionCallPart[] {
		const funcResponses: FunctionCallPart[] = [];
		if (this.content?.parts) {
			for (const part of this.content.parts) {
				if (part.functionResponse) {
					funcResponses.push({
						functionResponse: {
							name: part.functionResponse.name ?? "",
							response: part.functionResponse.response ?? {},
						},
					});
				}
			}
		}
		return funcResponses;
	}

	/**
	 * Checks if the event has a trailing code execution result
	 *
	 * @returns Whether the event has a trailing code execution result
	 */
	hasTrailingCodeExecutionResult(): boolean {
		if (this.content?.parts && this.content.parts.length > 0) {
			return !!this.content.parts[this.content.parts.length - 1]
				.codeExecutionResult;
		}
		return false;
	}

	/**
	 * Creates a copy of this event with modifications
	 *
	 * @param modifications The modifications to apply to the event
	 * @returns A new event with the modifications applied
	 */
	withModifications(
		modifications: Partial<{
			id: string;
			invocationId: string;
			author: string;
			branch: string | null;
			timestamp: number;
			partial: boolean;
			content: Content | null;
			actions: EventActions;
			longRunningToolIds: Set<string> | null;
		}>,
	): Event {
		return new Event({
			id: modifications.id || this.id,
			invocationId: modifications.invocationId || this.invocationId,
			author: modifications.author || this.author,
			branch:
				modifications.branch !== undefined ? modifications.branch : this.branch,
			timestamp: modifications.timestamp || this.timestamp,
			partial:
				modifications.partial !== undefined
					? modifications.partial
					: this.partial,
			content:
				modifications.content !== undefined
					? modifications.content
					: this.content,
			actions: modifications.actions || this.actions,
			longRunningToolIds:
				modifications.longRunningToolIds !== undefined
					? modifications.longRunningToolIds
					: this.longRunningToolIds,
		});
	}

	/**
	 * Generates a new random ID for an event
	 *
	 * @returns A new random ID
	 */
	static newId(): string {
		const characters =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let result = "";
		for (let i = 0; i < 8; i++) {
			result += characters.charAt(
				Math.floor(Math.random() * characters.length),
			);
		}
		return result;
	}
}
