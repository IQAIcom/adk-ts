import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent } from "../app/(dashboard)/_schema";

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
	apiUrl: string,
	selectedAgent: Agent | null,
	currentSessionId: string | null,
) {
	const queryClient = useQueryClient();

	const {
		data: currentState,
		isLoading,
		error,
	} = useQuery<StateResponse>({
		queryKey: ["state", apiUrl, selectedAgent?.relativePath, currentSessionId],
		queryFn: async () => {
			if (!apiUrl || !selectedAgent || !currentSessionId) {
				throw new Error("Agent, session and apiUrl required");
			}

			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions/${currentSessionId}/state`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch state");
			}

			return response.json();
		},
		enabled: !!apiUrl && !!selectedAgent && !!currentSessionId,
	});

	const updateStateMutation = useMutation({
		mutationFn: async ({ path, value }: { path: string; value: any }) => {
			if (!apiUrl || !selectedAgent || !currentSessionId) {
				throw new Error("Agent, session and apiUrl required");
			}

			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions/${currentSessionId}/state`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ path, value }),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to update state");
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate and refetch state
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
