import type { RunConfig } from "./run-config";
import type { Content, Role, Part, TextPart } from "../models/llm-request";
import { LLMResponse } from "../models/llm-response";
import { BaseAgent } from "./base-agent";

/**
 * Configuration for LoopAgent
 */
export interface LoopAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agent to execute in a loop
	 */
	agent?: BaseAgent;

	/**
	 * Maximum number of iterations
	 */
	maxIterations?: number;

	/**
	 * Agent that decides whether to continue the loop
	 */
	conditionAgent?: BaseAgent;

	/**
	 * Custom condition check function
	 */
	conditionCheck?: (response: LLMResponse) => boolean | Promise<boolean>;
}

/**
 * Loop Agent that executes sub-agents in a loop
 * Repeatedly executes a sub-agent until a condition is met
 */
export class LoopAgent extends BaseAgent {
	/**
	 * Maximum number of iterations to prevent infinite loops
	 */
	private maxIterations: number;

	/**
	 * Agent that decides whether to continue the loop
	 */
	private conditionAgent?: BaseAgent;

	/**
	 * Custom condition check function
	 */
	private conditionCheck?: (
		response: LLMResponse,
	) => boolean | Promise<boolean>;

	/**
	 * Constructor for LoopAgent
	 */
	constructor(config: LoopAgentConfig) {
		super({
			name: config.name,
			description: config.description,
		});

		// Set maximum iterations (default to 10)
		this.maxIterations = config.maxIterations || 10;

		// Set condition agent if provided
		this.conditionAgent = config.conditionAgent;

		// Set condition check function if provided
		this.conditionCheck = config.conditionCheck;

		// Add the agent to execute in a loop
		if (config.agent) {
			this.addSubAgent(config.agent);
		}
	}

	/**
	 * Default condition check that always returns true
	 * to continue the loop until maxIterations is reached
	 */
	private async defaultConditionCheck(): Promise<boolean> {
		return true;
	}

	/**
	 * Check if the loop should continue
	 */
	private async shouldContinue(
		response: LLMResponse,
		iterationCount: number,
		currentContents: Content[],
		config?: RunConfig,
	): Promise<boolean> {
		// Stop if we've reached maximum iterations
		if (iterationCount >= this.maxIterations) {
			if (process.env.DEBUG === "true") {
				console.log(
					`[LoopAgent] Maximum iterations (${this.maxIterations}) reached. Stopping loop.`,
				);
			}
			return false;
		}

		// Use custom condition check if provided
		if (this.conditionCheck) {
			const shouldContinue = await this.conditionCheck(response);
			if (process.env.DEBUG === "true") {
				console.log(
					`[LoopAgent] Custom condition check result: ${shouldContinue}`,
				);
			}
			return shouldContinue;
		}

		// Use condition agent if provided
		if (this.conditionAgent) {
			if (process.env.DEBUG === "true") {
				console.log(
					`[LoopAgent] Using condition agent ${this.conditionAgent.name} to check loop condition`,
				);
			}

			// Add the response to messages for the condition agent
			const conditionContents: Content[] = [...currentContents];
			if (response.content) {
				conditionContents.push(response.content);
			}
			conditionContents.push({
				role: "user" as Role,
				parts: [
					{
						text: 'Should the loop continue? Respond with "yes" to continue or "no" to stop.',
					},
				],
			});

			// Run the condition agent
			try {
				const conditionAgentResponse = await this.conditionAgent.run({
					contents: conditionContents,
					config,
				});

				// Check response content for yes/no
				let textContent = "";
				if (conditionAgentResponse.content?.parts) {
					for (const part of conditionAgentResponse.content.parts) {
						if ("text" in part) {
							textContent += `${(part as TextPart).text.toLowerCase()} `;
						}
					}
				}
				textContent = textContent.trim();
				const shouldContinueLoop =
					textContent.includes("yes") && !textContent.includes("no");

				if (process.env.DEBUG === "true") {
					console.log(
						`[LoopAgent] Condition agent result: ${shouldContinueLoop ? "Continue loop" : "Stop loop"}`,
					);
				}
				return shouldContinueLoop;
			} catch (error) {
				console.error("[LoopAgent] Error in condition agent:", error);
				return false;
			}
		}

		// Default behavior is to continue until maxIterations
		return this.defaultConditionCheck();
	}

