"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
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

interface UseSessionsOptions {
	sessionId: string | null;
	onSessionChange: (id: string | null) => void;
}

export function useSessions(
	selectedAgent: AgentListItemDto | null,
	options: UseSessionsOptions,
) {
	const apiUrl = useApiUrl();
	const queryClient = useQueryClient();
	// apiUrl can be "" in bundled mode (same origin), which is valid
	const apiClient = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);
	const { sessionId, onSessionChange } = options;

	// Fetch sessions for the selected agent
	const {
		data: sessions = [],
		isLoading,
		error,
		refetch: refetchSessions,
	} = useQuery({
		queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
		queryFn: async (): Promise<SessionResponseDto[]> => {
			if (!selectedAgent) return [];
			const res = await apiClient.api.sessionsControllerListSessions(
				encodeURIComponent(selectedAgent.relativePath),
			);
			const data: SessionsResponseDto = res.data as any;
			return data.sessions;
		},
		enabled: typeof window !== "undefined" && !!selectedAgent,
		staleTime: 30000,
		retry: 2,
	});

	// Create session mutation
	const createSessionMutation = useMutation({
		mutationFn: async ({
			state,
			sessionId,
		}: CreateSessionRequest): Promise<SessionResponseDto> => {
			if (!selectedAgent) throw new Error("Agent required");
			const res = await apiClient.api.sessionsControllerCreateSession(
				encodeURIComponent(selectedAgent.relativePath),
				{ state, sessionId },
			);
			return res.data as SessionResponseDto;
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
		},
	});

	// Delete session mutation
	const deleteSessionMutation = useMutation({
		mutationFn: async (sessionId: string): Promise<void> => {
			if (!selectedAgent) throw new Error("Agent required");
			await apiClient.api.sessionsControllerDeleteSession(
				encodeURIComponent(selectedAgent.relativePath),
				sessionId,
			);
		},
		onSuccess: () => {
			// Refetch sessions after successful deletion
			queryClient.invalidateQueries({
				queryKey: ["sessions", apiUrl, selectedAgent?.relativePath],
			});
		},
		onError: (error) => {
			console.error(error);
		},
	});

	// Switch session mutation
	const switchSessionMutation = useMutation({
		mutationFn: async (sessionId: string): Promise<void> => {
			if (!selectedAgent) throw new Error("Agent required");
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
		onError: (error: unknown) => {
			console.error(error);

			const isNotFoundError = (err: unknown): boolean => {
				if (err && typeof err === "object") {
					if ("status" in err && err.status === 404) {
						return true;
					}
					if (
						"error" in err &&
						err.error &&
						typeof err.error === "object" &&
						"message" in err.error &&
						typeof err.error.message === "string" &&
						err.error.message.toLowerCase().includes("not found")
					) {
						return true;
					}
				}
				return false;
			};

			if (isNotFoundError(error)) {
				// Session was likely deleted - silently handle it
				// The sessions list will refresh and UI will update accordingly
				return;
			}

			// Error will be thrown and can be handled by the component
		},
	});

	const prevAgentRef = useRef<string | null>(null);
	const switchSessionFn = switchSessionMutation.mutateAsync;

	// Session management effect - handles auto-switching and validation
	useEffect(() => {
		if (!sessionId || !onSessionChange) return;

		// const { sessionId, onSessionChange } = options;
		const currentAgentPath = selectedAgent?.relativePath ?? null;

		// Agent switched - clear session
		if (currentAgentPath !== prevAgentRef.current) {
			onSessionChange(null);
			prevAgentRef.current = currentAgentPath;
			return;
		}

		// No sessions available yet or still loading
		if (sessions.length === 0 || isLoading) {
			return;
		}

		// Validate URL sessionId
		const isUrlSessionValid =
			sessionId && sessions.some((s) => s.id === sessionId);

		if (isUrlSessionValid) {
			switchSessionFn(sessionId).catch((error) => {
				console.error("Failed to switch to URL session:", error);
			});
		} else if (sessionId) {
			// URL has invalid sessionId (e.g., session was deleted) - clear it
			onSessionChange(null);
		} else if (sessions.length > 0) {
			// No URL sessionId - auto-select first session
			const firstSessionId = sessions[0].id;
			onSessionChange(firstSessionId);
			switchSessionFn(firstSessionId).catch((error) => {
				console.error("Failed to auto-select first session:", error);
			});
		}
	}, [
		sessions,
		isLoading,
		selectedAgent,
		switchSessionFn,
		onSessionChange,
		sessionId,
	]);

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
