"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Api } from "../Api";
import { useApiUrl } from "./use-api-url";

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

	const apiClient = useMemo(
		() => (apiUrl ? new Api({ baseUrl: apiUrl }) : null),
		[apiUrl],
	);

	return useQuery<GraphResponse, Error>({
		queryKey: ["graph", apiUrl, agentId],
		enabled: !!apiUrl && !!agentId,
		queryFn: async () => {
			if (!apiClient) throw new Error("API client not available");
			const res = await apiClient.api.graphControllerGetGraph(
				encodeURIComponent(agentId!),
			);
			return res.data as GraphResponse;
		},
		staleTime: 30_000,
	});
}
