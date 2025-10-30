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
import { type CSSProperties, useMemo, useRef, useEffect } from "react";
import type {
	GraphEdgeDto as GraphEdge,
	GraphNodeDto as GraphNode,
	GraphResponseDto as GraphResponse,
} from "../Api";
import "@xyflow/react/dist/style.css";
import { Bot, Wrench } from "lucide-react";
import { GraphControls, useGraphControls } from "./graph-controls";
import { useReactFlow } from "@xyflow/react";
import { AgentColor, AGENT_COLORS } from "@/lib/agent-colors";
import {
	getAgentStyles,
	getToolCategory,
	getEdgeStyles,
} from "@/lib/agent-styles";

// Filter nodes based on search term, node type, and tool category
const filterNodes = (
	graphNodes: GraphNode[],
	searchTerm: string,
	nodeTypeFilter: string,
	toolCategoryFilter: string,
): GraphNode[] => {
	return graphNodes.filter((node: GraphNode) => {
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
		if (nodeTypeFilter !== "all" && node.kind !== nodeTypeFilter) return false;

		// Tool category filter
		if (toolCategoryFilter !== "all" && node.kind === "tool") {
			const toolCategory = getToolCategory(node.label);
			if (toolCategory !== toolCategoryFilter) return false;
		}

		return true;
	});
};

// Calculate spacing parameters based on node count and filtering state
const calculateSpacingParameters = (
	totalNodes: number,
	isFiltered: boolean,
) => {
	const baseLayerGapX = 250; // horizontal distance between layers
	const baseNodeGapY = 150; // vertical distance between nodes in same layer

	// Increase spacing for dense graphs, especially when filtered
	const densityFactor = Math.min(1.5, Math.max(0.9, totalNodes / 20));
	const filterFactor = isFiltered ? 1.8 : 1.0; // Extra spacing when filtered
	const layerGapX = Math.round(baseLayerGapX * densityFactor * filterFactor);
	const nodeGapY = Math.round(baseNodeGapY * densityFactor * filterFactor);

	return { layerGapX, nodeGapY };
};

// Position nodes in a tool-heavy level with agent-tool grouping
const positionToolHeavyLevel = (
	depth: number,
	levelNodes: GraphNode[],
	childToParentMap: Map<string, string>,
	layerGapX: number,
	nodeGapY: number,
	isFiltered: boolean,
	positions: Map<string, { x: number; y: number }>,
) => {
	const parentAgents = levelNodes.filter((n) => n.kind === "agent");
	const tools = levelNodes.filter((n) => n.kind === "tool");

	// Group tools by parent agent for better organization
	const agentPositions = new Map<string, number>();
	const toolGroups = new Map<string, string[]>();

	// Find which tools belong to which agents
	for (const tool of tools) {
		const parentId = childToParentMap.get(tool.id);
		if (parentId) {
			if (!toolGroups.has(parentId)) toolGroups.set(parentId, []);
			toolGroups.get(parentId)!.push(tool.id);
		}
	}

	// Position agents first (VERTICALLY CENTERED)
	parentAgents.forEach((agent, i) => {
		const y = i * nodeGapY * 2 - (parentAgents.length - 1) * nodeGapY;
		agentPositions.set(agent.id, y);
		positions.set(agent.id, {
			x: 40 + depth * layerGapX, // X increases with depth (left to right)
			y,
		});
	});

	// Position tools in clusters around their parent agents (TO THE RIGHT)
	for (const [parentId, toolIds] of toolGroups) {
		const parentY = positions.get(parentId)?.y ?? 0;
		const toolSpacing = isFiltered
			? Math.min(nodeGapY * 0.8, 100) // More spacing when filtered
			: Math.min(nodeGapY * 0.4, 60);
		const startY = parentY - ((toolIds.length - 1) * toolSpacing) / 2;

		toolIds.forEach((toolId, toolIndex) => {
			positions.set(toolId, {
				x: 40 + depth * layerGapX + 80, // Offset tools to the right of agents
				y: startY + toolIndex * toolSpacing,
			});
		});
	}
};

