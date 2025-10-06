"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiUrl } from "./useApiUrl";

export interface GraphNode {
	id: string;
	label: string;
	kind: "agent" | "tool";
	type?: string;
	shape?: string;
	group?: string;
}

export interface GraphEdge {
	from: string;
	to: string;
}

export interface GraphResponse {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export function useAgentGraph(selectedAgent: { relativePath: string } | null) {
	const apiUrl = useApiUrl();
	const agentId = selectedAgent?.relativePath;

	return useQuery<GraphResponse, Error>({
		queryKey: ["graph", apiUrl, agentId],
		enabled: !!apiUrl && !!agentId,
		queryFn: async () => {
			const id = encodeURIComponent(agentId!);
			const res = await fetch(`${apiUrl}/api/agents/${id}/graph`);
			if (!res.ok) {
				throw new Error(`Failed to load graph: ${res.status}`);
			}
			return (await res.json()) as GraphResponse;
		},
		staleTime: 30_000,
	});
}
