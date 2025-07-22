import { Logger } from "@adk/logger";
import { Event } from "../events/event";
import { BaseAgent } from "./base-agent";
import type { InvocationContext } from "./invocation-context";

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
		lastEvent: Event,
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
	private results: Array<{ node: string; events: Event[] }> = [];

	protected logger = new Logger({ name: "LangGraphAgent" });

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
			this.subAgents.push(node.agent);
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
	 * Gets the next nodes to execute based on the current node and its result
	 */
	private async getNextNodes(
		currentNode: LangGraphNode,
		lastEvent: Event,
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
				this.logger.error(`Target node "${targetName}" not found`);
				continue;
			}

			// Check condition if exists
			if (targetNode.condition) {
				const shouldExecute = await targetNode.condition(lastEvent, context);
				if (!shouldExecute) {
					this.logger.debug(`Skipping node "${targetName}" due to condition`);
					continue;
				}
			}

			nextNodes.push(targetNode);
		}

		return nextNodes;
	}

	/**
	 * Core logic to run this agent via text-based conversation.
	 */
	protected async *runAsyncImpl(
		context: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		this.logger.debug(
			`Starting graph execution from root node "${this.rootNode}"`,
		);

		if (this.nodes.size === 0) {
			yield new Event({
				author: this.name,
				content: { parts: [{ text: "No nodes defined in the graph." }] },
			});
			return;
		}

		// Start with the root node
		const rootNode = this.nodes.get(this.rootNode);
		if (!rootNode) {
			yield new Event({
				author: this.name,
				content: {
					parts: [{ text: `Root node "${this.rootNode}" not found.` }],
				},
			});
			return;
		}

		// Initialize execution
		let stepCount = 0;
		const nodesToExecute: Array<{
			node: LangGraphNode;
			context: InvocationContext;
		}> = [{ node: rootNode, context }];

		// Track executed nodes for logging
		const executedNodes: string[] = [];
		let lastEvent: Event | null = null;

		// Execute the graph
		while (nodesToExecute.length > 0 && stepCount < this.maxSteps) {
			stepCount++;

			// Get next node to execute
			const { node } = nodesToExecute.shift()!;
			this.logger.debug(`Step ${stepCount}: Executing node "${node.name}"`);
			executedNodes.push(node.name);

			// Create child context for the sub-agent
			const childContext = context.createChildContext(node.agent);

			try {
				// Execute node agent
				const nodeEvents: Event[] = [];
				for await (const event of node.agent.runAsync(childContext)) {
					nodeEvents.push(event);
					lastEvent = event;
					yield event;
				}

				// Record in result history
				this.results.push({
					node: node.name,
					events: nodeEvents,
				});

				// Determine the next node(s) to execute
				if (lastEvent) {
					const nextNodes = await this.getNextNodes(node, lastEvent, context);

					// Add all valid next nodes to execution queue for parallel execution
					for (const nextNode of nextNodes) {
						nodesToExecute.push({
							node: nextNode,
							context: childContext,
						});
					}
				}
			} catch (error) {
				this.logger.error(`Error in node "${node.name}":`, error);
				const errorEvent = new Event({
					author: this.name,
					content: {
						parts: [
							{
								text: `Error in node "${node.name}": ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					},
				});

				// Set error properties directly since they're inherited from LlmResponse
				errorEvent.errorCode = "NODE_EXECUTION_ERROR";
				errorEvent.errorMessage =
					error instanceof Error ? error.message : String(error);

				yield errorEvent;
				return;
			}
		}

		// Final completion event
		const completionEvent = new Event({
			author: this.name,
			content: {
				parts: [
					{
						text: `Graph execution complete. Executed nodes: ${executedNodes.join(" → ")}`,
					},
				],
			},
		});

		// Set turnComplete property since it's inherited from LlmResponse
		completionEvent.turnComplete = true;

		yield completionEvent;
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation.
	 * For LangGraph, this follows the same execution pattern as text-based.
	 */
	protected async *runLiveImpl(
		context: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		// For LangGraph agents, live execution follows the same pattern as async
		// The individual node agents will handle their own live vs async differences
		yield* this.runAsyncImpl(context);
	}

	/**
	 * Gets the execution results from the last run
	 */
	getExecutionResults(): Array<{ node: string; events: Event[] }> {
		return [...this.results];
	}

	/**
	 * Clears the execution history
	 */
	clearExecutionHistory(): void {
		this.results = [];
	}

	/**
	 * Gets all nodes in the graph
	 */
	getNodes(): LangGraphNode[] {
		return Array.from(this.nodes.values());
	}

	/**
	 * Gets a specific node by name
	 */
	getNode(name: string): LangGraphNode | undefined {
		return this.nodes.get(name);
	}

	/**
	 * Gets the root node name
	 */
	getRootNodeName(): string {
		return this.rootNode;
	}

	/**
	 * Gets the maximum steps configuration
	 */
	getMaxSteps(): number {
		return this.maxSteps;
	}

	/**
	 * Updates the maximum steps configuration
	 */
	setMaxSteps(maxSteps: number): void {
		if (maxSteps <= 0) {
			throw new Error("maxSteps must be greater than 0");
		}
		this.maxSteps = maxSteps;
	}
}
