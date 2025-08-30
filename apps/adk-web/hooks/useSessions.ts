"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Agent } from "../app/(dashboard)/_schema";

interface Session {
	id: string;
	appName: string;
	userId: string;
	state: Record<string, any>;
	eventCount: number;
	lastUpdateTime: number;
	createdAt: number;
}

interface SessionsResponse {
	sessions: Session[];
}

interface CreateSessionRequest {
	state?: Record<string, any>;
	sessionId?: string;
}

export function useSessions(apiUrl: string, selectedAgent: Agent | null) {
	const queryClient = useQueryClient();

	// Fetch sessions for the selected agent
	const {
		data: sessions = [],
		isLoading,
		error,
		refetch: refetchSessions,
	} = useQuery({
		queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
		queryFn: async (): Promise<Session[]> => {
			if (!apiUrl || !selectedAgent) {
				console.log("No API URL or selected agent, returning empty sessions");
				return [];
			}

			const encodedPath = encodeURIComponent(selectedAgent.relativePath);
			console.log("Fetching sessions for agent:", selectedAgent.relativePath);
			console.log("Encoded agent path:", encodedPath);
			console.log("Full URL:", `${apiUrl}/api/agents/${encodedPath}/sessions`);
			const response = await fetch(
				`${apiUrl}/api/agents/${encodedPath}/sessions`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch sessions: ${response.status}`);
			}
			const data: SessionsResponse = await response.json();
			console.log("Fetched sessions:", data.sessions.length);
			return data.sessions;
		},
		enabled: !!apiUrl && !!selectedAgent,
		staleTime: 30000,
		retry: 2,
	});

	// Create session mutation
	const createSessionMutation = useMutation({
		mutationFn: async ({
			state,
			sessionId,
		}: CreateSessionRequest): Promise<Session> => {
			if (!apiUrl || !selectedAgent) {
				throw new Error("API URL and agent required");
			}

			console.log("Creating session for agent:", selectedAgent.relativePath);
			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ state, sessionId }),
				},
			);

			if (!response.ok) {
				const errorData = await response.text();
				toast.error("Failed to create session. Please try again.");
				throw new Error(
					`Failed to create session: ${response.status} - ${errorData}`,
				);
			}

			const newSession: Session = await response.json();
			console.log("Session created:", newSession);
			return newSession;
		},
		onSuccess: (created) => {
			// Refetch sessions after successful creation
			queryClient.invalidateQueries({
				queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
			});
			// Expose created session to caller via resolved promise
			return created;
		},
		onError: (error) => {
			console.error(error);
			toast.error("Failed to create session. Please try again.");
		},
	});

	// Delete session mutation
	const deleteSessionMutation = useMutation({
		mutationFn: async (sessionId: string): Promise<void> => {
			if (!apiUrl || !selectedAgent) {
				throw new Error("API URL and agent required");
			}

			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions/${sessionId}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(
					`Failed to delete session: ${response.status} - ${errorData}`,
				);
			}
		},
		onSuccess: () => {
			toast.success("Session deleted successfully!");
			// Refetch sessions after successful deletion
			queryClient.invalidateQueries({
				queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
			});
		},
		onError: (error) => {
			console.error(error);
			toast.error("Failed to delete session. Please try again.");
		},
	});

	// Switch session mutation
	const switchSessionMutation = useMutation({
		mutationFn: async (sessionId: string): Promise<void> => {
			if (!apiUrl || !selectedAgent) {
				throw new Error("API URL and agent required");
			}

			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions/${sessionId}/switch`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(
					`Failed to switch session: ${response.status} - ${errorData}`,
				);
			}
		},
		onSuccess: () => {
			// Refetch sessions after successful switch
			queryClient.invalidateQueries({
				queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
			});
			// Also refresh events for the newly active session
			queryClient.invalidateQueries({
				queryKey: ["events"],
			});
		},
		onError: (error) => {
			console.error(error);
			toast.error("Failed to switch session. Please try again.");
		},
	});

	return {
		sessions,
		isLoading,
		error,
		refetchSessions,
		createSession: createSessionMutation.mutateAsync,
		deleteSession: deleteSessionMutation.mutateAsync,
		switchSession: switchSessionMutation.mutateAsync,
		isCreating: createSessionMutation.isPending,
		isDeleting: deleteSessionMutation.isPending,
		isSwitching: switchSessionMutation.isPending,
	};
}
