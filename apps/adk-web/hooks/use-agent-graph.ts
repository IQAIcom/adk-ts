"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Api, type GraphResponseDto } from "../Api";
import { useApiUrl } from "./use-api-url";

export function useAgentGraph(selectedAgent: { relativePath: string } | null) {
	const apiUrl = useApiUrl();
	const agentId = selectedAgent?.relativePath;

	const apiClient = useMemo(
		() => (apiUrl ? new Api({ baseUrl: apiUrl }) : null),
		[apiUrl],
	);

	return useQuery<GraphResponseDto, Error>({
		queryKey: ["graph", apiUrl, agentId],
		enabled: !!apiUrl && !!agentId,
		queryFn: async () => {
			if (!apiClient) throw new Error("API client not available");
			const res = await apiClient.api.graphControllerGetGraph(
				encodeURIComponent(agentId!),
			);
			return res.data;
		},
		staleTime: 30_000,
	});
}
