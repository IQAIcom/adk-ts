"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { Api } from "../Api";
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
	const apiClient = useMemo(
		() => (apiUrl ? new Api({ baseUrl: apiUrl }) : null),
		[apiUrl],
	);

	// Fetch sessions for the selected agent
	const {
		data: sessions = [],
		isLoading,
		error,
		refetch: refetchSessions,
	} = useQuery({
		queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
		queryFn: async (): Promise<Session[]> => {
			if (!apiClient || !selectedAgent) return [];
			const res = await apiClient.api.sessionsControllerListSessions(
				encodeURIComponent(selectedAgent.relativePath),
			);
			const data: SessionsResponse = res.data as any;
			return data.sessions;
		},
		enabled: !!apiClient && !!selectedAgent,
		staleTime: 30000,
		retry: 2,
	});

	// Create session mutation
	const createSessionMutation = useMutation({
		mutationFn: async ({
			state,
			sessionId,
		}: CreateSessionRequest): Promise<Session> => {
			if (!apiClient || !selectedAgent)
				throw new Error("API URL and agent required");
			try {
				const res = await apiClient.api.sessionsControllerCreateSession(
					encodeURIComponent(selectedAgent.relativePath),
					{ state, sessionId },
				);
				return res.data as Session;
			} catch (e: any) {
				toast.error("Failed to create session. Please try again.");
				throw new Error(e?.message || "Failed to create session");
			}
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
			if (!apiClient || !selectedAgent)
				throw new Error("API URL and agent required");
			await apiClient.api.sessionsControllerDeleteSession(
				encodeURIComponent(selectedAgent.relativePath),
				sessionId,
			);
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
			if (!apiClient || !selectedAgent)
				throw new Error("API URL and agent required");
			await apiClient.api.sessionsControllerSwitchSession(
				encodeURIComponent(selectedAgent.relativePath),
				sessionId,
			);
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
