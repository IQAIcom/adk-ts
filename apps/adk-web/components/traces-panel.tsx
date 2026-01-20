"use client";

import { Activity } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import type { TraceSpan } from "@/hooks/use-traces";
import { findInvocId, findUserMessage } from "@/lib/trace-utils";
import { TraceTree } from "./traces-tree";

interface TracesPanelProps {
	tracesByTraceId: Map<string, TraceSpan[]>;
	isLoading?: boolean;
}

export function TracesPanel({
	tracesByTraceId,
	isLoading = false,
}: TracesPanelProps) {
	console.log("tracesByTraceId", tracesByTraceId);
	return (
		<div className="flex flex-col h-full bg-background p-4">
			{isLoading ? (
				<div className="text-center text-muted-foreground py-8">
					Loading traces...
				</div>
			) : tracesByTraceId.size === 0 ? (
				<div className="text-center text-muted-foreground py-8">
					<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p className="text-sm">No traces found</p>
					<p className="text-xs">
						Traces will appear here once your agent runs
					</p>
				</div>
			) : (
				<Accordion type="single" collapsible className="space-y-2 w-full">
					{Array.from(tracesByTraceId.entries()).map(([traceId, spans]) => {
						const invocId = findInvocId(spans);
						const userMessage = findUserMessage(spans);

						return (
							<AccordionItem
								key={traceId}
								value={traceId}
								className="border rounded-md bg-surface"
							>
								<AccordionTrigger className="w-full px-4 py-3 flex justify-between items-center font-medium text-left hover:bg-muted-foreground/5">
									<div className="flex items-center gap-2">
										<Activity className="h-4 w-4" />
										<span className="truncate">
											{userMessage || invocId || traceId.slice(0, 8)}
										</span>
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-0 pb-2 pt-0">
									<TraceTree spans={spans} />
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			)}
		</div>
	);
}
