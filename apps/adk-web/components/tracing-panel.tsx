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
	displayName: string;
	color: string;
	icon: React.ReactNode;
	duration: string;
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

function TimelineNode({ node, depth }: { node: EventNode; depth: number }) {
	const contentWithParts = node.event.content as ContentParts;

	const hasDetails =
		node.event.author === "user" ||
		node.event.functionCalls?.length > 0 ||
		node.event.functionResponses?.length > 0 ||
		(node.event.isFinalResponse && contentWithParts?.parts?.[0]?.text);

	return (
		<div className="relative">
			<div
				className="flex items-start gap-3"
				style={{ paddingLeft: depth * 24 }}
			>
				<TimelineDot node={node} />
				<div className="flex-1 min-w-0">
					{hasDetails ? (
						<Collapsible defaultOpen={false}>
							<CollapsibleTrigger asChild>
								<div className="cursor-pointer">
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
						<EventContent node={node} />
					)}
				</div>
			</div>
		</div>
	);
}

const TimelineDot = ({ node }: { node: EventNode }) => (
	<div
		className={cn(
			"flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
			node.event.author === "user" ? "bg-blue-500/20" : "bg-slate-700",
			node.color,
		)}
	>
		{node.icon}
	</div>
);

const EventContent = ({ node }: { node: EventNode }) => {
	const requestMetadataObj = node.event
		.requestMetadata as RequestMetadata | null;

	return (
		<div className="flex items-center gap-2 hover:bg-slate-800/30 rounded p-1 -ml-1">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span
						className={`font-mono text-sm ${node.color}`}
						title={node.displayName}
					>
						{node.displayName.length > 60
							? `${node.displayName.substring(0, 60)}...`
							: node.displayName}
					</span>
					{node.event.branch && node.event.author !== "user" && (
						<span className="text-xs text-slate-500 font-mono">
							[{node.event.author}]
						</span>
					)}
				</div>
				<div className="text-xs text-slate-500 mt-0.5">{node.duration}</div>
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

function buildEventTree(events: Event[]): EventNode[] {
	const nodeMap = new Map<string, EventNode>();
	const roots: EventNode[] = [];

	for (const event of events) {
		const node: EventNode = {
			event,
			children: [],
			displayName: getEventName(event),
			color: getEventColor(event),
			icon: getEventIcon(event),
			duration: computeDuration(event),
		};

		nodeMap.set(event.branch || event.id, node);

		if (!event.branch || event.author === "user") {
			roots.push(node);
		} else {
			const parentBranch = event.branch.split(".").slice(0, -1).join(".");
			const parent = nodeMap.get(parentBranch);
			if (parent) parent.children.push(node);
			else roots.push(node);
		}
	}

	return roots;
}

function computeDuration(event: Event) {
	if (event.timestamp && event.timestamp) {
		const ms = event.timestamp - event.timestamp;
		return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
	}
	return "0ms";
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
