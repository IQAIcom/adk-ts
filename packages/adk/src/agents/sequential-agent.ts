import { Event } from "../events/event";
import { Logger } from "../logger";
import { BaseAgent } from "./base-agent";
import type { InvocationContext } from "./invocation-context";
import { LlmAgent } from "./llm-agent";

/**
 * Configuration for SequentialAgent
 */
export interface SequentialAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents to execute in sequence
	 */
	subAgents?: BaseAgent[];

	/**
	 * Output schema for validating the final response
	 */
	outputSchema?: import("zod").ZodSchema;
}

/**
 * A shell agent that runs its sub-agents in sequence.
 */
export class SequentialAgent extends BaseAgent {
	/**
	 * Output schema for validating the final response
	 */
	outputSchema?: import("zod").ZodSchema;

	/**
	 * Logger for this agent
	 */
	private logger = new Logger({ name: "SequentialAgent" });

	/**
	 * Constructor for SequentialAgent
	 */
	constructor(config: SequentialAgentConfig) {
		super({
			name: config.name,
			description: config.description,
			subAgents: config.subAgents,
		});
		this.outputSchema = config.outputSchema;
	}

	/**
	 * Core logic to run this agent via text-based conversation
	 */
	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		let lastValidResponse = "";
		let lastRespondingAgent = "";
		let lastFinalEvent: Event | null = null;

		// Run each sub-agent in sequence
		for (const subAgent of this.subAgents) {
			// Run the sub-agent and collect events
			for await (const event of subAgent.runAsync(ctx)) {
				// Yield all events from sub-agent (including intermediate ones like tool calls, transfers)
				yield event;

				// Track the last valid response from any agent
				if (
					event.isFinalResponse() &&
					event.author === subAgent.name &&
					event.content?.parts
				) {
					let responseText = "";
					for (const part of event.content.parts) {
						if (
							part &&
							typeof part === "object" &&
							"text" in part &&
							part.text
						) {
							responseText += part.text;
						}
					}

					if (responseText.trim()) {
						lastValidResponse = responseText.trim();
						lastRespondingAgent = subAgent.name;
						lastFinalEvent = event;
						this.logger.debug(
							`SequentialAgent: Collected response from ${subAgent.name}`,
						);
					}
				}
			}
		}

		// If we have a valid response and output schema, validate it
		if (this.outputSchema && lastValidResponse) {
			try {
				let parsed: any;
				// Try to parse as JSON first
				try {
					parsed = this.outputSchema.parse(JSON.parse(lastValidResponse));
				} catch {
					// If that fails, try to validate the raw response
					parsed = this.outputSchema.parse(lastValidResponse);
				}

				this.logger.debug(
					`Output schema validation successful for agent ${this.name} (using response from ${lastRespondingAgent})`,
				);

				// Yield a final event with the validated response
				const finalEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: {
						parts: [
							{
								text:
									typeof parsed === "string" ? parsed : JSON.stringify(parsed),
							},
						],
					},
				});
				yield finalEvent;
			} catch (validationError) {
				this.logger.warn(
					`Output schema validation failed for agent ${this.name}: ${validationError}`,
				);
				// Still yield the response if validation fails
				const finalEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: {
						parts: [{ text: lastValidResponse }],
					},
				});
				yield finalEvent;
			}
		} else if (lastValidResponse) {
			// No schema validation needed, just yield the response
			const finalEvent = new Event({
				invocationId: ctx.invocationId,
				author: this.name,
				branch: ctx.branch,
				content: {
					parts: [{ text: lastValidResponse }],
				},
			});
			yield finalEvent;
		}
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation
	 *
	 * Compared to the non-live case, live agents process a continuous stream of audio
	 * or video, so there is no way to tell if it's finished and should pass
	 * to the next agent or not. So we introduce a task_completed() function so the
	 * model can call this function to signal that it's finished the task and we
	 * can move on to the next agent.
	 */
	protected async *runLiveImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		// There is no way to know if it's using live during init phase so we have to init it here
		for (const subAgent of this.subAgents) {
			// add tool
			function taskCompleted(): string {
				/**
				 * Signals that the model has successfully completed the user's question
				 * or task.
				 */
				return "Task completion signaled.";
			}

			if (subAgent instanceof LlmAgent) {
				// Use function name to dedupe.
				const toolNames = subAgent.tools.map((tool) =>
					typeof tool === "function" ? tool.name : tool.name,
				);

				if (!toolNames.includes(taskCompleted.name)) {
					subAgent.tools.push(taskCompleted);
					subAgent.instruction += `If you finished the user's request
according to its description, call the ${taskCompleted.name} function
to exit so the next agents can take over. When calling this function,
do not generate any text other than the function call.`;
				}
			}
		}

		for (const subAgent of this.subAgents) {
			for await (const event of subAgent.runLive(ctx)) {
				yield event;
			}
		}
	}
}
