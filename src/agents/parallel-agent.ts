import type { RunConfig } from "./run-config";
import type { Content, Role, Part, TextPart } from "../models/llm-request";
import { LLMResponse } from "../models/llm-response";
import { BaseAgent } from "./base-agent";

/**
 * Configuration for ParallelAgent
 */
export interface ParallelAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents to execute in parallel
	 */
	agents?: BaseAgent[];
}

/**
 * Parallel Agent that executes sub-agents in parallel
 * All sub-agents execute independently with the same input
 */
export class ParallelAgent extends BaseAgent {
	/**
	 * Constructor for ParallelAgent
	 */
	constructor(config: ParallelAgentConfig) {
		super({
			name: config.name,
			description: config.description,
		});

		// Add sub-agents if provided
		if (config.agents && config.agents.length > 0) {
			for (const agent of config.agents) {
				this.addSubAgent(agent);
			}
		}
	}

	/**
	 * Runs the agent with the given messages and configuration
	 * Executes all sub-agents in parallel
	 */
	async run(options: {
		contents: Content[];
		config?: RunConfig;
	}): Promise<LLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[ParallelAgent] Running ${this.subAgents.length} sub-agents in parallel`,
			);
		}

		if (this.subAgents.length === 0) {
			return new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: "No sub-agents defined for parallel execution." }],
				},
			});
		}

		// Create promise array for parallel execution
		const agentPromises = this.subAgents.map((agent) => {
			return agent
				.run({
					contents: options.contents,
					config: options.config,
				})
				.catch((error) => {
					console.error(
						`[ParallelAgent] Error in sub-agent ${agent.name}:`,
						error,
					);
					return new LLMResponse({
						content: {
							role: "model",
							parts: [
								{
									text: `Error in sub-agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
						},
					});
				});
		});

		// Execute all agents in parallel
		const results = await Promise.all(agentPromises);

		// Combine results from all agents
		const combinedParts: Part[] = [];
		for (let i = 0; i < results.length; i++) {
			const agentName = this.subAgents[i].name;
			const result = results[i];

			combinedParts.push({ text: `### ${agentName}\n\n` });
			if (result.content?.parts) {
				combinedParts.push(...result.content.parts);
			}
			combinedParts.push({ text: "\n\n" });
		}

		// Return combined results
		return new LLMResponse({
			content: { role: "model", parts: combinedParts },
		});
	}

	/**
	 * Runs the agent with streaming support
	 * Collects streaming responses from all sub-agents
	 */
	async *runStreaming(options: {
		contents: Content[];
		config?: RunConfig;
	}): AsyncIterable<LLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[ParallelAgent] Streaming ${this.subAgents.length} sub-agents in parallel`,
			);
		}

		if (this.subAgents.length === 0) {
			yield new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: "No sub-agents defined for parallel execution." }],
				},
				turn_complete: true,
			});
			return;
		}

		// Since we can't easily stream results from multiple concurrent async generators,
		// we'll run them in parallel and combine the final results
		const agentPromises = this.subAgents.map((agent) => {
			return agent
				.run({
					contents: options.contents,
					config: options.config,
				})
				.catch((error) => {
					console.error(
						`[ParallelAgent] Error in sub-agent ${agent.name}:`,
						error,
					);
					return new LLMResponse({
						content: {
							role: "model",
							parts: [
								{
									text: `Error in sub-agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`,
								},
							],
						},
					});
				});
		});

		// First yield a starting message
		yield new LLMResponse({
			content: {
				role: "model",
				parts: [
					{
						text: `Starting parallel execution of ${this.subAgents.length} agents...`,
					},
				],
			},
			is_partial: true,
		});

		// Execute all agents in parallel and yield updates as they complete
		const localSubAgents = [...this.subAgents];
		const resultsArray: Array<{ agentName: string; response: LLMResponse }> =
			[];
		const pendingPromisesArray = [...agentPromises];

		// Process agents as they complete
		while (pendingPromisesArray.length > 0) {
			// Create an array of promises that also includes the original index
			const indexedPromises = pendingPromisesArray.map(
				(promise, index) =>
					promise
						.then((response) => ({ response, originalIndex: index }))
						.catch((error) => ({ error, originalIndex: index })), // Handle individual promise rejections if not caught earlier
			);

			const completed = await Promise.race(indexedPromises);

			// Find the agent corresponding to the completed promise using originalIndex before splicing
			const agentName = localSubAgents[completed.originalIndex].name;

			let response: LLMResponse;
			if ("error" in completed) {
				// Type guard for completed promise
				console.error(
					`[ParallelAgent] Error in sub-agent ${agentName} during streaming:`,
					completed.error,
				);
				response = new LLMResponse({
					content: {
						role: "model",
						parts: [
							{
								text: `Error processing agent ${agentName}: ${completed.error}`,
							},
						],
					},
					turn_complete: true, // Mark as complete for this errored agent stream part
				});
			} else {
				response = completed.response;
			}

			pendingPromisesArray.splice(completed.originalIndex, 1); // Remove based on original index
			localSubAgents.splice(completed.originalIndex, 1); // Keep localSubAgents in sync

			resultsArray.push({
				agentName,
				response,
			});

			const combinedPartsStreaming: Part[] = [];
			for (const { agentName: name, response: res } of resultsArray) {
				combinedPartsStreaming.push({ text: `### ${name}\n\n` });
				if (res.content?.parts) {
					combinedPartsStreaming.push(...res.content.parts);
				}
				combinedPartsStreaming.push({ text: "\n\n" });
			}

			if (pendingPromisesArray.length > 0) {
				combinedPartsStreaming.push({
					text: `\n### Waiting for ${pendingPromisesArray.length} more agents to complete...\n`,
				});
			}

			yield new LLMResponse({
				content: { role: "model", parts: combinedPartsStreaming },
				is_partial: pendingPromisesArray.length > 0,
				turn_complete: pendingPromisesArray.length === 0,
			});
		}
	}
}
