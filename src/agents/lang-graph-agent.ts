import type {
	Message,
	MessageContent,
	TextContent,
} from "../models/llm-request";
import type { LLMResponse } from "../models/llm-response";
import { BaseAgent } from "./base-agent";
import { InvocationContext } from "./invocation-context";
import type { RunConfig } from "./run-config";

/**
 * Represents a node in a LangGraph workflow
 */
export interface LangGraphNode {
	/**
	 * Name of the node
	 */
	name: string;

	/**
	 * Agent associated with this node
	 */
	agent: BaseAgent;

	/**
	 * Target nodes to execute after this node
	 */
	targets?: string[];

	/**
	 * Condition function to determine if this node should execute
	 */
	condition?: (
		result: LLMResponse,
		context: InvocationContext,
	) => boolean | Promise<boolean>;
}

/**
 * Configuration for LangGraphAgent
 */
export interface LangGraphAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Graph nodes (agents and their connections)
	 */
	nodes: LangGraphNode[];

	/**
	 * Root node to start execution from
	 */
	rootNode: string;

	/**
	 * Maximum number of steps to prevent infinite loops
	 */
	maxSteps?: number;
}

/**
 * LangGraphAgent that implements a directed graph of agents
 * Allows complex workflows with conditional branching
 */
export class LangGraphAgent extends BaseAgent {
	/**
	 * Graph nodes (agents and their connections)
	 */
	private nodes: Map<string, LangGraphNode>;

	/**
	 * Root node to start execution from
	 */
	private rootNode: string;

	/**
	 * Maximum number of steps to prevent infinite loops
	 */
	private maxSteps: number;

	/**
	 * Results from node executions
	 */
	private results: Array<{ node: string; result: any }> = [];

	/**
	 * Constructor for LangGraphAgent
	 */
	constructor(config: LangGraphAgentConfig) {
		super({
			name: config.name,
			description: config.description,
		});

		// Initialize nodes map
		this.nodes = new Map<string, LangGraphNode>();

		// Add all nodes to the map
		for (const node of config.nodes) {
			if (this.nodes.has(node.name)) {
				throw new Error(`Duplicate node name in graph: ${node.name}`);
			}
			this.nodes.set(node.name, node);
			this.addSubAgent(node.agent);
		}

		// Set root node
		if (!this.nodes.has(config.rootNode)) {
			throw new Error(
				`Root node "${config.rootNode}" not found in graph nodes`,
			);
		}
		this.rootNode = config.rootNode;

		// Set max steps (default to 50)
		this.maxSteps = config.maxSteps || 50;

		// Validate graph for cycles and unreachable nodes
		this.validateGraph();
	}

	/**
	 * Validates the graph for potential issues
	 */
	private validateGraph(): void {
		// Check all target nodes exist
		for (const [nodeName, node] of Array.from(this.nodes)) {
			if (node.targets) {
				for (const target of node.targets) {
					if (!this.nodes.has(target)) {
						throw new Error(
							`Node "${nodeName}" targets non-existent node "${target}"`,
						);
					}
				}
			}
		}

		// TODO: Add cycle detection if needed
	}
	/**
	 * Check if a value is an LLMResponse
	 */
	private isLLMResponse(value: any): value is LLMResponse {
		return (
			value &&
			typeof value === "object" &&
			"role" in value &&
			typeof value.role === "string" &&
			(value.role === "assistant" ||
				value.role === "system" ||
				value.role === "user")
		);
	}

	/**
	 * Extracts text from MessageContent
	 */
	private extractTextContent(
		content: MessageContent | null | undefined,
	): string {
		if (!content) return "";

		if (typeof content === "string") {
			return content;
		}
		if (Array.isArray(content)) {
			return content
				.filter((item) => item.type === "text")
				.map((item) => (item as TextContent).text)
				.join(" ");
		}
		if (content.type === "text") {
			return content.text;
		}

		return "";
	}

	/**
	 * Gets the next nodes to execute based on the current node and its result
	 */
	private async getNextNodes(
		currentNode: LangGraphNode,
		result: LLMResponse,
		context: InvocationContext,
	): Promise<LangGraphNode[]> {
		if (!currentNode.targets || currentNode.targets.length === 0) {
			// Terminal node
			return [];
		}

		const nextNodes: LangGraphNode[] = [];

		for (const targetName of currentNode.targets) {
			const targetNode = this.nodes.get(targetName);
			if (!targetNode) {
				console.error(`[LangGraphAgent] Target node "${targetName}" not found`);
				continue;
			}

			// Check condition if exists
			if (targetNode.condition) {
				const shouldExecute = await targetNode.condition(result, context);
				console.log(
					`[LangGraphAgent] Checking condition for node "${targetName}": result = ${shouldExecute}`,
				);
				if (!shouldExecute) {
					console.log(
						`[LangGraphAgent] Skipping node "${targetName}" due to condition`,
					);
					continue;
				}
			}

			console.log(
				`[LangGraphAgent] Queuing node "${targetName}" for execution.`,
			);
			nextNodes.push(targetNode);
		}

		return nextNodes;
	}

