import type { BaseAgent } from "@iqai/adk";
import { Agents as AdkAgents } from "@iqai/adk";
import type { BaseTool } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
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
	dot?: string; // optional Graphviz DOT
}

@Injectable()
export class AgentGraphService {
	private logger = new Logger("agent-graph");

	constructor(private readonly agentManager: AgentManager) {}

	async getGraph(
		agentPath: string,
		opts?: { includeTools?: boolean; format?: "json" | "dot" },
	): Promise<AgentGraph> {
		const includeTools = opts?.includeTools ?? true;
		const registry = this.agentManager.getAgents();
		const loaded = this.agentManager.getLoadedAgents().get(agentPath);
		const agent = loaded?.agent ?? registry.get(agentPath)?.instance;

		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const seen = new Set<string>();

		const getNodeMeta = (
			ag: BaseAgent,
		): Pick<GraphNode, "type" | "shape" | "group"> => {
			if (ag instanceof AdkAgents.LlmAgent) {
				return { type: "LlmAgent", shape: "ellipse", group: undefined };
			}
			if (ag instanceof AdkAgents.SequentialAgent) {
				return {
					type: "SequentialAgent",
					shape: "ellipse",
					group: "sequential",
				};
			}
			if (
				(AdkAgents as any).LoopAgent &&
				ag instanceof (AdkAgents as any).LoopAgent
			) {
				return { type: "LoopAgent", shape: "ellipse", group: "loop" };
			}
			if (ag instanceof AdkAgents.ParallelAgent) {
				return { type: "ParallelAgent", shape: "ellipse", group: "parallel" };
			}
			return {
				type: ag.constructor?.name ?? "BaseAgent",
				shape: "ellipse",
				group: undefined,
			};
		};

		const toolNode = (tool: BaseTool): GraphNode => ({
			id: `tool:${tool.name}`,
			label: `🔧 ${tool.name}`,
			kind: "tool",
			type: tool.constructor?.name ?? "Tool",
			shape: "box",
		});

		const addAgentNode = (ag: BaseAgent): GraphNode => {
			const meta = getNodeMeta(ag);
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
		};

		const traverse = async (ag: BaseAgent, parent?: BaseAgent) => {
			const current = addAgentNode(ag);
			if (parent) {
				edges.push({ from: `agent:${parent.name}`, to: current.id });
			}
			// Recurse sub-agents
			for (const sub of ag.subAgents || []) {
				await traverse(sub, ag);
			}
			// Tools for LlmAgent
			if (includeTools && ag instanceof AdkAgents.LlmAgent) {
				try {
					const tools = await ag.canonicalTools();
					for (const t of tools) {
						const n = toolNode(t as BaseTool);
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
		};

		if (agent) {
			// Preferred path: we have an actual agent instance to introspect
			await traverse(agent);
		} else {
			// Fallback: build a directory-based graph from the registry without loading the agent
			const root = registry.get(agentPath);
			if (!root) {
				// Unknown agent id; return empty graph instead of 500
				return { nodes: [], edges: [] };
			}

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
			}
		}

		let dot: string | undefined;
		if (opts?.format === "dot") {
			dot = this.toDot(nodes, edges);
		}

		return { nodes, edges, dot };
	}

	private toDot(nodes: GraphNode[], edges: GraphEdge[]): string {
		const header =
			'digraph G {\n  rankdir=LR;\n  bgcolor="#333537";\n  node [fontcolor="#cccccc", color="#cccccc"];\n';
		const bodyNodes = nodes
			.map((n) => {
				const shape = n.shape ?? (n.kind === "agent" ? "ellipse" : "box");
				const label = n.label.replace(/\"/g, '\\"');
				return `  "${n.id}" [label="${label}", shape=${shape}];`;
			})
			.join("\n");
		const bodyEdges = edges
			.map((e) => `  "${e.from}" -> "${e.to}" [color=\"#cccccc\"];`)
			.join("\n");
		return `${header}${bodyNodes}\n${bodyEdges}\n}`;
	}
}