// Position nodes in a standard level with uniform spacing
const positionStandardLevel = (
	level: string[],
	depth: number,
	count: number,
	layerGapX: number,
	nodeGapY: number,
	maxHeightCount: number,
	isFiltered: boolean,
	positions: Map<string, { x: number; y: number }>,
) => {
	const adjustedNodeGapY = isFiltered ? nodeGapY * 1.3 : nodeGapY; // More spacing when filtered
	const layerHeight = (count - 1) * adjustedNodeGapY;
	const maxLayerHeight = (maxHeightCount - 1) * nodeGapY;
	const offsetY = (maxLayerHeight - layerHeight) / 2;

	level.forEach((id, i) => {
		positions.set(id, {
			x: 40 + depth * layerGapX, // X increases with depth (left to right)
			y: offsetY + i * adjustedNodeGapY,
		});
	});
};

interface GraphPanelProps {
	data?: GraphResponse;
	isLoading?: boolean;
	error?: Error | null;
}

const nodeTypes = {
	agent: AgentNode,
	tool: ToolNode,
};

// Component to handle auto-fit when filters change
function AutoFitOnFilter({
	searchTerm,
	nodeTypeFilter,
	toolCategoryFilter,
	fitViewRef,
}: {
	searchTerm: string;
	nodeTypeFilter: string;
	toolCategoryFilter: string;
	fitViewRef: React.MutableRefObject<(() => void) | null>;
}) {
	const { fitView } = useReactFlow();
	const prevFilters = useRef({
		searchTerm,
		nodeTypeFilter,
		toolCategoryFilter,
	});

	// Store fitView function in ref for external access
	useEffect(() => {
		fitViewRef.current = () => {
			fitView({
				padding: 0.2,
				duration: 800,
				includeHiddenNodes: false,
			});
		};
	}, [fitView, fitViewRef]);

	useEffect(() => {
		const currentFilters = { searchTerm, nodeTypeFilter, toolCategoryFilter };
		const prev = prevFilters.current;

		// Check if any filter has changed
		const hasFilterChanged =
			prev.searchTerm !== currentFilters.searchTerm ||
			prev.nodeTypeFilter !== currentFilters.nodeTypeFilter ||
			prev.toolCategoryFilter !== currentFilters.toolCategoryFilter;

		if (hasFilterChanged) {
			// Use requestAnimationFrame to ensure nodes are rendered before fitting
			const rafId = requestAnimationFrame(() => {
				fitView({
					padding: 0.2,
					duration: 800,
					includeHiddenNodes: false,
				});
			});

			prevFilters.current = currentFilters;

			return () => cancelAnimationFrame(rafId);
		}
	}, [searchTerm, nodeTypeFilter, toolCategoryFilter, fitView]);

	return null;
}

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

	// Create a ref to store the fitView function
	const fitViewRef = useRef<(() => void) | null>(null);

	// Extract graph data safely
	const graphNodes = data?.nodes || [];
	const graphEdges = data?.edges || [];

	// Convert our graph data to React Flow format with improved layout for many tools
	// Shared filtered nodes, agent color mapping, and child-to-parent mapping
	const { filteredNodes, agentColorMap, childToParentMap } = useMemo(() => {
		const filtered = filterNodes(
			graphNodes,
			searchTerm,
			nodeTypeFilter,
			toolCategoryFilter,
		);
		const colorMap = new Map<string, AgentColor>();
		const agents = filtered.filter((n) => n.kind === "agent");
		agents.forEach((agent, index) => {
			colorMap.set(agent.id, AGENT_COLORS[index % AGENT_COLORS.length]);
		});

		// Create child-to-parent mapping for O(1) lookups
		const filteredNodeIds = new Set(filtered.map((n) => n.id));
		const childToParent = new Map<string, string>();
		for (const edge of graphEdges) {
			if (filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)) {
				childToParent.set(edge.to, edge.from);
			}
		}

		return {
			filteredNodes: filtered,
			agentColorMap: colorMap,
			childToParentMap: childToParent,
		};
	}, [graphNodes, searchTerm, nodeTypeFilter, toolCategoryFilter, graphEdges]);

	const flowNodes: Node[] = useMemo(() => {
		// If no nodes after filtering, return empty array
		if (filteredNodes.length === 0) return [];

		// Build adjacency (children) map using only filtered nodes
		const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
		const childrenMap = new Map<string, string[]>();
		for (const edge of graphEdges) {
			// Only include edges where both source and target are in filtered nodes
			if (filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)) {
				if (!childrenMap.has(edge.from)) childrenMap.set(edge.from, []);
				childrenMap.get(edge.from)!.push(edge.to);
			}
		}

		// Compute incoming edge counts to identify roots (only for filtered nodes)
		const incomingCount = new Map<string, number>();
		for (const node of filteredNodes) incomingCount.set(node.id, 0);
		for (const edge of graphEdges) {
			if (filteredNodeIds.has(edge.to)) {
				incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
			}
		}
		const roots = filteredNodes.filter(
			(n: GraphNode) => (incomingCount.get(n.id) || 0) === 0,
		);

		// Levelize graph using BFS from all roots
		const visited = new Set<string>();
		const levels: string[][] = [];

		// If no roots (cyclic graph), fall back to arbitrary starting node to avoid empty layout
		const frontier: string[] =
			roots.length > 0
				? roots.map((r) => r.id)
				: ([filteredNodes[0]?.id].filter(Boolean) as string[]);
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
		const remaining = filteredNodes
			.filter((n) => !visited.has(n.id))
			.map((n) => n.id);
		if (remaining.length) levels.push(remaining);

		// Calculate spacing parameters
		const totalNodes = filteredNodes.length;
		const isFiltered = totalNodes < graphNodes.length; // If filtered, we have fewer nodes
		const { layerGapX, nodeGapY } = calculateSpacingParameters(
			totalNodes,
			isFiltered,
		);

		// Position nodes using helper functions
		const positions = new Map<string, { x: number; y: number }>();
		const maxHeightCount = Math.max(...levels.map((l) => l.length));

		levels.forEach((level, depth) => {
			const count = level.length;
			const levelNodes = level
				.map((id) => filteredNodes.find((n) => n.id === id))
				.filter(Boolean) as GraphNode[];
			const toolCount = levelNodes.filter((n) => n.kind === "tool").length;
			const agentCount = levelNodes.filter((n) => n.kind === "agent").length;

			// Determine if this level is tool-heavy
			const isToolHeavy = toolCount > agentCount * 2;

			if (isToolHeavy && agentCount > 0) {
				// Use specialized positioning for tool-heavy levels
				positionToolHeavyLevel(
					depth,
					levelNodes,
					childToParentMap,
					layerGapX,
					nodeGapY,
					isFiltered,
					positions,
				);
			} else {
				// Use standard positioning for regular levels
				positionStandardLevel(
					level,
					depth,
					count,
					layerGapX,
					nodeGapY,
					maxHeightCount,
					isFiltered,
					positions,
				);
			}
		});

		// Create flow nodes with computed positions and agent-based color coding
		return filteredNodes.map((node: GraphNode) => {
			const position = positions.get(node.id) || { x: 0, y: 0 };
			const isTool = node.kind === "tool";

			// Determine agent color for this node
			let agentColor: AgentColor = "default";
			if (isTool) {
				// Find which agent this tool belongs to
				const parentId = childToParentMap.get(node.id);
				if (parentId) {
					agentColor = agentColorMap.get(parentId) ?? "default";
				}
			} else {
				// This is an agent, always use default color
				agentColor = "default";
			}

			return {
				id: node.id,
				type: node.kind, // 'agent' or 'tool'
				position,
				data: {
					label: node.label,
					type: node.type,
					kind: node.kind,
					agentColor,
					isTool,
				},
				connectable: false,
			};
		});
	}, [filteredNodes, graphEdges, graphNodes, agentColorMap, childToParentMap]);

	const flowEdges: Edge[] = useMemo(() => {
		const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

		// Map target id to node kind and agent color for enhanced styling
		const nodeDataById = new Map<
			string,
			{ kind: string; agentColor?: AgentColor }
		>();
		for (const n of filteredNodes) {
			let agentColor: AgentColor = "default";
			if (n.kind === "tool") {
				// Find which agent this tool belongs to
				const parentId = childToParentMap.get(n.id);
				if (parentId) {
					agentColor = agentColorMap.get(parentId) ?? "default";
				}
			} else {
				// This is an agent, always use default color
				agentColor = "default";
			}
			nodeDataById.set(n.id, { kind: n.kind, agentColor });
		}

		// Only include edges where both source and target are in filtered nodes
		const filteredEdges = graphEdges.filter(
			(edge) => filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to),
		);

		return filteredEdges.map((edge: GraphEdge, index: number) => {
			const targetData = nodeDataById.get(edge.to);
			const sourceData = nodeDataById.get(edge.from);
			const isTool = targetData?.kind === "tool";
			const agentColor =
				targetData?.agentColor || sourceData?.agentColor || "default";

			// Enhanced edge styling - use centralized helper function
			const edgeStyles = getEdgeStyles(agentColor, isTool);

			const style: CSSProperties = {
				stroke: edgeStyles.stroke,
				strokeWidth: edgeStyles.strokeWidth,
				opacity: 0.8,
				...(edgeStyles.strokeDasharray
					? { strokeDasharray: edgeStyles.strokeDasharray }
					: {}),
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
	}, [filteredNodes, agentColorMap, graphEdges, childToParentMap]);

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
				onFitView={fitViewRef.current || undefined}
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
				<AutoFitOnFilter
					searchTerm={searchTerm}
					nodeTypeFilter={nodeTypeFilter}
					toolCategoryFilter={toolCategoryFilter}
					fitViewRef={fitViewRef}
				/>
			</ReactFlow>
		</div>
	);
}

