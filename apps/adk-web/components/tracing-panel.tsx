"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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

	if (!traceGroups.length) {
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
						<TraceGroupCollapsible key={group.id} group={group} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

function TraceGroupCollapsible({ group }: { group: TraceGroup }) {
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
						<p className="text-foreground">
							<span className="line-clamp-1">
								{messageText || "Untitled message"}
							</span>
							<span className="text-muted-foreground">
								{" "}
								({new Date(group.timestamp).toLocaleTimeString()})
							</span>
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
	const flatItems = useMemo(() => flattenTraces(group.events), [group.events]);
	const startTime = Math.min(...flatItems.map((i) => i.timestamp));
	const endTime = Math.max(
		...flatItems.map((i) => i.timestamp + (i.duration || 0)),
	);
	const totalDuration = Math.max(endTime - startTime, 1);

	return (
		<div className="p-3 space-y-1 text-xs font-mono">
			{flatItems.map((node) => {
				const relStart = ((node.timestamp - startTime) / totalDuration) * 100;
				const relWidth = ((node.duration || 0) / totalDuration) * 100;

				return (
					<div
						key={node.id}
						className="flex items-center h-6 relative"
						style={{ paddingLeft: `${node.level * 12}px` }}
					>
						<span className="mr-2 text-blue-400">
							{getIconForType(node.type)}
						</span>

						<div className="w-[200px] truncate text-foreground">
							{formatTraceType(node.type)}{" "}
							<span className="text-muted-foreground">
								({formatDuration(node.duration || 0)})
							</span>
						</div>

						<div className="flex-1 relative h-4 ml-4">
							<div
								className="absolute h-3 rounded bg-blue-500/30"
								style={{
									left: `${relStart}%`,
									width: `${Math.max(relWidth, 1)}%`,
								}}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function flattenTraces(
	items: TraceItem[],
	level = 0,
): (TraceItem & { level: number })[] {
	return items.flatMap((item) => [
		{ ...item, level },
		...(item.children ? flattenTraces(item.children, level + 1) : []),
	]);
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
		} else if (currentGroup) {
			const item: TraceItem = {
				id: event.id,
				type: determineTraceType(event),
				author: event.author,
				timestamp: event.timestamp,
				duration: nextEvent ? nextEvent.timestamp - event.timestamp : 50,
				children: [],
			};
			currentGroup.events.push(item);
		}
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
		while (stack.length) {
			const top = stack[stack.length - 1];
			const end = top.timestamp + (top.duration || 0);
			if (end <= item.timestamp) stack.pop();
			else break;
		}
		if (stack.length) stack[stack.length - 1].children?.push(item);
		else roots.push(item);
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
		default:
			return "•";
	}
}

function formatTraceType(type: string): string {
	return type.replace(/_/g, " ");
}

function formatDuration(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function extractMessageText(userMessage: Event): string {
	if (!userMessage?.content) return "";

	const content = userMessage.content as
		| { parts?: { text?: string }[] }
		| { text?: string }
		| string;

	if (typeof content === "string") return content;

	if ("parts" in content && Array.isArray(content.parts)) {
		const first = content.parts[0];
		if (first?.text) return first.text;
	}

	if ("text" in content && typeof content.text === "string") {
		return content.text;
	}

	return "";
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
