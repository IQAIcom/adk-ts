"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AgentListItemDto } from "../Api";
import { useApiUrl } from "./use-api-url";

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
		enabled: !!apiUrl && !!selectedAgent && !!sessionId,
		staleTime: 30000,
		retry: 2,
		refetchInterval: 30000,
	});

	const tracesByTraceId = useMemo(() => {
		const map = new Map<string, TraceSpan[]>();
		traces.forEach((span) => {
			const key = span.trace_id;
			const group = map.get(key) || [];
			group.push(span);
			map.set(key, group);
		});

		map.forEach((spans) => {
			spans.sort((a, b) => {
				const aTime = a.start_time[0] * 1e9 + a.start_time[1];
				const bTime = b.start_time[0] * 1e9 + b.start_time[1];
				return aTime - bTime;
			});
		});

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
