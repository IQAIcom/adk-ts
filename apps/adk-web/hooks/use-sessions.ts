"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	type AgentListItemDto,
	Api,
	type SessionResponseDto,
	type SessionsResponseDto,
} from "../Api";
import { useApiUrl } from "./use-api-url";

interface CreateSessionRequest {
	state?: Record<string, any>;
	sessionId?: string;
}

export function useSessions(selectedAgent: AgentListItemDto | null) {
	const apiUrl = useApiUrl();
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
		queryFn: async (): Promise<SessionResponseDto[]> => {
			if (!apiClient || !selectedAgent) return [];
			const res = await apiClient.api.sessionsControllerListSessions(
				encodeURIComponent(selectedAgent.relativePath),
			);
			const data: SessionsResponseDto = res.data as any;
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
		}: CreateSessionRequest): Promise<SessionResponseDto> => {
			if (!apiClient || !selectedAgent)
				throw new Error("API URL and agent required");
			try {
				const res = await apiClient.api.sessionsControllerCreateSession(
					encodeURIComponent(selectedAgent.relativePath),
					{ state, sessionId },
				);
				return res.data as SessionResponseDto;
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
			// Return the created session
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
