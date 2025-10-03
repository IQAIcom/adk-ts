"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
	GraphEdge,
	GraphNode,
	GraphResponse,
} from "@/hooks/useAgentGraph";
import {
	Background,
	ConnectionLineType,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";
import "@xyflow/react/dist/style.css";
import { Bot, Wrench } from "lucide-react";

interface GraphPanelProps {
	data?: GraphResponse;
	isLoading?: boolean;
}

// Custom node component for agents
function AgentNode({ data }: { data: any }) {
	return (
		<div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-400 min-w-[120px]">
			<div className="flex items-center gap-2">
				<Bot className="w-4 h-4 text-blue-600" />
				<div className="font-medium text-sm text-gray-900">
					{data.label?.replace("🤖 ", "") || data.id}
				</div>
			</div>
			{data.type && (
				<div className="text-xs text-gray-500 mt-1">{data.type}</div>
			)}
		</div>
	);
}

// Custom node component for tools
function ToolNode({ data }: { data: any }) {
	return (
		<div className="px-3 py-2 shadow-md rounded-md bg-gray-50 border-2 border-orange-400 min-w-[100px]">
			<div className="flex items-center gap-2">
				<Wrench className="w-3 h-3 text-orange-600" />
				<div className="font-medium text-xs text-gray-700">
					{data.label?.replace("🔧 ", "") || data.id}
				</div>
			</div>
		</div>
	);
}

const nodeTypes = {
	agent: AgentNode,
	tool: ToolNode,
};

export function GraphPanel({ data, isLoading }: GraphPanelProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Agent Graph</CardTitle>
				</CardHeader>
				<CardContent>Loading graph…</CardContent>
			</Card>
		);
	}
	if (!data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Agent Graph</CardTitle>
				</CardHeader>
				<CardContent>No graph available</CardContent>
			</Card>
		);
	}

	const { nodes: graphNodes, edges: graphEdges } = data;

	// Convert our graph data to React Flow format with simple layout
	const flowNodes: Node[] = useMemo(() => {
		// Create a simple hierarchical layout
		const agentNodes = graphNodes.filter((n) => n.kind === "agent");
		const toolNodes = graphNodes.filter((n) => n.kind === "tool");

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
		const rootNodes = graphNodes.filter((n) => incomingCount.get(n.id) === 0);

		// Simple layered positioning
		const positioned = new Set<string>();
		const positions = new Map<string, { x: number; y: number }>();

		// Position root nodes
		rootNodes.forEach((node, i) => {
			positions.set(node.id, { x: 50, y: i * 150 + 50 });
			positioned.add(node.id);
		});

		// Position children in layers
		let currentLayer = [...rootNodes.map((n) => n.id)];
		let layerX = 250;

		while (currentLayer.length > 0) {
			const nextLayer: string[] = [];
			let layerY = 50;

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
		return graphNodes.map((node) => ({
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
		}));
	}, [graphNodes, graphEdges]);

	const flowEdges: Edge[] = useMemo(() => {
		return graphEdges.map((edge, index) => ({
			id: `edge-${index}`,
			source: edge.from,
			target: edge.to,
			type: "smoothstep",
			animated: false,
			style: { stroke: "#94a3b8", strokeWidth: 2 },
		}));
	}, [graphEdges]);

	const [nodes, , onNodesChange] = useNodesState(flowNodes);
	const [edges, , onEdgesChange] = useEdgesState(flowEdges);

	const onConnect = useCallback(() => {
		// Read-only graph, no connections allowed
	}, []);

	return (
		<Card className="w-full h-full">
			<CardHeader>
				<CardTitle>Agent Graph</CardTitle>
			</CardHeader>
			<CardContent className="w-full h-[calc(100vh-240px)] p-0">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={nodeTypes}
					connectionLineType={ConnectionLineType.SmoothStep}
					fitView
					fitViewOptions={{ padding: 0.2 }}
					attributionPosition="bottom-left"
				>
					<Background />
					<Controls />
					<MiniMap
						nodeStrokeColor={(n: any) =>
							n.type === "agent" ? "#2563eb" : "#ea580c"
						}
						nodeColor={(n: any) => (n.type === "agent" ? "#dbeafe" : "#fed7aa")}
						nodeBorderRadius={4}
					/>
				</ReactFlow>
			</CardContent>
		</Card>
	);
}
