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
import { GraphControls, useGraphControls } from "./graph-controls";

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
	// Use the graph controls hook for state management
	const {
		searchTerm,
		nodeTypeFilter,
		toolCategoryFilter,
		showControls,
		handleSearchChange,
		handleNodeTypeChange,
		handleToolCategoryChange,
		handleControlsToggle,
		clearFilters,
	} = useGraphControls();

	// Extract graph data safely
	const graphNodes = data?.nodes || [];
	const graphEdges = data?.edges || [];

	// Convert our graph data to React Flow format with improved layout for many tools
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

		// Adaptive spacing based on node density and type
		const totalNodes = graphNodes.length;

		// Dynamic spacing based on node count and density
		const baseLayerGapY = 150; // vertical distance between layers;
		const baseNodeGapX = 220; // horizontal distance between nodes in same layer;

		// Increase spacing for dense graphs
		const densityFactor = Math.min(1.5, Math.max(0.9, totalNodes / 20));
		const layerGapY = Math.round(baseLayerGapY * densityFactor);
		const nodeGapX = Math.round(baseNodeGapX * densityFactor);

		// Special handling for tool-heavy levels
		const positions = new Map<string, { x: number; y: number }>();
		const maxWidthCount = Math.max(...levels.map((l) => l.length));

		levels.forEach((level, depth) => {
			const count = level.length;
			const levelNodes = level
				.map((id) => graphNodes.find((n) => n.id === id))
				.filter(Boolean) as GraphNode[];
			const toolCount = levelNodes.filter((n) => n.kind === "tool").length;
			const agentCount = levelNodes.filter((n) => n.kind === "agent").length;

			// Adjust spacing for tool-heavy levels
			const isToolHeavy = toolCount > agentCount * 2;
			const levelNodeGapX = isToolHeavy ? Math.round(nodeGapX * 0.7) : nodeGapX;

			// Group tools by parent agent for better organization
			if (isToolHeavy && agentCount > 0) {
				// Find parent agents for this level
				const parentAgents = levelNodes.filter((n) => n.kind === "agent");
				const tools = levelNodes.filter((n) => n.kind === "tool");

				// Group tools under their parent agents
				const agentPositions = new Map<string, number>();
				const toolGroups = new Map<string, string[]>();

				// Find which tools belong to which agents
				for (const tool of tools) {
					const parentEdge = graphEdges.find((e) => e.to === tool.id);
					if (parentEdge) {
						const parentId = parentEdge.from;
						if (!toolGroups.has(parentId)) toolGroups.set(parentId, []);
						toolGroups.get(parentId)!.push(tool.id);
					}
				}

				// Position agents first
				parentAgents.forEach((agent, i) => {
					const x =
						i * levelNodeGapX * 2 - (parentAgents.length - 1) * levelNodeGapX;
					agentPositions.set(agent.id, x);
					positions.set(agent.id, {
						x,
						y: 40 + depth * layerGapY,
					});
				});

				// Position tools in clusters around their parent agents
				for (const [parentId, toolIds] of toolGroups) {
					const parentX = agentPositions.get(parentId) || 0;
					const toolSpacing = Math.min(levelNodeGapX * 0.4, 80);
					const startX = parentX - ((toolIds.length - 1) * toolSpacing) / 2;

					toolIds.forEach((toolId, toolIndex) => {
						positions.set(toolId, {
							x: startX + toolIndex * toolSpacing,
							y: 40 + depth * layerGapY + 60, // Offset tools below agents
						});
					});
				}
			} else {
				// Standard layout for non-tool-heavy levels
				const layerWidth = (count - 1) * levelNodeGapX;
				const maxLayerWidth = (maxWidthCount - 1) * nodeGapX;
				const offsetX = (maxLayerWidth - layerWidth) / 2;

				level.forEach((id, i) => {
					positions.set(id, {
						x: offsetX + i * levelNodeGapX,
						y: 40 + depth * layerGapY,
					});
				});
			}
		});

		// Apply filtering logic
		const filteredNodes = graphNodes.filter((node: GraphNode) => {
			// Search filter
			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase();
				const matchesSearch =
					node.label?.toLowerCase().includes(searchLower) ||
					node.id.toLowerCase().includes(searchLower) ||
					node.type?.toLowerCase().includes(searchLower);
				if (!matchesSearch) return false;
			}

			// Node type filter
			if (nodeTypeFilter !== "all" && node.kind !== nodeTypeFilter)
				return false;

			// Tool category filter
			if (toolCategoryFilter !== "all" && node.kind === "tool") {
				const label = node.label?.toLowerCase() || "";
				let toolCategory = "default";
				if (label.includes("search") || label.includes("query"))
					toolCategory = "search";
				else if (label.includes("data") || label.includes("database"))
					toolCategory = "data";
				else if (label.includes("api") || label.includes("http"))
					toolCategory = "api";
				else if (label.includes("file") || label.includes("document"))
					toolCategory = "file";
				else if (label.includes("ai") || label.includes("llm"))
					toolCategory = "ai";

				if (toolCategory !== toolCategoryFilter) return false;
			}

			return true;
		});

		// Create flow nodes with computed positions and enhanced data
		return filteredNodes.map((node: GraphNode) => {
			const position = positions.get(node.id) || { x: 0, y: 0 };
			const isTool = node.kind === "tool";

			// Determine tool category for color coding
			let toolCategory = "default";
			if (isTool) {
				const label = node.label?.toLowerCase() || "";
				if (label.includes("search") || label.includes("query"))
					toolCategory = "search";
				else if (label.includes("data") || label.includes("database"))
					toolCategory = "data";
				else if (label.includes("api") || label.includes("http"))
					toolCategory = "api";
				else if (label.includes("file") || label.includes("document"))
					toolCategory = "file";
				else if (label.includes("ai") || label.includes("llm"))
					toolCategory = "ai";
			}

			return {
				id: node.id,
				type: node.kind, // 'agent' or 'tool'
				position,
				data: {
					label: node.label,
					type: node.type,
					kind: node.kind,
					toolCategory,
					isTool,
				},
				connectable: false,
			};
		});
	}, [graphNodes, graphEdges, searchTerm, nodeTypeFilter, toolCategoryFilter]);

	const flowEdges: Edge[] = useMemo(() => {
		// Map target id to node kind and category for enhanced styling
		const nodeDataById = new Map<
			string,
			{ kind: string; toolCategory?: string }
		>();
		for (const n of graphNodes as GraphNode[]) {
			const label = n.label?.toLowerCase() || "";
			let toolCategory = "default";
			if (n.kind === "tool") {
				if (label.includes("search") || label.includes("query"))
					toolCategory = "search";
				else if (label.includes("data") || label.includes("database"))
					toolCategory = "data";
				else if (label.includes("api") || label.includes("http"))
					toolCategory = "api";
				else if (label.includes("file") || label.includes("document"))
					toolCategory = "file";
				else if (label.includes("ai") || label.includes("llm"))
					toolCategory = "ai";
			}
			nodeDataById.set(n.id, { kind: n.kind, toolCategory });
		}

		return graphEdges.map((edge: GraphEdge, index: number) => {
			const targetData = nodeDataById.get(edge.to);
			const isTool = targetData?.kind === "tool";
			const toolCategory = targetData?.toolCategory || "default";

			// Enhanced edge styling based on tool category
			let stroke: string;
			let strokeWidth: number;
			let strokeDasharray: string | undefined;

			if (isTool) {
				// Color code edges by tool category
				switch (toolCategory) {
					case "search":
						stroke = "var(--color-blue-500)";
						strokeWidth = 2.5;
						strokeDasharray = "8 4";
						break;
					case "data":
						stroke = "var(--color-green-500)";
						strokeWidth = 2.5;
						strokeDasharray = "6 3";
						break;
					case "api":
						stroke = "var(--color-orange-500)";
						strokeWidth = 2.5;
						strokeDasharray = "10 5";
						break;
					case "file":
						stroke = "var(--color-purple-500)";
						strokeWidth = 2.5;
						strokeDasharray = "12 6";
						break;
					case "ai":
						stroke = "var(--color-pink-500)";
						strokeWidth = 2.5;
						strokeDasharray = "4 2";
						break;
					default:
						stroke = "var(--color-secondary-foreground)";
						strokeWidth = 2.25;
						strokeDasharray = "8 4";
				}
			} else {
				// Agent-to-agent connections
				stroke = "var(--color-primary)";
				strokeWidth = 2.75;
				strokeDasharray = undefined;
			}

			const style: CSSProperties = {
				stroke,
				strokeWidth,
				opacity: 0.8,
				...(strokeDasharray ? { strokeDasharray } : {}),
				strokeLinecap: "round",
				filter: isTool
					? "drop-shadow(0 0 2px rgba(0,0,0,0.3))"
					: "drop-shadow(0 0 1px rgba(0,0,0,0.2))",
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

			<GraphControls
				searchTerm={searchTerm}
				nodeTypeFilter={nodeTypeFilter}
				toolCategoryFilter={toolCategoryFilter}
				showControls={showControls}
				onSearchChange={handleSearchChange}
				onNodeTypeChange={handleNodeTypeChange}
				onToolCategoryChange={handleToolCategoryChange}
				onControlsToggle={handleControlsToggle}
				onClearFilters={clearFilters}
			/>

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
		<div className="relative px-4 py-3 shadow-lg rounded-lg bg-card border-2 border-primary min-w-[160px] max-w-[200px]">
			<div className="flex items-center gap-2">
				<Bot className="w-5 h-5 text-primary" />
				<div className="font-semibold text-sm text-card-foreground truncate">
					{data.label?.replace("🤖 ", "") || data.id}
				</div>
			</div>
			{data.type && (
				<div className="text-xs text-muted-foreground mt-1 truncate">
					{data.type}
				</div>
			)}
			{/* Handles for edge rendering */}
			<Handle
				type="target"
				position={Position.Top}
				className="!w-3 !h-3 !bg-primary !border-2 !border-background"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-3 !h-3 !bg-primary !border-2 !border-background"
			/>
		</div>
	);
}

// Custom node component for tools
function ToolNode({ data }: { data: any }) {
	const { toolCategory = "default" } = data;

	// Category-based styling
	const getCategoryStyles = (category: string) => {
		switch (category) {
			case "search":
				return {
					bgColor: "bg-blue-50 dark:bg-blue-950",
					borderColor: "border-blue-300 dark:border-blue-700",
					textColor: "text-blue-700 dark:text-blue-300",
					iconColor: "text-blue-600 dark:text-blue-400",
				};
			case "data":
				return {
					bgColor: "bg-green-50 dark:bg-green-950",
					borderColor: "border-green-300 dark:border-green-700",
					textColor: "text-green-700 dark:text-green-300",
					iconColor: "text-green-600 dark:text-green-400",
				};
			case "api":
				return {
					bgColor: "bg-orange-50 dark:bg-orange-950",
					borderColor: "border-orange-300 dark:border-orange-700",
					textColor: "text-orange-700 dark:text-orange-300",
					iconColor: "text-orange-600 dark:text-orange-400",
				};
			case "file":
				return {
					bgColor: "bg-purple-50 dark:bg-purple-950",
					borderColor: "border-purple-300 dark:border-purple-700",
					textColor: "text-purple-700 dark:text-purple-300",
					iconColor: "text-purple-600 dark:text-purple-400",
				};
			case "ai":
				return {
					bgColor: "bg-pink-50 dark:bg-pink-950",
					borderColor: "border-pink-300 dark:border-pink-700",
					textColor: "text-pink-700 dark:text-pink-300",
					iconColor: "text-pink-600 dark:text-pink-400",
				};
			default:
				return {
					bgColor: "bg-secondary",
					borderColor: "border-secondary",
					textColor: "text-secondary-foreground",
					iconColor: "text-secondary-foreground",
				};
		}
	};

	const styles = getCategoryStyles(toolCategory);

	return (
		<div
			className={`relative px-3 py-2 shadow-md rounded-md border-2 min-w-[110px] max-w-[140px] ${styles.bgColor} ${styles.borderColor}`}
		>
			<div className="flex items-center gap-2">
				<Wrench className={`w-3 h-3 ${styles.iconColor}`} />
				<div className={`font-medium text-xs ${styles.textColor} truncate`}>
					{data.label?.replace("🔧 ", "") || data.id}
				</div>
			</div>
			{/* Handles for edge rendering */}
			<Handle
				type="target"
				position={Position.Top}
				className={`!w-2 !h-2 !border-2 !border-background ${styles.iconColor.replace("text-", "bg-")}`}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className={`!w-2 !h-2 !border-2 !border-background ${styles.iconColor.replace("text-", "bg-")}`}
			/>
		</div>
	);
}