// Custom node component for agents
function AgentNode({ data }: { data: any }) {
	const { agentColor = "default" } = data;
	const styles = getAgentStyles(agentColor);

	return (
		<div
			className={`relative px-4 py-3 shadow-lg rounded-lg border-2 min-w-[160px] max-w-[200px] ${styles.bgColor} ${styles.borderColor}`}
		>
			<div className="flex items-center gap-2">
				<Bot className={`w-5 h-5 ${styles.iconColor}`} />
				<div className={`font-semibold text-sm ${styles.textColor} truncate`}>
					{data.label?.replace("🤖 ", "") || data.id}
				</div>
			</div>
			{data.type && (
				<div className="text-xs text-muted-foreground mt-1 truncate">
					{data.type}
				</div>
			)}
			{/* Handles for edge rendering - LEFT TO RIGHT FLOW */}
			<Handle
				type="target"
				position={Position.Left}
				className={`!w-3 !h-3 ${styles.handleColor} !border-2 !border-background`}
			/>
			<Handle
				type="source"
				position={Position.Right}
				className={`!w-3 !h-3 ${styles.handleColor} !border-2 !border-background`}
			/>
		</div>
	);
}

// Custom node component for tools
function ToolNode({ data }: { data: any }) {
	const { agentColor = "default" } = data;

	const styles = getAgentStyles(agentColor);

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
			{/* Handles for edge rendering - LEFT TO RIGHT FLOW */}
			<Handle
				type="target"
				position={Position.Left}
				className={`!w-2 !h-2 !border-2 !border-background ${styles.handleColor}`}
			/>
			<Handle
				type="source"
				position={Position.Right}
				className={`!w-2 !h-2 !border-2 !border-background ${styles.handleColor}`}
			/>
		</div>
	);
}
