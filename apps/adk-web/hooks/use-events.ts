"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { type AgentListItemDto, Api, type EventsResponseDto } from "../Api";
import { useApiUrl } from "./use-api-url";

export function useEvents(
	selectedAgent: AgentListItemDto | null,
	sessionId: string | null,
) {
	const apiUrl = useApiUrl();
	const queryClient = useQueryClient();
	const apiClient = useMemo(
		() => (apiUrl ? new Api({ baseUrl: apiUrl }) : null),
		[apiUrl],
	);

	const {
		data: eventsResponse,
		isLoading,
		error,
		refetch: refetchEvents,
	} = useQuery<EventsResponseDto>({
		queryKey: ["events", apiUrl, selectedAgent?.relativePath, sessionId],
		queryFn: async () => {
			if (!apiClient || !selectedAgent || !sessionId)
				return { events: [], totalCount: 0 } as EventsResponseDto;
			const res = await apiClient.api.eventsControllerGetEvents(
				encodeURIComponent(selectedAgent.relativePath),
				sessionId,
			);
			return res.data as EventsResponseDto;
		},
		enabled: !!apiClient && !!selectedAgent && !!sessionId,
		staleTime: 10000,
		retry: 2,
		refetchInterval: 30000,
	});

	const events = eventsResponse?.events ?? [];
	const totalCount = eventsResponse?.totalCount ?? 0;

	// Reflect event count changes onto sessions list cache for reactivity
	useEffect(() => {
		if (!selectedAgent || !sessionId) return;
		queryClient.setQueryData(
			["sessions", apiUrl, selectedAgent.relativePath],
			(old: any) => {
				if (!old || !Array.isArray(old)) return old;
				return old.map((s: any) =>
					s.id === sessionId ? { ...s, eventCount: totalCount } : s,
				);
			},
		);
	}, [apiUrl, selectedAgent, sessionId, totalCount, queryClient]);

	const invalidateEvents = () => {
		queryClient.invalidateQueries({
			queryKey: ["events", apiUrl, selectedAgent?.relativePath, sessionId],
		});
	};

	return {
		events,
		totalCount,
		isLoading,
		error,
		refetchEvents,
		invalidateEvents,
	};
}