	/**
	 * Conditionally execute the next node if the condition is met
	 */
	private async executeConditionalNode(
		node: LangGraphNode,
		targetName: string,
		messages: Message[],
		config?: RunConfig,
	): Promise<{ shouldExecute: boolean; result?: any }> {
		if (!node.condition) {
			return { shouldExecute: true };
		}

		// Create a mock context for the condition check
		const mockContext = new InvocationContext({
			messages,
			config,
		});

		// Create a mock LLMResponse for the condition check
		const mockResponse: LLMResponse = {
			role: "assistant",
			content:
				messages.length > 0
					? this.extractTextContent(messages[messages.length - 1].content)
					: "",
		};

		const shouldExecute = await node.condition(mockResponse, mockContext);
		if (!shouldExecute) {
			if (process.env.DEBUG === "true") {
				console.log(
					`[LangGraphAgent] Skipping node "${targetName}" due to condition`,
				);
			}
		}

		return { shouldExecute };
	}

	/**
	 * Runs the agent with the given messages and configuration
	 * Executes the graph by traversing nodes based on conditions
	 */
	async run(options: {
		messages: Message[];
		config?: RunConfig;
	}): Promise<LLMResponse> {
		// Create invocation context
		const context = new InvocationContext({
			messages: options.messages,
			config: options.config,
		});

		console.log(
			`[LangGraphAgent] Starting graph execution from root node "${this.rootNode}"`,
		);

		if (this.nodes.size === 0) {
			return {
				content: "No nodes defined in the graph.",
				role: "assistant",
			};
		}

		// Start with the root node
		const rootNode = this.nodes.get(this.rootNode);
		if (!rootNode) {
			return {
				content: `Root node "${this.rootNode}" not found.`,
				role: "assistant",
			};
		}

		// Initialize execution
		let stepCount = 0;
		const nodesToExecute: Array<{ node: LangGraphNode; messages: Message[] }> =
			[{ node: rootNode, messages: [...options.messages] }];

		// Track executed nodes for logging
		const executedNodes: string[] = [];

		// Execute the graph
		while (nodesToExecute.length > 0 && stepCount < this.maxSteps) {
			stepCount++;

			// Get next node to execute
			const { node, messages } = nodesToExecute.shift()!;
			console.log(
				`[LangGraphAgent] Step ${stepCount}: Executing node "${node.name}"`,
			);
			executedNodes.push(node.name);

			try {
				// Execute node function
				const result = await node.agent.run({
					messages: messages,
					config: context.config,
				});

				// Store result in memory
				context.memory.set(node.name, result);

				// Record in result history
				this.results.push({
					node: node.name,
					result,
				});
				console.log("node results", this.results);

				// If the result is an LLMResponse, add it to the messages
				if (this.isLLMResponse(result)) {
					const extractedContent = this.extractTextContent(result.content);

					// Ensure we don't pass empty content to the next node
					// Google Gemini throws "empty text parameter" error for empty strings
					const messageContent =
						extractedContent.trim() ||
						`Node "${node.name}" completed successfully.`;

					context.messages.push({
						role: "assistant",
						content: messageContent,
					});
				}

				console.log(
					`[LangGraphAgent] Node "${node.name}" finished. Output:`,
					this.extractTextContent(result?.content),
				);

				// Determine the next node(s) to execute
				const nextNodeName: string | null = await this.getNextNodes(
					node,
					result,
					context,
				).then((nodes) => nodes[0]?.name || null);

				// Move to the next node or terminate
				if (!nextNodeName) {
					// No more nodes to execute
					break;
				}

				// Add next node to execution queue
				const nextNode = this.nodes.get(nextNodeName);
				if (nextNode) {
					nodesToExecute.push({
						node: nextNode,
						messages: [...context.messages],
					});
				}
			} catch (error) {
				console.error(`[LangGraphAgent] Error in node "${node.name}":`, error);
				return {
					content: `Error in node "${node.name}": ${error instanceof Error ? error.message : String(error)}`,
					role: "assistant",
				};
			}
		}

		// Get the final result from the last executed node
		const lastNodeResult = this.results[this.results.length - 1]?.result;

		// If the final result is an LLMResponse, return it directly
		if (this.isLLMResponse(lastNodeResult)) {
			return lastNodeResult;
		}

		// Otherwise, create a response with the final result information
		return {
			content: `Graph execution complete. Final result from node "${this.results[this.results.length - 1]?.node}": ${
				typeof lastNodeResult === "string"
					? lastNodeResult
					: JSON.stringify(lastNodeResult, null, 2)
			}`,
			role: "assistant",
		};
	}

