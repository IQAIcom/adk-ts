"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Api, type GraphResponseDto } from "../Api";
import { useApiUrl } from "./use-api-url";

export function useAgentGraph(selectedAgent: { relativePath: string } | null) {
	const apiUrl = useApiUrl();
	const agentId = selectedAgent?.relativePath;

	// apiUrl can be "" in bundled mode (same origin), which is valid
	const apiClient = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);

	return useQuery<GraphResponseDto, Error>({
		queryKey: ["graph", apiUrl, agentId],
		// Empty apiUrl is valid (bundled mode), only check for agentId
		enabled: typeof window !== "undefined" && !!agentId,
		queryFn: async () => {
			const res = await apiClient.api.graphControllerGetGraph(
				encodeURIComponent(agentId!),
			);
			return res.data;
		},
		staleTime: 30_000,
	});
}
