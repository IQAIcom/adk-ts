import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AgentListItemDto as Agent, StateResponseDto } from "../Api";
import { Api } from "../Api";
import { useApiUrl } from "./use-api-url";

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
	} = useQuery<StateResponseDto>({
		queryKey: ["state", apiUrl, selectedAgent?.relativePath, currentSessionId],
		queryFn: async () => {
			if (!apiClient || !selectedAgent || !currentSessionId) {
				throw new Error("Agent, session and apiUrl required");
			}
			const res = await apiClient.api.stateControllerGetState(
				encodeURIComponent(selectedAgent.relativePath),
				currentSessionId,
			);
			return res.data as StateResponseDto;
		},
		enabled: !!apiClient && !!selectedAgent && !!currentSessionId,
		staleTime: 10000,
		retry: 2,
		refetchInterval: false,
		refetchOnWindowFocus: false,
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