	/**
	 * Runs the agent with streaming support
	 */
	async *runStreaming(options: {
		messages: Message[];
		config?: RunConfig;
	}): AsyncIterable<LLMResponse> {
		// Create invocation context
		const context = new InvocationContext({
			messages: options.messages,
			config: options.config,
		});

		if (process.env.DEBUG === "true") {
			console.log(
				`[LangGraphAgent] Starting graph execution from root node "${this.rootNode}" (streaming)`,
			);
		}

		if (this.nodes.size === 0) {
			yield {
				content: "No nodes defined in the graph.",
				role: "assistant",
			};
			return;
		}

		// Start with the root node
		const rootNode = this.nodes.get(this.rootNode);
		if (!rootNode) {
			yield {
				content: `Root node "${this.rootNode}" not found.`,
				role: "assistant",
			};
			return;
		}

		// Initial status message
		yield {
			content: `Starting graph execution from root node "${this.rootNode}"...`,
			role: "assistant",
			is_partial: true,
		};

		// Initialize execution
		let stepCount = 0;
		const nodesToExecute: Array<{ node: LangGraphNode; messages: Message[] }> =
			[{ node: rootNode, messages: [...options.messages] }];

		// Track executed nodes for logging
		const executedNodes: string[] = [];

		// Execute the graph
		while (nodesToExecute.length > 0 && stepCount < this.maxSteps) {
			stepCount++;

			// Get next node to execute
			const { node, messages } = nodesToExecute.shift()!;
			if (process.env.DEBUG === "true") {
				console.log(
					`[LangGraphAgent] Step ${stepCount}: Executing node "${node.name}" (streaming)`,
				);
			}
			executedNodes.push(node.name);

			try {
				// Execute node function
				const result = await node.agent.run({
					messages: messages,
					config: context.config,
				});

				// Store result in memory
				context.memory.set(node.name, result);

				// Record in result history
				this.results.push({
					node: node.name,
					result,
				});

				// If the result is an LLMResponse, add it to the messages
				if (this.isLLMResponse(result)) {
					const extractedContent = this.extractTextContent(result.content);

					// Ensure we don't pass empty content to the next node
					// Google Gemini throws "empty text parameter" error for empty strings
					const messageContent =
						extractedContent.trim() ||
						`Node "${node.name}" completed successfully.`;

					context.messages.push({
						role: "assistant",
						content: messageContent,
					});
				}

				console.log(
					`[LangGraphAgent] Node "${node.name}" finished. Output:`,
					this.extractTextContent(result?.content),
				);

				// Update with node result
				yield {
					content: `Completed node "${node.name}". ${
						this.isLLMResponse(result)
							? `\nNode output: ${this.extractTextContent(result.content)}`
							: ""
					}`,
					role: "assistant",
					is_partial: true,
				};

				// Determine the next node(s) to execute
				let nextNodeName: string | null = null;

				// If there are defined edges from this node, follow them
				if (node.targets && node.targets.length > 0) {
					// Find the first edge with a true condition or no condition
					for (const targetName of node.targets) {
						// Check target node condition if any
						const targetNode = this.nodes.get(targetName);
						if (!targetNode) {
							throw new Error(`Target node "${targetName}" not found in graph`);
						}

						const { shouldExecute } = await this.executeConditionalNode(
							targetNode,
							targetName,
							context.messages,
							context.config,
						);

						if (shouldExecute) {
							nextNodeName = targetName;
							break;
						}
					}
				}

				// Move to the next node or terminate
				if (!nextNodeName) {
					// No more nodes to execute
					break;
				}

				// Add next node to execution queue
				const nextNode = this.nodes.get(nextNodeName);
				if (nextNode) {
					nodesToExecute.push({
						node: nextNode,
						messages: [...context.messages],
					});
				}
			} catch (error) {
				console.error(`[LangGraphAgent] Error in node "${node.name}":`, error);
				yield {
					content: `Error in node "${node.name}": ${error instanceof Error ? error.message : String(error)}`,
					role: "assistant",
				};
				return;
			}
		}

		// Get the final result from the last executed node
		const lastNodeResult = this.results[this.results.length - 1]?.result;

		// Final update
		if (this.isLLMResponse(lastNodeResult)) {
			yield lastNodeResult;
		} else {
			yield {
				content: `Graph execution complete. Final result from node "${this.results[this.results.length - 1]?.node}": ${
					typeof lastNodeResult === "string"
						? lastNodeResult
						: JSON.stringify(lastNodeResult, null, 2)
				}`,
				role: "assistant",
			};
		}
	}
}
