"use client";

import { Activity, Bot, CheckCircle, User, Wrench } from "lucide-react";
import { EventItemDto as Event } from "@/Api";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface TracingPanelProps {
	events: Event[];
	isLoading?: boolean;
}

interface EventNode {
	event: Event;
	children: EventNode[];
}

export function TracingPanel({ events, isLoading = false }: TracingPanelProps) {
	if (isLoading)
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				Loading traces…
			</div>
		);
	if (!events || events.length === 0)
		return (
			<div className="text-center text-muted-foreground py-12 text-sm">
				No trace data
			</div>
		);

	const rootNodes = buildEventTree(events);

	return (
		<div className="min-h-screen text-slate-100 p-6 px-2">
			<div className="max-w-4xl mx-auto">
				<ScrollArea className="max-h-[80vh]">
					<div className="space-y-4">
						{rootNodes.map((node) => (
							<TimelineNode key={node.event.id} node={node} depth={0} />
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}

function buildEventTree(events: Event[]): EventNode[] {
	const roots: EventNode[] = [];
	let currentRoot: EventNode | null = null;

	for (const event of events) {
		const node: EventNode = { event, children: [] };

		if (event.author === "user") {
			roots.push(node);
			currentRoot = node;
		} else if (currentRoot) {
			insertNode(currentRoot, node);
		} else {
			roots.push(node);
			currentRoot = node;
		}
	}

	return roots;
}

function insertNode(parent: EventNode, node: EventNode) {
	if (!node.event.branch || !parent.event.branch) {
		parent.children.push(node);
		return;
	}

	const parentDepth = parent.event.branch.split(".").length;
	const nodeDepth = node.event.branch.split(".").length;

	if (nodeDepth === parentDepth + 1) {
		parent.children.push(node);
	} else if (parent.children.length > 0) {
		insertNode(parent.children[parent.children.length - 1], node);
	} else {
		parent.children.push(node);
	}
}

function TimelineNode({ node, depth }: { node: EventNode; depth: number }) {
	const contentWithParts = node.event.content as ContentParts;

	const hasDetails =
		node.event.author === "user" ||
		node.event.functionCalls?.length > 0 ||
		node.event.functionResponses?.length > 0 ||
		(node.event.isFinalResponse && contentWithParts?.parts?.[0]?.text);

	const duration =
		depth > 0 &&
		node.event.timestamp &&
		node.event.timestamp &&
		node.event.timestamp
			? formatDuration(node.event.timestamp - node.event.timestamp)
			: "0ms";

	return (
		<div className="relative">
			<div
				className="flex items-start gap-3"
				style={{ paddingLeft: depth * 24 }}
			>
				<TimelineDot event={node.event} />
				<div className="flex-1 min-w-0">
					{hasDetails ? (
						<Collapsible defaultOpen={false}>
							<CollapsibleTrigger asChild>
								<div className="cursor-pointer">
									<EventContent event={node.event} duration={duration} />
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
						<EventContent event={node.event} duration={duration} />
					)}
				</div>
			</div>
		</div>
	);
}

const TimelineDot = ({ event }: { event: Event }) => {
	const eventColor = getEventColor(event);
	const eventIcon = getEventIcon(event);

	return (
		<div
			className={cn(
				"flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
				event.author === "user" ? "bg-blue-500/20" : "bg-slate-700",
				eventColor,
			)}
		>
			{eventIcon}
		</div>
	);
};

const EventContent = ({
	event,
	duration,
}: {
	event: Event;
	duration: string;
}) => {
	const requestMetadataObj = event.requestMetadata as RequestMetadata | null;

	return (
		<div className="flex items-center gap-2 hover:bg-slate-800/30 rounded p-1 -ml-1">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className={`font-mono text-sm ${getEventColor(event)}`}>
						{getEventName(event)}
					</span>
					{event.branch && event.author !== "user" && (
						<span className="text-xs text-slate-500 font-mono">
							[{event.author}]
						</span>
					)}
				</div>
				<div className="text-xs text-slate-500 mt-0.5">{duration}</div>
			</div>
			{requestMetadataObj?.model && (
				<div className="text-xs text-slate-600 font-mono">
					{requestMetadataObj.model.split("-").slice(-1)[0]}
				</div>
			)}
		</div>
	);
};

const getEventName = (event: Event) => {
	const contentWithParts = event.content as ContentParts;
	const functionCallsArray = event.functionCalls as FunctionCall[];
	const functionResponsesArray = event.functionResponses as FunctionResponse[];

	if (event.author === "user") {
		const text = contentWithParts?.parts?.[0]?.text || "";
		return text.length > 40 ? `${text.substring(0, 40)}...` : text;
	}
	if (functionCallsArray?.length > 0)
		return functionCallsArray[0].functionCall.name;
	if (functionResponsesArray?.length > 0)
		return `${functionResponsesArray[0].functionResponse.name}-response`;
	if (event.isFinalResponse) return "final-answer";
	return event.author;
};

const getEventIcon = (event: Event) => {
	if (event.author === "user") return <User className="w-4 h-4" />;
	if (event.functionCalls?.length > 0) return <Wrench className="w-4 h-4" />;
	if (event.functionResponses?.length > 0)
		return <Activity className="w-4 h-4" />;
	if (event.isFinalResponse) return <CheckCircle className="w-4 h-4" />;
	return <Bot className="w-4 h-4" />;
};

const getEventColor = (event: Event) => {
	if (event.author === "user") return "text-blue-400";
	if (event.functionCalls?.length > 0) return "text-orange-400";
	if (event.functionResponses?.length > 0) return "text-purple-400";
	if (event.isFinalResponse) return "text-green-400";
	return "text-gray-400";
};

const formatDuration = (ms: number) =>
	ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;

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
