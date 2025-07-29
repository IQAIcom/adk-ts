// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { BaseAgent } from "./base-agent";
import { Event } from "../events/event";

// Note: These imports would need to be adjusted based on actual ADK TypeScript structure
// import { BaseAgent } from './base-agent';
// import { InvocationContext } from './invocation-context';
// import { Event } from '../events/event';

/**
 * Placeholder types until actual ADK TypeScript types are available
 */
interface Content {
	role: string;
	parts: Array<{ text?: string }>;
}

// interface Event {
//   invocationId?: string;
//   author: string;
//   branch?: string;
//   content?: Content;
// }

// class EventClass implements Event {
//   public invocationId?: string;
//   public author: string;
//   public branch?: string;
//   public content?: Content;

//   constructor(options: Event) {
//     this.invocationId = options.invocationId;
//     this.author = options.author;
//     this.branch = options.branch;
//     this.content = options.content;
//   }
// }

interface Session {
	id: string;
	events: Event[];
}

interface InvocationContext {
	invocationId: string;
	session: Session;
	branch?: string;
}

// abstract class BaseAgent {
//   public name: string;
//   public description: string;

//   constructor(options: { name: string; description: string }) {
//     this.name = options.name;
//     this.description = options.description;
//   }

//   protected abstract runAsyncImpl(
//     ctx: InvocationContext
//   ): AsyncGenerator<Event, void>;
//   protected abstract runLiveImpl(
//     ctx: InvocationContext
//   ): AsyncGenerator<Event, void>;
// }

export interface LangGraphNode {
	name: string;
	/**
	 * Name of the node
	 */

	/**
	 * Agent associated with this node
	 */
	agent: BaseAgent;

	/**
	 * Target nodes to execute after this node
	 */
	targets?: string[];
	run: (ctx: InvocationContext) => Promise<void>;
}

/**
 * LangChain message types for TypeScript
 */
export interface BaseMessage {
	content: string;
	type: string;
}

export interface HumanMessage extends BaseMessage {
	type: "human";
}

export interface AIMessage extends BaseMessage {
	type: "ai";
}

export interface SystemMessage extends BaseMessage {
	type: "system";
}

export type LangChainMessage = HumanMessage | AIMessage | SystemMessage;

/**
 * LangGraph types for TypeScript
 */
export interface RunnableConfig {
	configurable: {
		thread_id: string;
		[key: string]: any;
	};
	[key: string]: any;
}

export interface GraphState {
	values?: {
		messages?: LangChainMessage[];
		[key: string]: any;
	};
	[key: string]: any;
}

export interface CompiledGraph {
	/**
	 * Get the current state of the graph for a given configuration
	 */
	getState(config: RunnableConfig): GraphState;

	/**
	 * Invoke the graph with input and configuration
	 */
	invoke(
		input: { messages: LangChainMessage[] },
		config: RunnableConfig,
	): Promise<{ messages: LangChainMessage[] }>;

	/**
	 * Optional checkpointer for state persistence
	 */
	checkpointer?: any;
}

/**
 * Extracts last human messages from given list of events.
 */
function getLastHumanMessages(events: Event[]): HumanMessage[] {
	const messages: HumanMessage[] = [];

	for (let i = events.length - 1; i >= 0; i--) {
		const event = events[i];

		if (messages.length > 0 && event.author !== "user") {
			break;
		}

		if (event.author === "user" && event.content && event.content.parts) {
			const text = event.content.parts[0]?.text;
			if (text) {
				messages.unshift({
					type: "human",
					content: text,
				});
			}
		}
	}

	return messages;
}

/**
 * LangGraph Agent - TypeScript implementation matching Python functionality
 * Currently a concept implementation, supports single and multi-turn.
 */
export class LangGraphAgent extends BaseAgent {
	/**
	 * The compiled LangGraph graph
	 */
	public readonly graph: CompiledGraph;

	/**
	 * System instruction to add as SystemMessage
	 */
	public instruction = "";

	constructor(options: {
		name: string;
		description: string;
		graph: CompiledGraph;
		instruction?: string;
	}) {
		super({
			name: options.name,
			description: options.description,
		});

		this.graph = options.graph;
		this.instruction = options.instruction || "";
	}

	/**
	 * Core implementation of the agent's async execution
	 */
	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void> {
		// Needed for langgraph checkpointer (for subsequent invocations; multi-turn)
		const config: RunnableConfig = {
			configurable: {
				thread_id: ctx.session.id,
			},
		};

		// Add instruction as SystemMessage if graph state is empty
		const currentGraphState = this.graph.getState(config);
		const graphMessages = currentGraphState.values?.messages || [];

		const messages: LangChainMessage[] = [];

		// Add system message if instruction exists and no messages in graph state
		if (this.instruction && graphMessages.length === 0) {
			messages.push({
				type: "system",
				content: this.instruction,
			});
		}

		// Add events to messages (evaluating the memory used; parent agent vs checkpointer)
		messages.push(...this.getMessages(ctx.session.events));

		// Use the Runnable
		const finalState = await this.graph.invoke({ messages }, config);
		const result = finalState.messages[finalState.messages.length - 1].content;

		const resultEvent = new Event({
			invocationId: ctx.invocationId,
			author: this.name,
			branch: ctx.branch,
			content: {
				role: "model",
				parts: [{ text: result }],
			} as Content,
		});

		yield resultEvent;
	}

	/**
	 * Extracts messages from given list of events.
	 *
	 * If the developer provides their own memory within langgraph, we return the
	 * last user messages only. Otherwise, we return all messages between the user
	 * and the agent.
	 */
	private getMessages(events: Event[]): LangChainMessage[] {
		if (this.graph.checkpointer) {
			return getLastHumanMessages(events);
		}
		return this.getConversationWithAgent(events);
	}

	/**
	 * Extracts all conversation messages from given list of events.
	 */
	private getConversationWithAgent(events: Event[]): LangChainMessage[] {
		const messages: LangChainMessage[] = [];

		for (const event of events) {
			if (!event.content || !event.content.parts) {
				continue;
			}

			const text = event.content.parts[0]?.text;
			if (!text) {
				continue;
			}

			if (event.author === "user") {
				messages.push({
					type: "human",
					content: text,
				});
			} else if (event.author === this.name) {
				messages.push({
					type: "ai",
					content: text,
				});
			}
		}

		return messages;
	}

	/**
	 * For LangGraph agents, live execution follows the same pattern as async
	 * The graph itself will handle any live-specific behavior
	 */
	protected async *runLiveImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void> {
		yield* this.runAsyncImpl(ctx);
	}
}
