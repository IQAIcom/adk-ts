"use client";

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
import { type CSSProperties, useMemo } from "react";
import type {
	GraphEdgeDto as GraphEdge,
	GraphNodeDto as GraphNode,
	GraphResponseDto as GraphResponse,
} from "../Api";
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

	// Convert our graph data to React Flow format with a top-to-bottom tree layout
	const flowNodes: Node[] = useMemo(() => {
		// Build adjacency (children) map
		const childrenMap = new Map<string, string[]>();
		for (const edge of graphEdges) {
			if (!childrenMap.has(edge.from)) childrenMap.set(edge.from, []);
			childrenMap.get(edge.from)!.push(edge.to);
		}

		// Compute incoming edge counts to identify roots
		const incomingCount = new Map<string, number>();
		for (const node of graphNodes) incomingCount.set(node.id, 0);
		for (const edge of graphEdges) {
			incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
		}
		const roots = graphNodes.filter(
			(n: GraphNode) => (incomingCount.get(n.id) || 0) === 0,
		);

		// Levelize graph using BFS from all roots
		const visited = new Set<string>();
		const levels: string[][] = [];

		// If no roots (cyclic graph), fall back to arbitrary starting node to avoid empty layout
		const frontier: string[] =
			roots.length > 0
				? roots.map((r) => r.id)
				: ([graphNodes[0]?.id].filter(Boolean) as string[]);
		if (frontier.length === 0) return [];

		let current = frontier;
		while (current.length > 0) {
			const level: string[] = [];
			const next: string[] = [];
			for (const id of current) {
				if (visited.has(id)) continue;
				visited.add(id);
				level.push(id);
				const children = childrenMap.get(id) || [];
				for (const c of children) if (!visited.has(c)) next.push(c);
			}
			if (level.length) levels.push(level);
			current = next;
		}

		// Include any isolated or back-referenced nodes not reached (defensive)
		const remaining = graphNodes
			.filter((n) => !visited.has(n.id))
			.map((n) => n.id);
		if (remaining.length) levels.push(remaining);

		// Compute positions: vertical layers (y increases with depth), horizontal spacing within a layer
		const layerGapY = 150; // vertical distance between layers
		const nodeGapX = 220; // horizontal distance between nodes in same layer
		const positions = new Map<string, { x: number; y: number }>();
		const maxWidthCount = Math.max(...levels.map((l) => l.length));

		levels.forEach((level, depth) => {
			const count = level.length;
			const layerWidth = (count - 1) * nodeGapX;
			// Center each layer horizontally relative to the widest layer
			const maxLayerWidth = (maxWidthCount - 1) * nodeGapX;
			const offsetX = (maxLayerWidth - layerWidth) / 2;
			level.forEach((id, i) => {
				positions.set(id, {
					x: offsetX + i * nodeGapX,
					y: 40 + depth * layerGapY,
				});
			});
		});

		// Create flow nodes with computed positions
		return graphNodes.map((node: GraphNode) => ({
			id: node.id,
			type: node.kind, // 'agent' or 'tool'
			position: positions.get(node.id) || { x: 0, y: 0 },
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
			const isTool = targetKind === "tool";
			// Use high-contrast foreground for tool edges to ensure visibility across themes
			const stroke = isTool
				? "var(--color-secondary-foreground)"
				: "var(--color-primary)";
			const style: CSSProperties = {
				stroke,
				strokeWidth: isTool ? 2.75 : 2.25,
				opacity: 1,
				...(isTool ? { strokeDasharray: "10 6" } : {}),
				strokeLinecap: "round",
				filter: isTool ? "drop-shadow(0 0 1px rgba(0,0,0,0.5))" : undefined,
			};
			const e: Edge = {
				id: `edge-${index}`,
				source: edge.from,
				target: edge.to,
				type: "smoothstep",
				animated: false,
				style,
			};
			return e;
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
				position={Position.Top}
				className="!w-2 !h-2 !bg-primary !border-2 !border-background"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-2 !h-2 !bg-primary !border-2 !border-background"
			/>
		</div>
	);
}

// Custom node component for tools
function ToolNode({ data }: { data: any }) {
	return (
		<div className="relative px-3 py-2 shadow-md rounded-sm bg-secondary border-2 border-secondary min-w-[120px]">
			<div className="flex items-center gap-2">
				<Wrench className="w-3 h-3 text-secondary-foreground" />
				<div className="font-medium text-xs text-secondary-foreground">
					{data.label?.replace("🔧 ", "") || data.id}
				</div>
			</div>
			{/* Handles for edge rendering */}
			<Handle
				type="target"
				position={Position.Top}
				className="!w-2 !h-2 !bg-secondary !border-2 !border-background"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-2 !h-2 !bg-secondary !border-2 !border-background"
			/>
		</div>
	);
}
