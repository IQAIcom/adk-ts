"use client";

import type {
	GraphEdge,
	GraphNode,
	GraphResponse,
} from "@/hooks/use-agent-graph";
import {
	Background,
	ConnectionLineType,
	Controls,
	type Edge,
	Handle,
	type Node,
	Position,
	ReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";
import "@xyflow/react/dist/style.css";
import { Bot, Wrench } from "lucide-react";

interface GraphPanelProps {
	data?: GraphResponse;
	isLoading?: boolean;
	error?: Error | null;
}

const nodeTypes = {
	agent: AgentNode,
	tool: ToolNode,
};

export function GraphPanel({ data, isLoading, error }: GraphPanelProps) {
	// Render a full-bleed canvas; overlay messages when needed
	const showMessage = isLoading || !!error || !data;
	const message = isLoading
		? "Loading graph…"
		: error
			? `Failed to load graph: ${error.message}`
			: !data
				? "No graph available"
				: null;

	if (showMessage) {
		return (
			<div className="relative w-full h-full min-h-0 grid place-items-center text-sm text-muted-foreground">
				{message}
			</div>
		);
	}

	// At this point, data is defined
	const { nodes: graphNodes, edges: graphEdges } = data as GraphResponse;

	// Convert our graph data to React Flow format with simple layout
	const flowNodes: Node[] = useMemo(() => {
		// Create a simple hierarchical layout
		const agentNodes = graphNodes.filter((n: GraphNode) => n.kind === "agent");
		const toolNodes = graphNodes.filter((n: GraphNode) => n.kind === "tool");

		// Build adjacency map for layout
		const childrenMap = new Map<string, string[]>();
		for (const edge of graphEdges) {
			if (!childrenMap.has(edge.from)) {
				childrenMap.set(edge.from, []);
			}
			childrenMap.get(edge.from)!.push(edge.to);
		}

		// Find root nodes (no incoming edges)
		const incomingCount = new Map<string, number>();
		for (const node of graphNodes) {
			incomingCount.set(node.id, 0);
		}
		for (const edge of graphEdges) {
			incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
		}
		const rootNodes = graphNodes.filter(
			(n: GraphNode) => incomingCount.get(n.id) === 0,
		);

		// Simple layered positioning
		const positioned = new Set<string>();
		const positions = new Map<string, { x: number; y: number }>();

		// Position root nodes
		if (rootNodes.length === 1) {
			positions.set(rootNodes[0].id, { x: 200, y: 50 });
			positioned.add(rootNodes[0].id);
		} else {
			rootNodes.forEach((node: GraphNode, i: number) => {
				positions.set(node.id, { x: 50, y: i * 150 + 50 });
				positioned.add(node.id);
			});
		}

		// Position children in layers
		let currentLayer = [...rootNodes.map((n: GraphNode) => n.id)];
		let layerX = rootNodes.length === 1 ? 200 : 250;

		while (currentLayer.length > 0) {
			const nextLayer: string[] = [];
			let layerY = rootNodes.length === 1 ? 150 : 50;

			for (const nodeId of currentLayer) {
				const children = childrenMap.get(nodeId) || [];
				children.forEach((childId, i) => {
					if (!positioned.has(childId)) {
						positions.set(childId, { x: layerX, y: layerY + i * 120 });
						positioned.add(childId);
						nextLayer.push(childId);
						layerY += 120;
					}
				});
			}

			currentLayer = nextLayer;
			layerX += 200;
		}

		// Create flow nodes
		return graphNodes.map((node: GraphNode) => ({
			id: node.id,
			type: node.kind, // 'agent' or 'tool'
			position: positions.get(node.id) || {
				x: Math.random() * 400,
				y: Math.random() * 300,
			},
			data: {
				label: node.label,
				type: node.type,
				kind: node.kind,
			},
			connectable: false,
		}));
	}, [graphNodes, graphEdges]);

	const flowEdges: Edge[] = useMemo(() => {
		// Map target id to node kind for coloring
		const kindById = new Map<string, string>();
		for (const n of graphNodes as GraphNode[]) {
			kindById.set(n.id, n.kind);
		}
		return graphEdges.map((edge: GraphEdge, index: number) => {
			const targetKind = kindById.get(edge.to);
			const stroke =
				targetKind === "tool" ? "var(--color-accent)" : "var(--color-primary)";
			return {
				id: `edge-${index}`,
				source: edge.from,
				target: edge.to,
				type: "smoothstep",
				animated: false,
				style: { stroke, strokeWidth: 2, opacity: 0.9 },
			} as Edge;
		});
	}, [graphEdges, graphNodes]);

	// Keep React Flow state in sync with computed nodes/edges
	const nodes = flowNodes;
	const edges = flowEdges;

	// Read-only graph; no interactive connections

	return (
		<div className="relative w-full h-full min-h-0">
			<style jsx global>{`
				.adk-graph .react-flow__panel.react-flow__attribution { display: none; }
				.adk-graph .react-flow__controls-button {
					background: var(--color-card);
					color: var(--color-card-foreground);
					border: 1px solid var(--color-border);
				}
				.adk-graph .react-flow__controls-button:hover {
					background: var(--color-secondary);
					color: var(--color-secondary-foreground);
				}
				.adk-graph .react-flow__controls-button svg { fill: currentColor; }
				.adk-graph .react-flow__edge-path { filter: drop-shadow(0 0 0.5px rgba(0,0,0,0.15)); }
			`}</style>
			<ReactFlow
				className="adk-graph w-full h-full"
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				connectionLineType={ConnectionLineType.SmoothStep}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				attributionPosition="bottom-left"
			>
				<Background color="var(--color-muted-foreground)" gap={20} size={1} />
				<Controls position="bottom-left" />
			</ReactFlow>
		</div>
	);
}

// Custom node component for agents
function AgentNode({ data }: { data: any }) {
	return (
		<div className="relative px-4 py-2 shadow-md rounded-md bg-card border-2 border-primary min-w-[150px]">
			<div className="flex items-center gap-2">
				<Bot className="w-4 h-4 text-primary" />
				<div className="font-medium text-sm text-card-foreground">
					{data.label?.replace("🤖 ", "") || data.id}
				</div>
			</div>
			{data.type && (
				<div className="text-xs text-muted-foreground mt-1">{data.type}</div>
			)}
			{/* Handles for edge rendering */}
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !bg-primary !border-2 !border-background"
			/>
			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !bg-primary !border-2 !border-background"
			/>
		</div>
	);
}

// Custom node component for tools
function ToolNode({ data }: { data: any }) {
	return (
		<div className="relative px-3 py-2 shadow-md rounded-md bg-card border-2 border-accent min-w-[120px]">
			<div className="flex items-center gap-2">
				<Wrench className="w-3 h-3 text-accent-foreground" />
				<div className="font-medium text-xs text-card-foreground">
					{data.label?.replace("🔧 ", "") || data.id}
				</div>
			</div>
			{/* Handles for edge rendering */}
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !bg-accent !border-2 !border-background"
			/>
			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !bg-accent !border-2 !border-background"
			/>
		</div>
	);
}
