import { ADK_ATTRS, SEMCONV } from "@iqai/adk/constants";
import type { SpanNode, TraceSpan } from "@/hooks/use-traces";

export function toMs(time: [number, number]): number {
	return time[0] * 1000 + time[1] / 1_000_000;
}

export function buildSpanTree(spans: TraceSpan[]): SpanNode[] {
	const spanMap = new Map<string, SpanNode>();
	const roots: SpanNode[] = [];

	// First pass: create all nodes
	spans.forEach((span) => {
		const node: SpanNode = {
			...span,
			children: [],
			depth: 0,
			duration: toMs(span.end_time) - toMs(span.start_time),
		};
		spanMap.set(span.span_id, node);
	});

	// Second pass: build tree structure
	spans.forEach((span) => {
		const node = spanMap.get(span.span_id)!;

		if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
			const parent = spanMap.get(span.parent_span_id)!;
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	});

	// Calculate depths
	function setDepth(node: SpanNode, depth: number): void {
		node.depth = depth;

		for (const child of node.children) {
			setDepth(child, depth + 1);
		}
	}

	for (const root of roots) {
		setDepth(root, 0);
	}

	return roots;
}

export function flattenTree(
	spans: SpanNode[],
	level = 0,
): Array<{ span: SpanNode; level: number }> {
	return spans.flatMap((span) => [
		{ span, level },
		...(span.children.length > 0 ? flattenTree(span.children, level + 1) : []),
	]);
}

export function getGlobalTimes(spans: TraceSpan[]) {
	if (spans.length === 0) {
		return { start: 0, end: 0, duration: 1 };
	}

	const start = Math.min(...spans.map((s) => toMs(s.start_time)));
	const end = Math.max(...spans.map((s) => toMs(s.end_time)));

	return { start, end, duration: end - start };
}

export function getRelativeStart(
	span: TraceSpan,
	baseStartTimeMs: number,
	totalDurationMs: number,
): number {
	return ((toMs(span.start_time) - baseStartTimeMs) / totalDurationMs) * 100;
}

export function getRelativeWidth(
	span: TraceSpan,
	totalDurationMs: number,
): number {
	return (
		((toMs(span.end_time) - toMs(span.start_time)) / totalDurationMs) * 100
	);
}

export function getSpanIcon(name: string): string {
	const iconMap: Record<string, string> = {
		Invocation: "play-circle",
		agent_run: "bot",
		invoke_agent: "bot",
		tool: "wrench",
		call_llm: "message-square",
	};

	for (const [key, icon] of Object.entries(iconMap)) {
		if (name.startsWith(key)) {
			return icon;
		}
	}

	return "circle";
}

export function findInvocId(spans: TraceSpan[]): string | undefined {
	return spans.find(
		(span) => span.attributes && ADK_ATTRS.INVOCATION_ID in span.attributes,
	)?.attributes?.[ADK_ATTRS.INVOCATION_ID];
}

export function findUserMessage(spans: TraceSpan[]): string | undefined {
	const span = spans.find((s) => s.attributes?.[ADK_ATTRS.LLM_REQUEST]);

	if (!span?.attributes) return "[no invocation id found]";

	try {
		const request = JSON.parse(span.attributes[ADK_ATTRS.LLM_REQUEST]);
		const userContent = request.contents
			.filter((c: any) => c.role === "user")
			.at(-1);
		return userContent?.parts?.[0]?.text ?? "[attachment]";
	} catch {
		return "[error parsing request]";
	}
}

