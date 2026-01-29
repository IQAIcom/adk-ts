"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AgentListItemDto } from "../Api";
import { useApiUrl } from "./use-api-url";

const NANOSECONDS_PER_SECOND = 1_000_000_000;
const TRACE_STALE_TIME_MS = 0;
const TRACE_REFETCH_INTERVAL_MS = 1_000;
const TRACE_QUERY_RETRY_COUNT = 2;

export interface TraceSpan {
	trace_id: string;
	span_id: string;
	parent_span_id?: string;
	name: string;
	kind: number;
	start_time: [number, number];
	end_time: [number, number];
	attributes?: Record<string, any>;
	status?: {
		code: number;
		message?: string;
	};
	events?: any[];
}

export interface SpanNode extends TraceSpan {
	children: SpanNode[];
	depth: number;
	duration: number;
}

export function useTraces(
	selectedAgent: AgentListItemDto | null,
	sessionId: string | null,
	sessionCreatedAt?: number, // Optional timestamp when session was created
) {
	const apiUrl = useApiUrl();

	// Calculate if session is new (less than 5 seconds old)
	const isNewSession = useMemo(() => {
		if (!sessionCreatedAt) return false;
		const sessionAge = Date.now() - sessionCreatedAt;
		return sessionAge < 5000; // 5 seconds
	}, [sessionCreatedAt]);

	// Use longer polling interval for new sessions to avoid premature requests
	const pollingInterval = useMemo(() => {
		if (isNewSession) {
			return TRACE_REFETCH_INTERVAL_MS * 3; // 3 seconds for new sessions
		}
		return TRACE_REFETCH_INTERVAL_MS; // 1 second for active sessions
	}, [isNewSession]);

	const {
		data: traces = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: [
			"traces",
			apiUrl,
			selectedAgent?.relativePath,
			sessionId,
			sessionCreatedAt,
		],
		queryFn: async (): Promise<TraceSpan[]> => {
			if (!apiUrl || !selectedAgent || !sessionId) return [];

			const response = await fetch(
				`${apiUrl}/debug/trace/session/${sessionId}`,
			);

			if (!response.ok) {
				// Return empty array for 404s (session not found) instead of throwing
				if (response.status === 404) {
					return [];
				}
				throw new Error("Failed to fetch traces");
			}

			return response.json();
		},
		enabled: Boolean(apiUrl && selectedAgent && sessionId),
		staleTime: TRACE_STALE_TIME_MS,
		retry: TRACE_QUERY_RETRY_COUNT,
		refetchInterval: pollingInterval,
	});

	const tracesByTraceId = useMemo(() => {
		const map = new Map<string, TraceSpan[]>();

		for (const span of traces) {
			const group = map.get(span.trace_id) ?? [];
			group.push(span);
			map.set(span.trace_id, group);
		}

		for (const spans of map.values()) {
			spans.sort((a, b) => {
				const aTime =
					a.start_time[0] * NANOSECONDS_PER_SECOND + a.start_time[1];
				const bTime =
					b.start_time[0] * NANOSECONDS_PER_SECOND + b.start_time[1];
				return aTime - bTime;
			});
		}

		return map;
	}, [traces]);

	return {
		traces,
		tracesByTraceId,
		isLoading,
		error,
		refetch,
	};
}