	/**
	 * Runs the agent with the given messages and configuration
	 * Executes the sub-agent in a loop until the condition is met
	 */
	async run(options: {
		contents: Content[];
		config?: RunConfig;
	}): Promise<LLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[LoopAgent] Starting loop with max ${this.maxIterations} iterations`,
			);
		}

		if (this.subAgents.length === 0) {
			return new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: "No sub-agent defined for loop execution." }],
				},
			});
		}

		// Get the agent to loop
		const subAgent = this.subAgents[0];

		// Initialize loop variables
		let iterationCount = 0;
		const currentLoopContents = [...options.contents];
		let lastResponse: LLMResponse | null = null;
		let shouldContinueLoopFlag = true;

		// Execute the loop
		while (shouldContinueLoopFlag && iterationCount < this.maxIterations) {
			iterationCount++;
			if (process.env.DEBUG === "true") {
				console.log(
					`[LoopAgent] Running iteration ${iterationCount}/${this.maxIterations}`,
				);
			}

			try {
				// Run the agent
				const response = await subAgent.run({
					contents: currentLoopContents,
					config: options.config,
				});

				// Store the response
				lastResponse = response;

				// Add the response to messages for the next iteration
				if (response.content) {
					currentLoopContents.push(response.content);
				}

				// Check if we should continue the loop
				shouldContinueLoopFlag = await this.shouldContinue(
					response,
					iterationCount,
					currentLoopContents,
					options.config,
				);

				// If we're continuing, add a transition message for the next iteration
				if (shouldContinueLoopFlag) {
					currentLoopContents.push({
						role: "user" as Role,
						parts: [
							{
								text: `Iteration ${iterationCount} complete. Continue to iteration ${iterationCount + 1}.`,
							},
						],
					});
				}
			} catch (error) {
				console.error(
					`[LoopAgent] Error in loop iteration ${iterationCount}:`,
					error,
				);
				break;
			}
		}

		// Prepare the final response
		if (!lastResponse) {
			return new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: "No response generated from loop execution." }],
				},
			});
		}

		// Return the final response with loop information
		let finalText = "";
		if (lastResponse.content?.parts) {
			for (const part of lastResponse.content.parts) {
				if ("text" in part) finalText += `${(part as TextPart).text} `;
			}
		}
		finalText = finalText.trim();

		return new LLMResponse({
			content: {
				role: "model",
				parts: [
					{
						text: `Completed ${iterationCount} iterations. Final result:\n\n${finalText}`,
					},
				],
			},
		});
	}

	/**
	 * Runs the agent with streaming support
	 */
	async *runStreaming(options: {
		contents: Content[];
		config?: RunConfig;
	}): AsyncIterable<LLMResponse> {
		// Log execution
		if (process.env.DEBUG === "true") {
			console.log(
				`[LoopAgent] Starting loop with max ${this.maxIterations} iterations (streaming)`,
			);
		}

		if (this.subAgents.length === 0) {
			yield new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: "No sub-agent defined for loop execution." }],
				},
				turn_complete: true,
			});
			return;
		}

		// Get the agent to loop
		const loopAgentToExecute = this.subAgents[0];

		// Initialize loop variables
		let iterationCount = 0;
		const currentLoopStreamContents = [...options.contents];
		let shouldContinueLoopStream = true;

		// Initial status message
		yield new LLMResponse({
			content: {
				role: "model",
				parts: [
					{
						text: `Starting loop execution with max ${this.maxIterations} iterations...`,
					},
				],
			},
			is_partial: true,
		});

		// Execute the loop
		while (shouldContinueLoopStream && iterationCount < this.maxIterations) {
			iterationCount++;
			if (process.env.DEBUG === "true") {
				console.log(
					`[LoopAgent] Running iteration ${iterationCount}/${this.maxIterations} (streaming)`,
				);
			}

			// Status update for this iteration
			yield new LLMResponse({
				content: {
					role: "model",
					parts: [
						{
							text: `Running iteration ${iterationCount}/${this.maxIterations}...`,
						},
					],
				},
				is_partial: true,
			});

			try {
				// Run the agent with streaming
				const streamGenerator = loopAgentToExecute.runStreaming({
					contents: currentLoopStreamContents,
					config: options.config,
				});

				// Track the last non-partial chunk
				let lastChunkFromIteration: LLMResponse | null = null;

				// Stream each chunk from the current iteration
				for await (const chunk of streamGenerator) {
					let chunkText = "";
					if (chunk.content?.parts) {
						for (const part of chunk.content.parts) {
							if ("text" in part) chunkText += `${(part as TextPart).text} `;
						}
					}
					chunkText = chunkText.trim();

					const enhancedChunkContent: Content = {
						role: "model" as Role,
						parts: [
							{
								text: `Iteration ${iterationCount}/${this.maxIterations}: ${chunkText}`,
							},
						],
					};

					yield new LLMResponse({
						...chunk,
						content: enhancedChunkContent,
						is_partial: true,
					});

					if (!chunk.is_partial) {
						lastChunkFromIteration = chunk;
					}
				}

				// Need the last complete chunk for condition checking
				if (!lastChunkFromIteration) {
					if (process.env.DEBUG === "true") {
						console.warn(
							`[LoopAgent] No complete chunk received from iteration ${iterationCount}`,
						);
					}
					shouldContinueLoopStream = false;
					continue;
				}

				// Add the response to messages for the next iteration
				if (lastChunkFromIteration.content) {
					currentLoopStreamContents.push(lastChunkFromIteration.content);
				}

				// Check if we should continue the loop
				shouldContinueLoopStream = await this.shouldContinue(
					lastChunkFromIteration,
					iterationCount,
					currentLoopStreamContents,
					options.config,
				);

				// If we're continuing, add a transition message for the next iteration
				if (shouldContinueLoopStream) {
					currentLoopStreamContents.push({
						role: "user" as Role,
						parts: [
							{
								text: `Iteration ${iterationCount} complete. Continue to iteration ${iterationCount + 1}.`,
							},
						],
					});

					// Status update between iterations
					yield new LLMResponse({
						content: {
							role: "model",
							parts: [
								{
									text: `Completed iteration ${iterationCount}. ${shouldContinueLoopStream ? "Continuing to next iteration..." : "Loop complete."}`,
								},
							],
						},
						is_partial: shouldContinueLoopStream,
						turn_complete: !shouldContinueLoopStream,
					});
				}
			} catch (error) {
				console.error(
					`[LoopAgent] Error in loop iteration ${iterationCount}:`,
					error,
				);
				yield new LLMResponse({
					content: {
						role: "model",
						parts: [
							{
								text: `Error in loop iteration ${iterationCount}: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					},
					turn_complete: true,
				});
				return;
			}
		}

		// Final message summarizing the loop execution
		yield new LLMResponse({
			content: {
				role: "model",
				parts: [
					{
						text: `Loop execution completed after ${iterationCount} iterations.`,
					},
				],
			},
			turn_complete: true,
		});
	}
}
