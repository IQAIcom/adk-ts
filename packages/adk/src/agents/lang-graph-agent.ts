import { BaseAgent } from "./base-agent";
import { Event } from "../events/event";
interface Content {
	role: string;
	parts: Array<{ text?: string }>;
}
interface Session {
	id: string;
	events: Event[];
}

interface InvocationContext {
	invocationId: string;
	session: Session;
	branch?: string;
}

export interface LangGraphNode {
	name: string;

	agent: BaseAgent;

	targets?: string[];
	run: (ctx: InvocationContext) => Promise<void>;
}

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
	getState(config: RunnableConfig): GraphState;

	invoke(
		input: { messages: LangChainMessage[] },
		config: RunnableConfig,
	): Promise<{ messages: LangChainMessage[] }>;

	checkpointer?: any;
}

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

export class LangGraphAgent extends BaseAgent {
	public readonly graph: CompiledGraph;

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

	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void> {
		const config: RunnableConfig = {
			configurable: {
				thread_id: ctx.session.id,
			},
		};

		const currentGraphState = this.graph.getState(config);
		const graphMessages = currentGraphState.values?.messages || [];

		const messages: LangChainMessage[] = [];

		if (this.instruction && graphMessages.length === 0) {
			messages.push({
				type: "system",
				content: this.instruction,
			});
		}

		messages.push(...this.getMessages(ctx.session.events));

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

	private getMessages(events: Event[]): LangChainMessage[] {
		if (this.graph.checkpointer) {
			return getLastHumanMessages(events);
		}
		return this.getConversationWithAgent(events);
	}

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

	protected async *runLiveImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void> {
		yield* this.runAsyncImpl(ctx);
	}
}
