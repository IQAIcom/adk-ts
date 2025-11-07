"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { EventItemDto as Event } from "../Api";

export function TracingPanel({ events, isLoading = false }: TracingPanelProps) {
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
						<TraceGroup key={group.id} group={group} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function TraceGroup({ group }: { group: TraceGroup }) {
	const [open, setOpen] = useState(true);
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
				<TraceTimeline group={group} />
			</CollapsibleContent>
		</Collapsible>
	);
}

function TraceTimeline({ group }: { group: TraceGroup }) {
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
					<TraceNode key={node.id} node={node} level={0} />
				))}
			</div>
		</div>
	);
}

function TraceNode({ node, level }: { node: TraceItem; level: number }) {
	const indent = `${level * 12}px`;
	const barWidth = Math.log((node.duration || 1) + 1) * 20;
	const children = node.children ?? [];

	return (
		<div className="ml-2 pl-2" style={{ marginLeft: indent }}>
			<div className="flex items-center justify-between py-1">
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
			</div>

			{children.length > 0 && (
				<div className="mt-1 space-y-1">
					{children.map((child) => (
						<TraceNode key={child.id} node={child} level={level + 1} />
					))}
				</div>
			)}
		</div>
	);
}

function extractMessageText(userMessage: Event): string {
	if (!userMessage || !userMessage.content) return "";
	const content = userMessage.content;
	if (typeof content === "string") return content;
	if ("parts" in content && Array.isArray((content as any).parts)) {
		const parts = (content as any).parts;
		if (parts[0]?.text) return parts[0].text;
	}
	if ("text" in content && typeof (content as any).text === "string") {
		return (content as any).text;
	}
	return "";
}

function groupTracesByUserMessage(events: Event[]): TraceGroup[] {
	const groups: TraceGroup[] = [];
	let currentGroup: TraceGroup | null = null;

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

		const duration = nextEvent ? nextEvent.timestamp - event.timestamp : 50;

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
	if (event.functionCalls?.length) return "tool_call";
	if (event.functionResponses?.length) return "tool_response";
	if (event.author === "user") return "message";
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

interface TracingPanelProps {
	events: Event[];
	isLoading?: boolean;
}

interface TraceItem {
	id: string;
	type: "message" | "llm_call" | "tool_call" | "tool_response";
	author: string;
	timestamp: number;
	duration?: number;
	children?: TraceItem[];
}

interface TraceGroup {
	id: string;
	userMessage: Event;
	events: TraceItem[];
	timestamp: number;
	duration?: number;
}
