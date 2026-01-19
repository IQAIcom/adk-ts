"use client";

import {
	Activity,
	Bot,
	ChevronDown,
	ChevronRight,
	MessageSquare,
	PlayCircle,
	Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpanNode, TraceSpan } from "@/hooks/use-traces";
import { buildSpanTree, getSpanIcon } from "@/lib/trace-utils";
import { cn } from "@/lib/utils";

interface TraceDetailsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	spans: TraceSpan[];
	traceId?: string;
}

export function TraceDetailsDialog({
	open,
	onOpenChange,
	spans,
	traceId,
}: TraceDetailsDialogProps) {
	const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

	const tree = useMemo(() => buildSpanTree(spans), [spans]);

	const selectedSpan = useMemo(
		() => spans.find((s) => s.span_id === selectedSpanId) || spans[0],
		[spans, selectedSpanId],
	);

	// Auto-select first span if none selected
	if (!selectedSpanId && spans.length > 0 && open) {
		setSelectedSpanId(spans[0].span_id);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-6xl h-[80vh] flex flex-col p-0 gap-0">
				<DialogHeader className="p-4 border-b shrink-0">
					<DialogTitle>
						Trace Details {traceId && `- ${traceId.slice(0, 8)}`}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-1 min-h-0">
					{/* Left Sidebar: Span Tree */}
					<div className="w-1/3 border-r bg-muted/10 flex flex-col min-h-0">
						<div className="p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground shrink-0">
							Spans ({spans.length})
						</div>
						<div className="flex-1 overflow-y-auto">
							<div className="p-2">
								{tree.map((node) => (
									<SpanTreeItem
										key={node.span_id}
										node={node}
										selectedSpanId={selectedSpanId}
										onSelect={setSelectedSpanId}
									/>
								))}
							</div>
						</div>
					</div>

					{/* Right Content: Tabs */}
					<div className="flex-1 flex flex-col min-h-0 min-w-0">
						{selectedSpan ? (
							<SpanDetails span={selectedSpan} />
						) : (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								Select a span to view details
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function SpanTreeItem({
	node,
	selectedSpanId,
	onSelect,
}: {
	node: SpanNode;
	selectedSpanId: string | null;
	onSelect: (id: string) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const isSelected = selectedSpanId === node.span_id;
	const hasChildren = node.children.length > 0;

	const Icon = getIconComponent(getSpanIcon(node.name));

	return (
		<div className="text-sm">
			<Button
				variant="ghost"
				className={cn(
					"flex items-center py-1 px-2 rounded-sm w-full text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
					isSelected && "bg-muted font-medium",
				)}
				style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
				onClick={() => onSelect(node.span_id)}
			>
				{hasChildren && (
					<Button
						variant="ghost"
						type="button"
						className="w-4 h-4 flex items-center justify-center mr-1 shrink-0 p-0 rounded focus:outline-none focus:ring-2 focus:ring-ring"
						onClick={(e) => {
							e.stopPropagation();
							setExpanded(!expanded);
						}}
					>
						{expanded ? (
							<ChevronDown className="h-3 w-3" />
						) : (
							<ChevronRight className="h-3 w-3" />
						)}
					</Button>
				)}
				<Icon className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
				<span className="truncate">{node.name}</span>
				<span className="ml-auto text-xs text-muted-foreground tabular-nums">
					{node.duration.toFixed(2)}ms
				</span>
			</Button>

			{expanded && hasChildren && (
				<div>
					{node.children.map((child) => (
						<SpanTreeItem
							key={child.span_id}
							node={child}
							selectedSpanId={selectedSpanId}
							onSelect={onSelect}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function SpanDetails({ span }: { span: TraceSpan }) {
	const attributes = span.attributes || {};

	console.log("attributes", attributes);

	const llmRequest = attributes["adk.llm_request"];
	const llmResponse = attributes["adk.llm_response"];
	const eventId = attributes["gcp.vertex.agent.event_id"];

	const parseJson = (str: string | undefined) => {
		if (!str) return null;
		try {
			return JSON.parse(str);
		} catch {
			return str;
		}
	};

	const requestData = parseJson(llmRequest as string);
	const responseData = parseJson(llmResponse as string);

	const eventData = {
		...span,
		attributes,
	};

	return (
		<div className="flex flex-col h-full min-h-0">
			<Tabs defaultValue="event" className="flex-1 min-h-0">
				<div className="border-b px-4 shrink-0">
					<TabsList className="my-2">
						<TabsTrigger value="event">Event</TabsTrigger>
						<TabsTrigger value="request" disabled={!requestData}>
							Request
						</TabsTrigger>
						<TabsTrigger value="response" disabled={!responseData}>
							Response
						</TabsTrigger>
						<TabsTrigger value="graph" disabled={!eventId}>
							Graph
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="event" className="h-full m-0 overflow-y-auto">
					<div className="p-4">
						<JsonViewer data={eventData} />
					</div>
				</TabsContent>

				<TabsContent value="request" className="h-full m-0 overflow-y-auto">
					<div className="p-4">
						{requestData ? (
							<JsonViewer data={requestData} />
						) : (
							<div className="text-muted-foreground">
								No request data available
							</div>
						)}
					</div>
				</TabsContent>

				<TabsContent value="response" className="h-full m-0 overflow-y-auto">
					<div className="p-4">
						{responseData ? (
							<JsonViewer data={responseData} />
						) : (
							<div className="text-muted-foreground">
								No response data available
							</div>
						)}
					</div>
				</TabsContent>

				<TabsContent value="graph" className="h-full m-0 overflow-y-auto">
					<div className="h-full flex items-center justify-center flex-col gap-4 p-8 text-center">
						<div className="p-4 rounded-full bg-muted">
							<Activity className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="space-y-2">
							<h3 className="font-semibold">Graph Visualization</h3>
							<p className="text-sm text-muted-foreground max-w-sm">
								Event ID: {eventId as string}
							</p>
							<p className="text-sm text-muted-foreground">
								Graph rendering is currently not implemented in this view.
							</p>
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function JsonViewer({ data }: { data: any }) {
	return (
		<SyntaxHighlighter
			language="json"
			style={vscDarkPlus}
			customStyle={{ margin: 0, borderRadius: "0.5rem", fontSize: "12px" }}
			wrapLongLines={true}
		>
			{JSON.stringify(data, null, 2)}
		</SyntaxHighlighter>
	);
}

function getIconComponent(iconName: string) {
	switch (iconName) {
		case "play-circle":
			return PlayCircle;
		case "bot":
			return Bot;
		case "wrench":
			return Wrench;
		case "message-square":
			return MessageSquare;
		default:
			return Activity;
	}
}
