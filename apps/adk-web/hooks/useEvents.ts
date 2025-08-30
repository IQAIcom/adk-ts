"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

	const {
		data: eventsResponse,
		isLoading,
		error,
		refetch: refetchEvents,
	} = useQuery<EventsResponse>({
		queryKey: ["events", apiUrl, selectedAgent?.relativePath, sessionId],
		queryFn: async () => {
			if (!apiUrl || !selectedAgent || !sessionId) {
				return { events: [], totalCount: 0 } as EventsResponse;
			}

			const response = await fetch(
				`${apiUrl}/api/agents/${encodeURIComponent(selectedAgent.relativePath)}/sessions/${sessionId}/events`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch events: ${response.status}`);
			}
			return response.json();
		},
		enabled: !!apiUrl && !!selectedAgent && !!sessionId,
		staleTime: 10000,
		retry: 2,
		refetchInterval: 30000,
	});

	// Keep session cards fresh when events for active session change
	useEffect(() => {
		if (!selectedAgent) return;
		queryClient.invalidateQueries({
			queryKey: ["sessions", apiUrl, selectedAgent.relativePath],
		});
	}, [eventsResponse, apiUrl, selectedAgent, queryClient]);

	const events = eventsResponse?.events ?? [];
	const totalCount = eventsResponse?.totalCount ?? 0;

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
