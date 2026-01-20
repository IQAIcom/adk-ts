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
		(span) => span.attributes && "adk.invocation_id" in span.attributes,
	)?.attributes?.["adk.invocation_id"];
}

export function findUserMessage(spans: TraceSpan[]): string | undefined {
	console.log("spans", spans);
	const span = spans.find((s) => s.attributes?.["adk.llm_request"]);

	if (!span?.attributes) return "[no invocation id found]";

	try {
		const request = JSON.parse(span.attributes["adk.llm_request"]);
		const userContent = request.contents
			.filter((c: any) => c.role === "user")
			.at(-1);
		return userContent?.parts?.[0]?.text ?? "[attachment]";
	} catch {
		return "[error parsing request]";
	}
}
