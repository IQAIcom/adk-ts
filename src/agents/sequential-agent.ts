import type { RunConfig } from "./run-config";
import type { Content, Role, Part, TextPart } from "../models/llm-request";
import type { LLMResponse } from "../models/llm-response";
import { BaseAgent } from "./base-agent";

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
	agents?: BaseAgent[];
}

/**
 * Extended LLMResponse interface that includes metadata
 */
interface EnhancedLLMResponse extends LLMResponse {
	metadata?: Record<string, any>;
}

/**
 * Sequential Agent that executes sub-agents in sequence
 * Each sub-agent's output becomes input to the next agent
 */
export class SequentialAgent extends BaseAgent {
	/**
	 * Constructor for SequentialAgent
	 */
	constructor(config: SequentialAgentConfig) {
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
	 * Executes sub-agents sequentially, passing output from one to the next
	 */
	async run(options: {
		contents: Content[];
		config?: RunConfig;
	}): Promise<EnhancedLLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[SequentialAgent] Running ${this.subAgents.length} sub-agents in sequence`,
			);
		}

		if (this.subAgents.length === 0) {
			return {
				content: {
					role: "model",
					parts: [{ text: "No sub-agents defined for sequential execution." }],
				},
				metadata: {
					agent_name: this.name,
					agent_type: "sequential",
					status: "empty",
				},
			} as EnhancedLLMResponse;
		}

		const currentRunContents = [...options.contents];
		let finalResponse: EnhancedLLMResponse | null = null;

		// Execute agents in sequence
		for (let i = 0; i < this.subAgents.length; i++) {
			const agent = this.subAgents[i];

			if (process.env.DEBUG === "true") {
				console.log(
					`[SequentialAgent] Running sub-agent ${i + 1}/${this.subAgents.length}: ${agent.name}`,
				);
			}

			try {
				// Run the current agent with the messages
				const response = (await agent.run({
					contents: currentRunContents,
					config: options.config,
				})) as EnhancedLLMResponse;

				// Store response
				finalResponse = response;

				// Prepare input for the next agent by adding the response as a message
				if (i < this.subAgents.length - 1) {
					if (response.content) {
						currentRunContents.push(response.content);
					}
				}
			} catch (error) {
				console.error(
					`[SequentialAgent] Error in sub-agent ${agent.name}:`,
					error,
				);
				return {
					content: {
						role: "model",
						parts: [
							{
								text: `Error in sub-agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					},
					metadata: {
						agent_name: this.name,
						agent_type: "sequential",
						error: true,
						sub_agent: agent.name,
					},
				} as EnhancedLLMResponse;
			}
		}

		// Return the final response with metadata
		if (!finalResponse) {
			return {
				content: {
					role: "model",
					parts: [{ text: "No response generated from sequential execution." }],
				},
				metadata: {
					agent_name: this.name,
					agent_type: "sequential",
					status: "no_response",
				},
			} as EnhancedLLMResponse;
		}

		// Add metadata about the sequential execution
		return {
			...finalResponse,
			metadata: {
				...(finalResponse.metadata || {}),
				agent_name: this.name,
				agent_type: "sequential",
			},
		} as EnhancedLLMResponse;
	}

	/**
	 * Runs the agent with streaming support
	 * Streams responses from each sub-agent in sequence
	 */
	async *runStreaming(options: {
		contents: Content[];
		config?: RunConfig;
	}): AsyncIterable<EnhancedLLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[SequentialAgent] Streaming ${this.subAgents.length} sub-agents in sequence`,
			);
		}

		if (this.subAgents.length === 0) {
			yield {
				content: {
					role: "model",
					parts: [{ text: "No sub-agents defined for sequential execution." }],
				},
				metadata: {
					agent_name: this.name,
					agent_type: "sequential",
					status: "empty",
				},
				turn_complete: true,
			} as EnhancedLLMResponse;
			return;
		}

		const currentStreamContents = [...options.contents];

		// Execute agents in sequence with streaming
		for (let i = 0; i < this.subAgents.length; i++) {
			const agent = this.subAgents[i];

			if (process.env.DEBUG === "true") {
				console.log(
					`[SequentialAgent] Streaming sub-agent ${i + 1}/${this.subAgents.length}: ${agent.name}`,
				);
			}

			try {
				// Run the current agent with streaming
				const streamGenerator = agent.runStreaming({
					contents: currentStreamContents,
					config: options.config,
				});

				// Collect all chunks to build the complete response for the next agent
				const chunks: EnhancedLLMResponse[] = [];
				let lastChunkFromStream: EnhancedLLMResponse | null = null;

				// Stream each chunk from the current agent
				for await (const chunk of streamGenerator) {
					// Add metadata about the sequential execution
					const enhancedChunk = {
						...(chunk as EnhancedLLMResponse),
						metadata: {
							...((chunk as EnhancedLLMResponse).metadata || {}),
							agent_name: this.name,
							agent_type: "sequential",
							sub_agent: agent.name,
							sub_agent_index: i,
							sub_agent_count: this.subAgents.length,
						},
					} as EnhancedLLMResponse;

					yield enhancedChunk;
					chunks.push(enhancedChunk);
					lastChunkFromStream = enhancedChunk;
				}

				// Prepare input for the next agent
				if (i < this.subAgents.length - 1 && lastChunkFromStream) {
					if (lastChunkFromStream.content) {
						currentStreamContents.push(lastChunkFromStream.content);
					}
				}
			} catch (error) {
				console.error(
					`[SequentialAgent] Error in streaming sub-agent ${agent.name}:`,
					error,
				);
				yield {
					content: {
						role: "model",
						parts: [
							{
								text: `Error in sub-agent ${agent.name}: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					},
					metadata: {
						agent_name: this.name,
						agent_type: "sequential",
						error: true,
						sub_agent: agent.name,
					},
					turn_complete: true,
				} as EnhancedLLMResponse;
				return;
			}
		}
	}
}
