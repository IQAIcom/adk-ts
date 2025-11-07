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
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { EventItemDto as Event } from "../Api";

export function TracingPanel({ events, isLoading = false }: TracingPanelProps) {
	console.log("events", JSON.stringify(events, null, 2));
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

function TraceDetailSheet({
	open,
	onOpenChange,
	node,
	eventData,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	node: TraceItem;
	eventData?: Event;
}) {
	if (!eventData) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="overflow-hidden">
				<SheetHeader>
					<SheetTitle>{formatTraceType(node.type)}</SheetTitle>
				</SheetHeader>

				<Tabs defaultValue="event" className="h-full flex flex-col">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="event">Event</TabsTrigger>
						<TabsTrigger value="request">Request</TabsTrigger>
						<TabsTrigger value="response">Response</TabsTrigger>
					</TabsList>

					<TabsContent value="event" className="flex-1 overflow-auto">
						<ScrollArea className="h-full">
							<div className="p-4">
								<JsonTreeView data={eventData} />
							</div>
						</ScrollArea>
					</TabsContent>

					<TabsContent value="request" className="flex-1 overflow-auto">
						<ScrollArea className="h-full">
							<div className="p-4">
								{(eventData as any).requestMetadata ? (
									<JsonTreeView data={(eventData as any).requestMetadata} />
								) : eventData.content &&
									typeof eventData.content === "object" ? (
									<JsonTreeView
										data={{
											model:
												(eventData.content as any).model ||
												(eventData.content as any).config?.model,
											config: (eventData.content as any).config,
											systemInstruction: (eventData.content as any)
												.systemInstruction,
											tools: (eventData.content as any).tools,
											contents: (eventData.content as any).contents,
										}}
									/>
								) : (
									<p className="text-sm text-muted-foreground">
										No request data
									</p>
								)}
							</div>
						</ScrollArea>
					</TabsContent>

					<TabsContent value="response" className="flex-1 overflow-auto">
						<ScrollArea className="h-full">
							<div className="p-4">
								{(eventData as any).responseMetadata ? (
									<JsonTreeView data={(eventData as any).responseMetadata} />
								) : eventData.content &&
									typeof eventData.content === "object" ? (
									<JsonTreeView
										data={{
											content: (eventData.content as any).content,
											finishReason: (eventData.content as any).finishReason,
											usageMetadata: (eventData.content as any).usageMetadata,
											groundingMetadata: (eventData as any).groundingMetadata,
										}}
									/>
								) : (
									<p className="text-sm text-muted-foreground">
										No response data
									</p>
								)}
							</div>
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
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

function JsonTreeView({ data, level = 0 }: { data: any; level?: number }) {
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const toggleCollapse = (key: string) => {
		setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	if (data === null)
		return <span className="text-muted-foreground italic">null</span>;
	if (data === undefined)
		return <span className="text-muted-foreground italic">undefined</span>;

	if (typeof data !== "object") {
		return (
			<span
				className={cn(
					"font-medium",
					typeof data === "string" && "text-emerald-600 dark:text-emerald-400",
					typeof data === "number" && "text-blue-600 dark:text-blue-400",
					typeof data === "boolean" && "text-purple-600 dark:text-purple-400",
				)}
			>
				{typeof data === "string" ? `"${data}"` : String(data)}
			</span>
		);
	}

	if (Array.isArray(data)) {
		if (data.length === 0)
			return <span className="text-muted-foreground">[]</span>;

		return (
			<div className="space-y-0.5">
				<span className="text-muted-foreground text-xs">[</span>
				{data.map((item, index) => (
					<div
						key={`item-${index + 1}`}
						className="ml-6 flex items-start gap-2 py-0.5"
					>
						<span className="text-muted-foreground text-xs min-w-[20px]">
							{index}
						</span>
						<JsonTreeView data={item} level={level + 1} />
					</div>
				))}
				<span className="text-muted-foreground text-xs">]</span>
			</div>
		);
	}

	const keys = Object.keys(data);
	if (keys.length === 0)
		return <span className="text-muted-foreground">{"{}"}</span>;

	return (
		<div className="space-y-0.5">
			{level === 0 && (
				<span className="text-muted-foreground text-xs">{"{"}</span>
			)}
			{keys.map((key) => {
				const value = data[key];
				const isExpandable =
					value && typeof value === "object" && Object.keys(value).length > 0;
				const isCollapsed = collapsed[key];

				return (
					<div key={key} className="group">
						<div className="flex items-start gap-2 py-0.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
							<div className="flex items-center gap-1.5 min-w-0">
								{isExpandable ? (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => toggleCollapse(key)}
										className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
									>
										{isCollapsed ? (
											<ChevronRight className="w-3 h-3" />
										) : (
											<ChevronDown className="w-3 h-3" />
										)}
									</Button>
								) : (
									<span className="w-4 flex-shrink-0" />
								)}
								<span className="text-foreground font-mono text-xs font-semibold truncate">
									{key}
								</span>
								<span className="text-muted-foreground flex-shrink-0">:</span>
							</div>
							{isCollapsed && isExpandable && (
								<span className="text-muted-foreground text-xs italic">
									{Array.isArray(value) ? `[${value.length}]` : "{...}"}
								</span>
							)}
							{!isCollapsed && !isExpandable && (
								<div className="flex-1 min-w-0">
									<JsonTreeView data={value} level={level + 1} />
								</div>
							)}
						</div>
						{!isCollapsed && isExpandable && (
							<div className="ml-6 mt-0.5 pl-3 border-l-2 border-muted">
								<JsonTreeView data={value} level={level + 1} />
							</div>
						)}
					</div>
				);
			})}
			{level === 0 && (
				<span className="text-muted-foreground text-xs">{"}"}</span>
			)}
		</div>
	);
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

interface TraceItem {
	id: string;
	type: "message" | "llm_call" | "tool_call" | "tool_response";
	author?: string;
	timestamp: number;
	duration?: number;
	children?: TraceItem[];
}
