import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { BaseAgent } from "@iqai/adk";
import type { BaseTool } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import { AgentLoader } from "./agent-loader.service";
import { AgentManager } from "./agent-manager.service";

export interface GraphNode {
	id: string; // unique within graph (prefixes used to avoid collisions)
	label: string;
	kind: "agent" | "tool";
	type?: string; // LlmAgent | SequentialAgent | LoopAgent | ParallelAgent | BaseAgent | ToolClass
	shape?: string; // ellipse | box | cylinder, etc.
	group?: string; // for cluster/grouping purposes
}

export interface GraphEdge {
	from: string;
	to: string;
}

export interface AgentGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

@Injectable()
export class AgentGraphService {
	private logger = new Logger("agent-graph");

	constructor(private readonly agentManager: AgentManager) {}

	async getGraph(agentPath: string): Promise<AgentGraph> {
		const registry = this.agentManager.getAgents();
		const loaded = this.agentManager.getLoadedAgents().get(agentPath);
		let agent = loaded?.agent ?? registry.get(agentPath)?.instance;

		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const seen = new Set<string>();

		if (!agent) {
			// Try to load the agent module just-in-time for richer introspection
			const root = registry.get(agentPath);
			if (root) {
				try {
					const loader = new AgentLoader(true);
					let filePath = join(root.absolutePath, "agent.ts");
					if (!existsSync(filePath)) {
						filePath = join(root.absolutePath, "agent.js");
					}
					if (existsSync(filePath)) {
						loader.loadEnvironmentVariables(filePath);
						let mod: Record<string, unknown> = {};
						try {
							mod = filePath.endsWith(".ts")
								? await loader.importTypeScriptFile(filePath, root.projectRoot)
								: ((await import(pathToFileURL(filePath).href)) as Record<
										string,
										unknown
									>);
							const agentResult = await loader.resolveAgentExport(mod);
							agent = agentResult.agent;
						} catch (e) {
							this.logger.warn(
								`Failed to load agent for graph at ${filePath}: ${e instanceof Error ? e.message : String(e)}`,
							);
						}
					}
				} catch {}
			}
		}

		if (agent) {
			// Preferred path: we have an actual agent instance to introspect
			await this.traverseAgentGraph(agent, nodes, edges, seen);
		} else {
			this.logger.debug("Graph fallback: agent instance not available");
			// Fallback: build a directory-based graph from the registry without loading the agent
			const root = registry.get(agentPath);
			if (!root) {
				// Unknown agent id; return empty graph instead of 500
				return { nodes: [], edges: [] };
			}
			await this.buildGraphFromRegistryFallback(agentPath, nodes, edges, seen);
		}

		return { nodes, edges };
	}

	// Cross-package safe detection using constructor name instead of instanceof
	// Rationale: Users' agents are compiled with esbuild and may load their own
	// copy of @iqai/adk. instanceof would fail across module boundaries, so we
	// use duck typing and constructor.name to classify.
	private getNodeMetaForAgent(
		ag: BaseAgent,
	): Pick<GraphNode, "type" | "shape" | "group"> {
		const typeName = ag?.constructor?.name ?? "BaseAgent";
		if (typeName === "LlmAgent") {
			return { type: "LlmAgent", shape: "ellipse", group: undefined };
		}
		if (typeName === "SequentialAgent") {
			return { type: "SequentialAgent", shape: "ellipse", group: "sequential" };
		}
		if (typeName === "LoopAgent") {
			return { type: "LoopAgent", shape: "ellipse", group: "loop" };
		}
		if (typeName === "ParallelAgent") {
			return { type: "ParallelAgent", shape: "ellipse", group: "parallel" };
		}
		return { type: typeName, shape: "ellipse", group: undefined };
	}

	// Narrowing helper for LoopAgent without importing concrete class
	private isLoopAgent(agent: BaseAgent): boolean {
		return agent?.constructor?.name === "LoopAgent";
	}

	private createToolNode(tool: BaseTool): GraphNode {
		return {
			id: `tool:${tool.name}`,
			label: `🔧 ${tool.name}`,
			kind: "tool",
			type: tool.constructor?.name ?? "Tool",
			shape: "box",
		};
	}

	private addAgentNode(
		ag: BaseAgent,
		nodes: GraphNode[],
		seen: Set<string>,
	): GraphNode {
		const meta = this.getNodeMetaForAgent(ag);
		const node: GraphNode = {
			id: `agent:${ag.name}`,
			label: `🤖 ${ag.name}`,
			kind: "agent",
			type: meta.type,
			shape: meta.shape,
			group: meta.group,
		};
		if (!seen.has(node.id)) {
			nodes.push(node);
			seen.add(node.id);
		}
		return node;
	}

