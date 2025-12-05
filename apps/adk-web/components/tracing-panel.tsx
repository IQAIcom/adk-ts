"use client";

import { Activity, Bot, CheckCircle, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function TracingPanel({
	events,
	isLoading = false,
	pageSize = 10,
}: TracingPanelProps) {
	const [currentPage, setCurrentPage] = useState(1);

	const rootNodes = useMemo(() => buildUserMessageTree(events), [events]);

	const totalPages = Math.ceil(rootNodes.length / pageSize);
	const startIdx = (currentPage - 1) * pageSize;
	const endIdx = startIdx + pageSize;
	const paginatedNodes = rootNodes.slice(startIdx, endIdx);

	if (isLoading) {
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				Loading traces…
			</div>
		);
	}

	if (!events || events.length === 0) {
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				No trace data
			</div>
		);
	}

	return (
		<div className="text-slate-100 p-6 px-2 max-h-screen flex flex-col">
			<div className="flex items-center justify-between mb-4 px-2">
				<div className="text-sm text-slate-400">
					{rootNodes.length} {rootNodes.length === 1 ? "trace" : "traces"}
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="space-y-4 pb-4">
					{paginatedNodes.map((node) => (
						<TimelineNode key={node.event.id} node={node} depth={0} />
					))}
				</div>
			</ScrollArea>

			{totalPages > 1 && (
				<div className="mt-4">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									className={
										currentPage === 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>

							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => {
									// Show first page, last page, current page, and pages around current
									const showPage =
										page === 1 ||
										page === totalPages ||
										Math.abs(page - currentPage) <= 1;

									const showEllipsisBefore =
										page === currentPage - 2 && currentPage > 3;
									const showEllipsisAfter =
										page === currentPage + 2 && currentPage < totalPages - 2;

									if (showEllipsisBefore) {
										return (
											<PaginationItem key={`ellipsis-before-${page}`}>
												<PaginationEllipsis />
											</PaginationItem>
										);
									}

									if (showEllipsisAfter) {
										return (
											<PaginationItem key={`ellipsis-after-${page}`}>
												<PaginationEllipsis />
											</PaginationItem>
										);
									}

									if (!showPage) return null;

									return (
										<PaginationItem key={page}>
											<PaginationLink
												onClick={() => setCurrentPage(page)}
												isActive={currentPage === page}
												className="cursor-pointer"
											>
												{page}
											</PaginationLink>
										</PaginationItem>
									);
								},
							)}

							<PaginationItem>
								<PaginationNext
									onClick={() =>
										setCurrentPage((p) => Math.min(totalPages, p + 1))
									}
									className={
										currentPage === totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}
		</div>
	);
}

function TimelineNode({ node, depth }: { node: EventNode; depth: number }) {
	const forceCollapsible = node.event.author === "user";

	return (
		<div className="relative">
			<div style={{ paddingLeft: depth * 24 }}>
				{forceCollapsible ? (
					<Collapsible defaultOpen className="bg-card rounded-b">
						<CollapsibleTrigger asChild>
							<div
								className={cn(
									"cursor-pointer bg-secondary flex items-start gap-2 rounded-md",
									"p-1 border rounded hover:bg-secondary/80 transition-colors",
								)}
							>
								<TimelineDot node={node} />
								<EventContent node={node} />
							</div>
						</CollapsibleTrigger>

						<CollapsibleContent>
							<div className="space-y-2 mt-2">
								{node.children.map((child) => (
									<TimelineNode
										key={child.event.id}
										node={child}
										depth={depth + 1}
									/>
								))}
							</div>
						</CollapsibleContent>
					</Collapsible>
				) : (
					<div className="flex items-start gap-2 p-1 rounded hover:bg-secondary/50 transition-colors">
						<TimelineDot node={node} />
						<EventContent node={node} />
					</div>
				)}
			</div>
		</div>
	);
}

const TimelineDot = ({ node }: { node: EventNode }) => {
	if (!node.icon) return null;

	return (
		<div
			className={cn(
				"w-6 h-6 rounded-full flex items-center justify-center shrink-0",
				"bg-slate-700",
				node.color,
			)}
		>
			{node.icon}
		</div>
	);
};

