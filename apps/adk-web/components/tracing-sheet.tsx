import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export function TraceDetailSheet({
	open,
	onOpenChange,
	eventData,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	node: TraceItem;
	eventData?: Event;
}) {
	if (!eventData) return null;

	const content = eventData.content;
	const hasRequestMetadata = "requestMetadata" in eventData;
	const hasResponseMetadata = "responseMetadata" in eventData;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="overflow-hidden">
				<SheetHeader>
					<SheetTitle>Tracing</SheetTitle>
				</SheetHeader>

				<Tabs defaultValue="event" className="h-full flex flex-col">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="event">Event</TabsTrigger>
						<TabsTrigger value="request">Request</TabsTrigger>
						<TabsTrigger value="response">Response</TabsTrigger>
					</TabsList>

					<TabsContent value="event" className="flex-1 overflow-auto">
						<ScrollArea className="h-full">
							<div className="p-4 pb-36">
								<JsonTreeView data={eventData} />
							</div>
						</ScrollArea>
					</TabsContent>

					<TabsContent value="request" className="flex-1 overflow-auto">
						<ScrollArea className="h-full">
							<div className="p-4 pb-36">
								{hasRequestMetadata ? (
									<JsonTreeView data={eventData.requestMetadata} />
								) : content && typeof content === "object" ? (
									<JsonTreeView
										data={{
											model:
												(content as Record<string, unknown>).model ||
												(
													(content as Record<string, unknown>).config as
														| Record<string, unknown>
														| undefined
												)?.model,
											config: (content as Record<string, unknown>).config,
											tools: (content as Record<string, unknown>).tools,
											contents: (content as Record<string, unknown>).contents,
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
							<div className="p-4 pb-36">
								{hasResponseMetadata ? (
									<JsonTreeView data={eventData.responseMetadata} />
								) : content && typeof content === "object" ? (
									<JsonTreeView
										data={{
											content: (content as Record<string, unknown>).content,
											finishReason: (content as Record<string, unknown>)
												.finishReason,
											usageMetadata: (content as Record<string, unknown>)
												.usageMetadata,
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

export function JsonTreeView({
	data,
	level = 0,
}: {
	data: unknown;
	level?: number;
}) {
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const toggleCollapse = (key: string) => {
		setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	if (data === null)
		return <span className="text-slate-500 italic text-sm">null</span>;
	if (data === undefined)
		return <span className="text-slate-500 italic text-sm">undefined</span>;

	if (typeof data !== "object") {
		return (
			<span
				className={cn(
					"font-mono text-sm",
					typeof data === "string" && "text-emerald-600 dark:text-emerald-400",
					typeof data === "number" && "text-blue-600 dark:text-blue-400",
					typeof data === "boolean" && "text-amber-600 dark:text-amber-400",
				)}
			>
				{typeof data === "string" ? `"${data}"` : String(data)}
			</span>
		);
	}

	if (Array.isArray(data)) {
		if (data.length === 0)
			return <span className="text-slate-500 font-mono text-sm">[]</span>;

		return (
			<div className="space-y-1">
				<span className="text-slate-600 dark:text-slate-400 font-mono text-sm font-semibold">
					[
				</span>
				{data.map((item, index) => (
					<div
						key={`item-${index + 1}`}
						className="ml-3 flex items-start gap-2 py-0.5 pl-2 border-l border-slate-300 dark:border-slate-600"
					>
						<span className="text-slate-500 font-mono text-xs font-medium min-w-[20px] mt-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
							{index}
						</span>
						<div className="flex-1 min-w-0">
							<JsonTreeView data={item} level={level + 1} />
						</div>
					</div>
				))}
				<span className="text-slate-600 dark:text-slate-400 font-mono text-sm font-semibold">
					]
				</span>
			</div>
		);
	}

	const dataRecord = data as Record<string, unknown>;
	const keys = Object.keys(dataRecord);
	if (keys.length === 0)
		return <span className="text-slate-500 font-mono text-sm">{"{}"}</span>;

	return (
		<div className="space-y-1">
			{level === 0 && (
				<span className="text-slate-600 dark:text-slate-400 font-mono text-sm font-semibold">
					{"{"}
				</span>
			)}
			{keys.map((key) => {
				const value = dataRecord[key];
				const isExpandable =
					value !== null &&
					value !== undefined &&
					typeof value === "object" &&
					Object.keys(value).length > 0;
				const isCollapsed = collapsed[key];

				return (
					<div key={key} className="group">
						<div className="flex items-start gap-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-md px-2 -mx-2 transition-all duration-150">
							<div className="flex items-center gap-2 min-w-0 flex-1">
								{isExpandable ? (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => toggleCollapse(key)}
										className="h-5 w-5 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-150 rounded flex-shrink-0"
									>
										{isCollapsed ? (
											<ChevronRight className="w-3.5 h-3.5" />
										) : (
											<ChevronDown className="w-3.5 h-3.5" />
										)}
									</Button>
								) : (
									<span className="w-5 flex-shrink-0" />
								)}
								<span className="text-slate-700 dark:text-slate-300 font-mono text-sm font-semibold truncate">
									{key}
								</span>
								<span className="text-slate-400 dark:text-slate-500 flex-shrink-0 font-mono">
									:
								</span>
								{isCollapsed && isExpandable && (
									<span className="text-slate-500 text-xs font-mono italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
										{Array.isArray(value)
											? `Array[${(value as unknown[]).length}]`
											: "Object"}
									</span>
								)}
								{!isCollapsed && !isExpandable && (
									<div className="flex-1 min-w-0">
										<JsonTreeView data={value} level={level + 1} />
									</div>
								)}
							</div>
						</div>
						{!isCollapsed && isExpandable && (
							<div className="ml-5 mt-0.5 pl-2 border-l border-slate-300 dark:border-slate-600">
								<JsonTreeView data={value} level={level + 1} />
							</div>
						)}
					</div>
				);
			})}
			{level === 0 && (
				<span className="text-slate-600 dark:text-slate-400 font-mono text-sm font-semibold">
					{"}"}
				</span>
			)}
		</div>
	);
}

export interface TraceItem {
	id: string;
	type: "message" | "llm_call" | "tool_call" | "tool_response";
	author?: string;
	timestamp: number;
	duration?: number;
	children?: TraceItem[];
}
