import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Api } from "../Api";
import type { Agent } from "../app/(dashboard)/_schema";
import { useApiUrl } from "./useApiUrl";

interface StateResponse {
	agentState: Record<string, any>;
	userState: Record<string, any>;
	sessionState: Record<string, any>;
	metadata: {
		lastUpdated: number;
		changeCount: number;
		totalKeys: number;
		sizeBytes: number;
	};
}

export function useStatePanel(
	selectedAgent: Agent | null,
	currentSessionId: string | null,
) {
	const queryClient = useQueryClient();
	const apiUrl = useApiUrl();
	const apiClient = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);

	const {
		data: currentState,
		isLoading,
		error,
	} = useQuery<StateResponse>({
		queryKey: ["state", apiUrl, selectedAgent?.relativePath, currentSessionId],
		queryFn: async () => {
			if (!apiClient || !selectedAgent || !currentSessionId) {
				throw new Error("Agent, session and apiUrl required");
			}
			const res = await apiClient.api.stateControllerGetState(
				encodeURIComponent(selectedAgent.relativePath),
				currentSessionId,
			);
			return res.data as StateResponse;
		},
		enabled: !!apiClient && !!selectedAgent && !!currentSessionId,
	});

	const updateStateMutation = useMutation({
		mutationFn: async ({ path, value }: { path: string; value: any }) => {
			if (!apiClient || !selectedAgent || !currentSessionId) {
				throw new Error("Agent, session and apiUrl required");
			}
			return apiClient.api.stateControllerUpdateState(
				encodeURIComponent(selectedAgent.relativePath),
				currentSessionId,
				{ path, value },
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [
					"state",
					apiUrl,
					selectedAgent?.relativePath,
					currentSessionId,
				],
			});
		},
	});

	const updateState = async (path: string, value: any) => {
		await updateStateMutation.mutateAsync({ path, value });
	};

	return {
		currentState,
		updateState,
		isLoading,
		error: error?.message,
	};
}
