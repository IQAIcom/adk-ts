"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AgentListItemDto } from "../Api";
import { useApiUrl } from "./use-api-url";

const NANOSECONDS_PER_SECOND = 1_000_000_000;
const TRACE_STALE_TIME_MS = 30_000;
const TRACE_REFETCH_INTERVAL_MS = 30_000;
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
) {
	const apiUrl = useApiUrl();

	const {
		data: traces = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["traces", apiUrl, selectedAgent?.relativePath, sessionId],
		queryFn: async (): Promise<TraceSpan[]> => {
			if (!apiUrl || !selectedAgent || !sessionId) return [];

			const response = await fetch(
				`${apiUrl}/debug/trace/session/${sessionId}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch traces");
			}

			return response.json();
		},
		enabled: Boolean(apiUrl && selectedAgent && sessionId),
		staleTime: TRACE_STALE_TIME_MS,
		retry: TRACE_QUERY_RETRY_COUNT,
		refetchInterval: TRACE_REFETCH_INTERVAL_MS,
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
