"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { EventItemDto as Event } from "../Api";
import { TraceDetailSheet, TraceItem } from "./tracing-sheet";

export function TracingPanel({ events, isLoading = false }: TracingPanelProps) {
	const eventMap = useMemo(() => {
		const map = new Map<string, Event>();
		for (const e of events) map.set(e.id, e);
		return map;
	}, [events]);

	const traceGroups = useMemo(() => groupTracesByUserMessage(events), [events]);

	if (isLoading) {
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				Loading traces…
			</div>
		);
	}

	if (traceGroups.length === 0) {
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				No trace data
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<ScrollArea className="flex-1">
				<div className="divide-y divide-border/30">
					{traceGroups.map((group) => (
						<TraceGroup key={group.id} group={group} eventMap={eventMap} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function TraceGroup({
	group,
	eventMap,
}: {
	group: TraceGroup;
	eventMap: Map<string, Event>;
}) {
	const [open, setOpen] = useState(false);
	const messageText = extractMessageText(group.userMessage);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<div className="flex items-center justify-between px-3 py-2 text-xs font-mono cursor-pointer hover:bg-muted/50">
					<div className="flex items-center space-x-2">
						{open ? (
							<ChevronDown className="w-3 h-3 text-muted-foreground" />
						) : (
							<ChevronRight className="w-3 h-3 text-muted-foreground" />
						)}
						<p className="text-foreground line-clamp-1">
							{messageText || "Untitled message"}
						</p>
					</div>
				</div>
			</CollapsibleTrigger>

			<CollapsibleContent>
				<TraceTimeline group={group} eventMap={eventMap} />
			</CollapsibleContent>
		</Collapsible>
	);
}

function TraceTimeline({
	group,
	eventMap,
}: {
	group: TraceGroup;
	eventMap: Map<string, Event>;
}) {
	const nested = useMemo(() => group.events, [group.events]);
	if (!nested || nested.length === 0) return null;

	return (
		<div className="text-white p-4 rounded-xl font-mono shadow-inner border-b border-t rounded-t-none rounded-b-none">
			<div className="mb-3">
				<h3 className="text-sm font-semibold text-slate-100">Invocation ID</h3>
				<p className="text-slate-400 text-xs truncate">{group.id}</p>
			</div>

			<div className="space-y-1 text-xs">
				{nested.map((node) => (
					<TraceNode key={node.id} node={node} level={0} eventMap={eventMap} />
				))}
			</div>
		</div>
	);
}

function TraceNode({
	node,
	level,
	eventMap,
}: {
	node: TraceItem;
	level: number;
	eventMap: Map<string, Event>;
}) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const indent = `${level * 12}px`;
	const barWidth = Math.log((node.duration || 1) + 1) * 20;
	const children = node.children ?? [];

	const eventData = eventMap.get(node.id);

	const isClickable =
		node.type === "llm_call" ||
		node.type === "tool_call" ||
		node.type === "tool_response";

	const content = (
		<>
			<div className="flex items-center gap-2 text-slate-300 text-sm truncate">
				<span>{getIconForType(node.type)}</span>
				<span className="truncate">{formatTraceType(node.type)}</span>
			</div>

			<div className="flex items-center gap-2 text-slate-400 text-xs">
				<div
					className={cn(
						"h-2 rounded transition-all",
						node.type === "tool_call"
							? "bg-green-600"
							: node.type === "tool_response"
								? "bg-amber-500"
								: node.type === "llm_call"
									? "bg-blue-600"
									: "bg-slate-600",
					)}
					style={{ width: `${barWidth}px` }}
				/>
				<span>{formatDuration(node.duration || 0)}</span>
			</div>
		</>
	);

	return (
		<>
			<div className="ml-2 pl-2" style={{ marginLeft: indent }}>
				{isClickable ? (
					<Button
						variant="ghost"
						className="w-full flex items-center justify-between py-1 h-auto hover:bg-slate-700/30 rounded px-2 -mx-2 transition-colors"
						onClick={() => setSheetOpen(true)}
					>
						{content}
					</Button>
				) : (
					<div className="flex items-center justify-between py-1 rounded px-2 -mx-2">
						{content}
					</div>
				)}

				{children.length > 0 && (
					<div className="mt-1 space-y-1">
						{children.map((child) => (
							<TraceNode
								key={child.id}
								node={child}
								level={level + 1}
								eventMap={eventMap}
							/>
						))}
					</div>
				)}
			</div>

			{isClickable && (
				<TraceDetailSheet
					open={sheetOpen}
					onOpenChange={setSheetOpen}
					node={node}
					eventData={eventData}
				/>
			)}
		</>
	);
}

function extractMessageText(userMessage: Event): string {
	if (!userMessage || !userMessage.content) return "";
	const content = userMessage.content;
	if (typeof content === "string") return content;
	if (typeof content === "object" && content !== null) {
		if ("parts" in content && Array.isArray(content.parts)) {
			const parts = content.parts;
			if (parts[0] && typeof parts[0] === "object" && "text" in parts[0]) {
				return String(parts[0].text);
			}
		}
		if ("text" in content && typeof content.text === "string") {
			return content.text;
		}
	}
	return "";
}

function groupTracesByUserMessage(events: Event[]): TraceGroup[] {
	console.log(
		"groupTracesByUserMessage events",
		JSON.stringify(events, null, 2),
	);
	const groups: TraceGroup[] = [];
	console.log(
		"groupTracesByUserMessage groups",
		JSON.stringify(groups, null, 2),
	);

	let currentGroup: TraceGroup | null = null;
	const DURATION_FALLBACK_MS = 50;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		const nextEvent = events[i + 1];

		if (event.author === "user") {
			if (currentGroup) {
				currentGroup.events = buildNestedStructure(currentGroup.events);
				groups.push(currentGroup);
			}
			currentGroup = {
				id: event.id,
				userMessage: event,
				events: [],
				timestamp: event.timestamp,
			};
			continue;
		}

		if (!currentGroup) continue;

		const duration = nextEvent
			? nextEvent.timestamp - event.timestamp
			: DURATION_FALLBACK_MS;

		currentGroup.events.push({
			id: event.id,
			type: determineTraceType(event),
			author: event.author,
			timestamp: event.timestamp,
			duration,
			children: [],
		});
	}

	if (currentGroup) {
		currentGroup.events = buildNestedStructure(currentGroup.events);
		groups.push(currentGroup);
	}

	return groups;
}

function buildNestedStructure(items: TraceItem[]): TraceItem[] {
	const stack: TraceItem[] = [];
	const roots: TraceItem[] = [];

	for (const item of items) {
		while (stack.length > 0) {
			const top = stack[stack.length - 1];
			const end = top.timestamp + (top.duration || 0);
			if (end <= item.timestamp) stack.pop();
			else break;
		}

		if (stack.length > 0) {
			const parent = stack[stack.length - 1];
			parent.children = parent.children || [];
			parent.children.push(item);
		} else {
			roots.push(item);
		}
		stack.push(item);
	}

	return roots;
}

function determineTraceType(event: Event): TraceItem["type"] {
	let functionCalls: Event["functionCalls"] | undefined;
	let functionResponses: Event["functionResponses"] | undefined;

	if (event.functionCalls) {
		functionCalls = event.functionCalls;
	} else if (
		event.responseMetadata &&
		"functionCalls" in event.responseMetadata
	) {
		functionCalls = event.responseMetadata
			.functionCalls as Event["functionCalls"];
	}

	if ("functionResponses" in event && event.functionResponses) {
		functionResponses = event.functionResponses;
	} else if (
		event.responseMetadata &&
		"functionResponses" in event.responseMetadata
	) {
		functionResponses = event.responseMetadata
			.functionResponses as Event["functionResponses"];
	}

	if (Array.isArray(functionCalls) && functionCalls.length > 0) {
		return "tool_call";
	}

	if (Array.isArray(functionResponses) && functionResponses.length > 0) {
		return "tool_response";
	}

	if (event.author === "user") {
		return "message";
	}

	return "llm_call";
}

function getIconForType(type: TraceItem["type"]) {
	switch (type) {
		case "tool_call":
			return "▶";
		case "tool_response":
			return "◀";
		case "llm_call":
			return "💬";
		case "message":
			return "🧑";
		default:
			return "•";
	}
}

function formatTraceType(type: string): string {
	return type ? type.replace(/_/g, " ") : "";
}

function formatDuration(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

export interface TracingPanelProps {
	events: Event[];
	isLoading?: boolean;
}

interface TraceGroup {
	id: string;
	userMessage: Event;
	events: TraceItem[];
	timestamp: number;
}
