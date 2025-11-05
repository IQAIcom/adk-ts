"use client";

import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	MessageCircle,
	Wrench,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventItemDto as Event } from "../Api";

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
	content?: string;
	functionCalls?: any[];
	functionResponses?: any[];
	attributes?: any;
	children?: TraceItem[];
}

interface TraceGroup {
	id: string;
	userMessage: Event;
	events: TraceItem[];
	timestamp: number;
	duration?: number;
}

export function TracingPanel({ events, isLoading = false }: TracingPanelProps) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	const traceGroups = useMemo(() => {
		return groupTracesByUserMessage(events);
	}, [events]);

	const toggleExpand = (id: string) => {
		setExpandedItems((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<div className="h-full flex flex-col bg-background">
			<div className="px-4 py-3 border-b">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-muted-foreground">
						{traceGroups.length} {traceGroups.length === 1 ? "trace" : "traces"}
					</span>
				</div>
			</div>

			<ScrollArea className="flex-1 max-h-[calc(100vh-200px)]">
				<div className="p-4 space-y-3">
					{isLoading ? (
						<div className="text-center text-muted-foreground py-12">
							<div className="text-sm">Loading traces...</div>
						</div>
					) : traceGroups.length === 0 ? (
						<div className="text-center text-muted-foreground py-12">
							<AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
							<p className="text-sm">No trace data</p>
							<p className="text-xs mt-1 opacity-60">
								Send a message to see execution traces
							</p>
						</div>
					) : (
						traceGroups.map((group) => (
							<TraceGroupNode
								key={group.id}
								group={group}
								isExpanded={expandedItems.has(group.id)}
								onToggleExpand={() => toggleExpand(group.id)}
								expandedItems={expandedItems}
								onToggleItem={toggleExpand}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

interface TraceGroupNodeProps {
	group: TraceGroup;
	isExpanded: boolean;
	onToggleExpand: () => void;
	expandedItems: Set<string>;
	onToggleItem: (id: string) => void;
}

function TraceGroupNode({
	group,
	isExpanded,
	onToggleExpand,
	expandedItems,
	onToggleItem,
}: TraceGroupNodeProps) {
	const _formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const userContent = extractContent(group.userMessage);

	return (
		<div className="space-y-2">
			{/* User Message Header */}
			<div
				className="rounded-md border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
				// onClick={onToggleExpand}
			>
				<div className="p-3">
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0 mt-0.5">
							{isExpanded ? (
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							) : (
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
							)}
						</div>

						<div className="flex-shrink-0 mt-0.5">
							<MessageCircle className="h-4 w-4 text-muted-foreground" />
						</div>

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-sm font-medium">User Message</span>
								<span className="text-xs text-muted-foreground">·</span>
								<span className="text-xs text-muted-foreground">
									{group.events.length}{" "}
									{group.events.length === 1 ? "event" : "events"}
								</span>
								{group.duration && (
									<>
										<span className="text-xs text-muted-foreground">·</span>
										<span className="text-xs text-muted-foreground">
											{formatDuration(group.duration)}
										</span>
									</>
								)}
							</div>

							{userContent && (
								<p
									className={`text-xs text-muted-foreground ${!isExpanded ? "truncate" : ""}`}
								>
									{userContent}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Nested Events */}
			{isExpanded && group.events.length > 0 && (
				<div className="ml-7 pl-4 border-l space-y-1.5">
					{group.events.map((item) => (
						<TraceItemNode
							key={item.id}
							item={item}
							depth={0}
							isExpanded={expandedItems.has(item.id)}
							onToggleExpand={() => onToggleItem(item.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface TraceItemNodeProps {
	item: TraceItem;
	depth: number;
	isExpanded: boolean;
	onToggleExpand: () => void;
}

function TraceItemNode({
	item,
	depth,
	isExpanded,
	onToggleExpand,
}: TraceItemNodeProps) {
	const hasChildren = item.children && item.children.length > 0;
	const hasDetails =
		item.functionCalls?.length ||
		item.functionResponses?.length ||
		item.content;

	const icon = getIconForType(item.type);

	const _formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	return (
		<div className="space-y-1.5">
			<div
				className={`rounded-md border bg-card hover:bg-accent/5 transition-colors ${
					hasChildren || hasDetails ? "cursor-pointer" : ""
				}`}
				style={{ marginLeft: `${depth * 16}px` }}
				// onClick={hasChildren || hasDetails ? onToggleExpand : undefined}
			>
				<div className="p-2.5">
					<div className="flex items-start gap-2.5">
						{hasChildren || hasDetails ? (
							<div className="flex-shrink-0 mt-0.5">
								{isExpanded ? (
									<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
								) : (
									<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
								)}
							</div>
						) : (
							<div className="w-3.5 flex-shrink-0" />
						)}

						<div className="flex-shrink-0 text-muted-foreground mt-0.5">
							{icon}
						</div>

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-0.5">
								<span className="text-xs font-medium capitalize">
									{item.type.replace(/_/g, " ")}
								</span>
								{item.duration && (
									<>
										<span className="text-xs text-muted-foreground">·</span>
										<span className="text-xs text-muted-foreground">
											{formatDuration(item.duration)}
										</span>
									</>
								)}
							</div>

							{item.content && !isExpanded && (
								<p className="text-xs text-muted-foreground truncate">
									{item.content}
								</p>
							)}
						</div>
					</div>

					{/* Expanded Details */}
					{isExpanded && hasDetails && (
						<div className="mt-3 ml-6 space-y-2.5">
							{item.content && (
								<div className="text-xs">
									<div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-medium">
										Content
									</div>
									<div className="bg-muted/50 rounded px-2.5 py-2 font-mono text-[11px] break-words">
										{item.content}
									</div>
								</div>
							)}

							{item.functionCalls && item.functionCalls.length > 0 && (
								<div className="text-xs space-y-1.5">
									<div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
										Function Calls ({item.functionCalls.length})
									</div>
									{item.functionCalls.map((call: any, idx: number) => (
										<div
											key={call.id || idx}
											className="bg-muted/50 rounded px-2.5 py-2"
										>
											<div className="font-medium text-[11px] mb-1">
												{call.name || "Unknown"}
											</div>
											{call.id && (
												<div className="text-muted-foreground text-[10px] mb-1">
													{call.id}
												</div>
											)}
											{call.args && (
												<pre className="text-[10px] mt-1.5 overflow-x-auto text-muted-foreground">
													{JSON.stringify(call.args, null, 2)}
												</pre>
											)}
										</div>
									))}
								</div>
							)}

							{item.functionResponses && item.functionResponses.length > 0 && (
								<div className="text-xs space-y-1.5">
									<div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
										Function Responses ({item.functionResponses.length})
									</div>
									{item.functionResponses.map((response: any, idx: number) => (
										<div
											key={response.id || idx}
											className="bg-muted/50 rounded px-2.5 py-2"
										>
											{response.id && (
												<div className="text-muted-foreground text-[10px] mb-1.5">
													{response.id}
												</div>
											)}
											{response.response && (
												<pre className="text-[10px] overflow-x-auto text-muted-foreground">
													{JSON.stringify(response.response, null, 2)}
												</pre>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Child Items */}
			{isExpanded && hasChildren && (
				<div className="space-y-1.5">
					{item.children!.map((child) => (
						<TraceItemNode
							key={child.id}
							item={child}
							depth={depth + 1}
							isExpanded={false}
							onToggleExpand={() => {}}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// Helper functions
function groupTracesByUserMessage(events: Event[]): TraceGroup[] {
	const groups: TraceGroup[] = [];
	let currentGroup: TraceGroup | null = null;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		const nextEvent = events[i + 1];

		// Start a new group when we encounter a user message
		if (event.author === "user") {
			// Close previous group if exists
			if (currentGroup) {
				groups.push(currentGroup);
			}

			// Start new group
			currentGroup = {
				id: event.id,
				userMessage: event,
				events: [],
				timestamp: event.timestamp,
			};
		} else if (currentGroup) {
			// Add event to current group
			const item: TraceItem = {
				id: event.id,
				type: determineTraceType(event),
				author: event.author,
				timestamp: event.timestamp,
				content: extractContent(event),
				functionCalls: event.functionCalls,
				functionResponses: event.functionResponses,
				attributes: event.actions,
			};

			if (nextEvent) {
				item.duration = nextEvent.timestamp - event.timestamp;
			}

			currentGroup.events.push(item);
		}
	}

	// Add the last group
	if (currentGroup) {
		// Calculate total duration
		if (currentGroup.events.length > 0) {
			const lastEvent = currentGroup.events[currentGroup.events.length - 1];
			currentGroup.duration =
				lastEvent.timestamp +
				(lastEvent.duration || 0) -
				currentGroup.timestamp;
		}
		groups.push(currentGroup);
	}

	return groups;
}

function determineTraceType(event: Event): TraceItem["type"] {
	if (event.functionCalls && event.functionCalls.length > 0) {
		return "tool_call";
	}
	if (event.functionResponses && event.functionResponses.length > 0) {
		return "tool_response";
	}
	if (event.author === "user") {
		return "message";
	}
	return "llm_call";
}

function extractContent(event: Event): string | undefined {
	if (!event.content) return undefined;

	const content = event.content as any;
	if (content.parts && Array.isArray(content.parts)) {
		const textParts = content.parts
			.filter((part: any) => part.text)
			.map((part: any) => part.text);
		if (textParts.length > 0) {
			return textParts.join("\n").substring(0, 200);
		}
	}

	return JSON.stringify(event.content).substring(0, 200);
}

function getIconForType(type: TraceItem["type"]) {
	switch (type) {
		case "message":
			return <MessageCircle className="h-3.5 w-3.5" />;
		case "llm_call":
			return <Zap className="h-3.5 w-3.5" />;
		case "tool_call":
			return <Wrench className="h-3.5 w-3.5" />;
		case "tool_response":
			return <MessageCircle className="h-3.5 w-3.5" />;
	}
}

function formatDuration(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}