	private async traverseAgentGraph(
		ag: BaseAgent,
		nodes: GraphNode[],
		edges: GraphEdge[],
		seen: Set<string>,
		parent?: BaseAgent,
	): Promise<void> {
		const current = this.addAgentNode(ag, nodes, seen);
		if (parent) {
			edges.push({ from: `agent:${parent.name}`, to: current.id });
		}
		// Recurse sub-agents
		for (const sub of ag.subAgents || []) {
			await this.traverseAgentGraph(sub, nodes, edges, seen, ag);
		}
		// Tools: prefer duck typing to avoid cross-realm instanceof issues
		if (typeof (ag as any)?.canonicalTools === "function") {
			try {
				const tools = await (ag as any).canonicalTools();
				for (const t of tools as BaseTool[]) {
					const n = this.createToolNode(t);
					if (!seen.has(n.id)) {
						nodes.push(n);
						seen.add(n.id);
					}
					edges.push({ from: `agent:${ag.name}`, to: n.id });
				}
			} catch (e) {
				this.logger.warn(
					`Failed to resolve tools for agent ${ag.name}: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		}
	}

	private async buildGraphFromRegistryFallback(
		agentPath: string,
		nodes: GraphNode[],
		edges: GraphEdge[],
		seen: Set<string>,
	): Promise<void> {
		const registry = this.agentManager.getAgents();
		const root = registry.get(agentPath);
		if (!root) return; // handled by caller earlier

		const rootNode: GraphNode = {
			id: `agent:${root.name}`,
			label: `🤖 ${root.name}`,
			kind: "agent",
			type: "Agent",
			shape: "ellipse",
		};
		nodes.push(rootNode);
		seen.add(rootNode.id);

		const prefix = root.relativePath.endsWith("/")
			? root.relativePath
			: `${root.relativePath}/`;
		for (const [rel, entry] of registry.entries()) {
			if (!rel.startsWith(prefix)) continue;
			if (rel === root.relativePath) continue;
			const childNode: GraphNode = {
				id: `agent:${entry.name}`,
				label: `🤖 ${entry.name}`,
				kind: "agent",
				type: "Agent",
				shape: "ellipse",
			};
			if (!seen.has(childNode.id)) {
				nodes.push(childNode);
				seen.add(childNode.id);
			}
			edges.push({ from: rootNode.id, to: childNode.id });

			// Best-effort: try to load sub-agent module directly to discover tools
			try {
				const loader = new AgentLoader(true);
				// Resolve agent file path
				let filePath = join(entry.absolutePath, "agent.ts");
				if (!existsSync(filePath)) {
					filePath = join(entry.absolutePath, "agent.js");
				}
				if (existsSync(filePath)) {
					// Load env from the project before import
					loader.loadEnvironmentVariables(filePath);
					let mod: Record<string, unknown> = {};
					try {
						if (filePath.endsWith(".ts")) {
							mod = await loader.importTypeScriptFile(
								filePath,
								(entry as any).projectRoot,
							);
						} else {
							mod = (await import(pathToFileURL(filePath).href)) as Record<
								string,
								unknown
							>;
						}
					} catch (e) {
						this.logger.warn(
							`Failed to import sub-agent module at ${filePath}: ${e instanceof Error ? e.message : String(e)}`,
						);
					}

					// Try to find a function export that returns an agent with canonicalTools (no build)
					let subAgentInstance: BaseAgent | undefined;
					for (const [k, v] of Object.entries(mod)) {
						if (typeof v !== "function") continue;
						// Heuristic: names containing 'agent'
						if (!/agent/i.test(k)) continue;
						try {
							const result = await Promise.resolve((v as any)());
							if (
								result &&
								typeof (result as any)?.canonicalTools === "function"
							) {
								subAgentInstance = result as BaseAgent;
								break;
							}
						} catch {}
					}

					if (subAgentInstance) {
						try {
							const tools = await (subAgentInstance as any).canonicalTools();
							for (const t of tools) {
								const n = this.createToolNode(t as BaseTool);
								if (!seen.has(n.id)) {
									nodes.push(n);
									seen.add(n.id);
								}
								edges.push({ from: childNode.id, to: n.id });
							}
						} catch (e) {
							this.logger.warn(
								`Failed to resolve tools for sub-agent ${entry.name}: ${e instanceof Error ? e.message : String(e)}`,
							);
						}
					}
				}
			} catch {}
		}
	}
}
