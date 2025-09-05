"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Api } from "../Api";
import type { Agent } from "../app/(dashboard)/_schema";

interface Event {
	id: string;
	author: string;
	timestamp: number;
	content: any;
	actions: any;
	functionCalls: any[];
	functionResponses: any[];
	branch?: string;
	isFinalResponse: boolean;
}

interface EventsResponse {
	events: Event[];
	totalCount: number;
}

export function useEvents(
	apiUrl: string,
	selectedAgent: Agent | null,
	sessionId: string | null,
) {
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
	} = useQuery<EventsResponse>({
		queryKey: ["events", apiUrl, selectedAgent?.relativePath, sessionId],
		queryFn: async () => {
			if (!apiClient || !selectedAgent || !sessionId)
				return { events: [], totalCount: 0 } as EventsResponse;
			const res = await apiClient.api.eventsControllerGetEvents(
				encodeURIComponent(selectedAgent.relativePath),
				sessionId,
			);
			return res.data as EventsResponse;
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