const EventContent = ({ node }: { node: EventNode }) => {
	const requestMetadataObj = node.event
		.requestMetadata as RequestMetadata | null;

	return (
		<div className="flex items-start gap-2 grow rounded p-1 min-w-0">
			<div className="flex-1 min-w-0">
				<div className="font-mono text-sm truncate" title={node.displayName}>
					{node.displayName}
				</div>

				<div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 min-w-0">
					{node.event.branch && node.event.author !== "user" && (
						<span className="truncate max-w-[120px]" title={node.event.author}>
							[{node.event.author}]
						</span>
					)}
					{requestMetadataObj?.model && (
						<span
							title={requestMetadataObj.model}
							className="font-mono truncate"
						>
							{requestMetadataObj.model}
						</span>
					)}
				</div>

				<div className="text-xs text-slate-500 mt-0.5">{node.duration}</div>
			</div>
		</div>
	);
};

const getEventName = (event: Event) => {
	const contentWithParts = event.content as ContentParts;
	const functionCallsArray = event.functionCalls as FunctionCall[];
	const functionResponsesArray = event.functionResponses as FunctionResponse[];

	if (event.author === "user") {
		const text = contentWithParts?.parts?.[0]?.text || "";
		return text.length > 60 ? `${text.substring(0, 60)}...` : text;
	}
	if (functionCallsArray?.length > 0)
		return functionCallsArray[0].functionCall.name;
	if (functionResponsesArray?.length > 0)
		return `${functionResponsesArray[0].functionResponse.name}-response`;
	if (event.isFinalResponse) return "final-answer";
	return event.author;
};

const getEventIcon = (event: Event) => {
	if (event.author === "user") return null;
	if ((event.functionCalls as FunctionCall[])?.length > 0)
		return <Wrench className="w-4 h-4" />;
	if ((event.functionResponses as FunctionResponse[])?.length > 0)
		return <Activity className="w-4 h-4" />;
	if (event.isFinalResponse) return <CheckCircle className="w-4 h-4" />;
	return <Bot className="w-4 h-4" />;
};

const getEventColor = (event: Event) => {
	if (event.author === "user") return "";
	if ((event.functionCalls as FunctionCall[])?.length > 0)
		return "text-orange-400";
	if ((event.functionResponses as FunctionResponse[])?.length > 0)
		return "text-purple-400";
	if (event.isFinalResponse) return "text-green-400";
	return "text-gray-400";
};

function buildUserMessageTree(events: Event[]): EventNode[] {
	const roots: EventNode[] = [];
	let currentUserNode: EventNode | null = null;

	const withDurations = computeDurations(events);

	for (const event of withDurations) {
		const node: EventNode = {
			event,
			children: [],
			displayName: getEventName(event),
			color: getEventColor(event),
			icon: getEventIcon(event),
			duration: formatDuration(event.__durationMs),
			rawDuration: event.__durationMs,
		};

		if (event.author === "user") {
			currentUserNode = node;
			roots.push(node);
		} else if (currentUserNode) {
			currentUserNode.children.push(node);
		} else {
			roots.push(node);
		}
	}

	// compute total duration for user events
	for (const root of roots) {
		if (root.event.author === "user") {
			const first = root.event.timestamp;
			const lastChild = root.children.length
				? root.children[root.children.length - 1].event.timestamp
				: root.event.timestamp;
			const total = lastChild - first;
			root.duration = formatDuration(total > 0 ? total : 1);
			root.rawDuration = total > 0 ? total : 1;
		}
	}

	return roots;
}

function computeDurations(events: Event[]) {
	return events.map((event, i) => {
		const next = events[i + 1];
		const ownDuration = next ? next.timestamp - event.timestamp : 0;
		return {
			...event,
			__durationMs: ownDuration < 0 ? 0 : ownDuration,
		};
	});
}

function formatDuration(ms: number) {
	if (!ms || ms < 1) return "0ms";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

interface Event {
	id: string;
	author: string;
	timestamp: number;
	content?: unknown;
	functionCalls?: unknown;
	functionResponses?: unknown;
	isFinalResponse?: boolean;
	branch?: string;
	requestMetadata?: unknown;
}

export interface TracingPanelProps {
	events: Event[];
	isLoading?: boolean;
	pageSize?: number;
}

interface EventNode {
	event: Event;
	children: EventNode[];
	displayName: string;
	color: string;
	icon: React.ReactNode | null;
	duration: string;
	rawDuration: number;
}

interface ContentParts {
	parts?: Array<{ text?: string }>;
}

interface FunctionCall {
	functionCall: { name: string; args: Record<string, unknown> };
}

interface FunctionResponse {
	functionResponse: { name: string; response: Record<string, unknown> };
}

interface RequestMetadata {
	model?: string;
}