export function getLlmRequest(span: TraceSpan): any | undefined {
	if (span.attributes?.[ADK_ATTRS.LLM_REQUEST]) {
		try {
			return JSON.parse(span.attributes[ADK_ATTRS.LLM_REQUEST]);
		} catch {
			// continue
		}
	}

	// Check standard OTel input messages
	if (span.attributes?.[SEMCONV.GEN_AI_INPUT_MESSAGES]) {
		try {
			return {
				messages: JSON.parse(span.attributes[SEMCONV.GEN_AI_INPUT_MESSAGES]),
			};
		} catch {
			// continue
		}
	}

	// Fallback to tool args if LLM request is not present
	if (span.attributes?.[ADK_ATTRS.TOOL_ARGS]) {
		try {
			return JSON.parse(span.attributes[ADK_ATTRS.TOOL_ARGS]);
		} catch {
			return undefined;
		}
	}

	// Fallback to standard OTel tool args
	if (span.attributes?.[SEMCONV.GEN_AI_TOOL_CALL_ARGUMENTS]) {
		try {
			return JSON.parse(span.attributes[SEMCONV.GEN_AI_TOOL_CALL_ARGUMENTS]);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

export function getLlmResponse(span: TraceSpan): any | undefined {
	if (span.attributes?.[ADK_ATTRS.LLM_RESPONSE]) {
		try {
			return JSON.parse(span.attributes[ADK_ATTRS.LLM_RESPONSE]);
		} catch {
			// continue
		}
	}

	// Check standard OTel output messages
	if (span.attributes?.[SEMCONV.GEN_AI_OUTPUT_MESSAGES]) {
		try {
			return {
				content: JSON.parse(span.attributes[SEMCONV.GEN_AI_OUTPUT_MESSAGES]),
			};
		} catch {
			// continue
		}
	}

	// Fallback to tool response if LLM response is not present
	if (span.attributes?.[ADK_ATTRS.TOOL_RESPONSE]) {
		try {
			return JSON.parse(span.attributes[ADK_ATTRS.TOOL_RESPONSE]);
		} catch {
			return undefined;
		}
	}

	// Fallback to standard OTel tool result
	if (span.attributes?.[SEMCONV.GEN_AI_TOOL_CALL_RESULT]) {
		try {
			return JSON.parse(span.attributes[SEMCONV.GEN_AI_TOOL_CALL_RESULT]);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

export function getTraceTitle(span: TraceSpan): string {
	if (span.attributes?.[ADK_ATTRS.AGENT_NAME]) {
		return span.attributes[ADK_ATTRS.AGENT_NAME];
	}
	if (span.attributes?.[SEMCONV.GEN_AI_AGENT_NAME]) {
		return span.attributes[SEMCONV.GEN_AI_AGENT_NAME];
	}
	if (span.attributes?.[ADK_ATTRS.TOOL_NAME]) {
		return span.attributes[ADK_ATTRS.TOOL_NAME];
	}
	if (span.attributes?.[SEMCONV.GEN_AI_TOOL_NAME]) {
		return span.attributes[SEMCONV.GEN_AI_TOOL_NAME];
	}
	if (span.attributes?.[SEMCONV.GEN_AI_REQUEST_MODEL]) {
		return span.attributes[SEMCONV.GEN_AI_REQUEST_MODEL];
	}
	return span.name;
}

export function getPerformanceMetrics(span: TraceSpan) {
	return {
		inputTokens: span.attributes?.[SEMCONV.GEN_AI_USAGE_INPUT_TOKENS] as
			| number
			| undefined,
		outputTokens: span.attributes?.[SEMCONV.GEN_AI_USAGE_OUTPUT_TOKENS] as
			| number
			| undefined,
		ttft: span.attributes?.[ADK_ATTRS.LLM_TIME_TO_FIRST_TOKEN] as
			| number
			| undefined,
		cachedTokens: span.attributes?.[ADK_ATTRS.LLM_CACHED_TOKENS] as
			| number
			| undefined,
		contextWindowUsed: span.attributes?.[
			ADK_ATTRS.LLM_CONTEXT_WINDOW_USED_PCT
		] as number | undefined,
	};
}

export function getErrorDetails(span: TraceSpan) {
	if (!span.status?.code || span.status.code !== 2) return null; // 2 is ERROR

	return {
		category: span.attributes?.[ADK_ATTRS.ERROR_CATEGORY] as string | undefined,
		recoverable: span.attributes?.[ADK_ATTRS.ERROR_RECOVERABLE] as
			| boolean
			| undefined,
		retryRecommended: span.attributes?.[ADK_ATTRS.ERROR_RETRY_RECOMMENDED] as
			| boolean
			| undefined,
		message: span.status.message,
	};
}

export function getSystemInstructions(span: TraceSpan): string | undefined {
	return span.attributes?.[SEMCONV.GEN_AI_SYSTEM_INSTRUCTIONS] as
		| string
		| undefined;
}
