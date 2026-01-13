"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TraceSpan } from "@/hooks/use-traces";
import { findInvocId } from "@/lib/trace-utils";

import { TraceDetailsDialog } from "./trace-details-dialog";

interface TracesPanelProps {
	tracesByTraceId: Map<string, TraceSpan[]>;
	isLoading?: boolean;
}

export function TracesPanel({
	tracesByTraceId,
	isLoading = false,
}: TracesPanelProps) {
	const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleTraceClick = (traceId: string) => {
		setSelectedTraceId(traceId);
		setIsDialogOpen(true);
	};

	const selectedSpans = selectedTraceId
		? tracesByTraceId.get(selectedTraceId) || []
		: [];

	return (
		<>
			<div className="h-full flex flex-col bg-background">
				<ScrollArea className="flex-1">
					<div className="p-4 space-y-2">
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
							Array.from(tracesByTraceId.entries()).map(([traceId, spans]) => {
								const invocId = findInvocId(spans);
								const spanCount = spans.length;

								return (
									<Button
										key={traceId}
										variant="outline"
										className="w-full justify-start h-auto py-3 px-4"
										onClick={() => handleTraceClick(traceId)}
									>
										<div className="flex flex-col items-start gap-1 w-full">
											<div className="flex items-center gap-2">
												<Activity className="h-4 w-4" />
												<span className="font-semibold text-sm">
													{invocId || traceId.slice(0, 8)}
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{spanCount} span{spanCount !== 1 ? "s" : ""}
											</div>
										</div>
									</Button>
								);
							})
						)}
					</div>
				</ScrollArea>
			</div>

			<TraceDetailsDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				spans={selectedSpans}
				traceId={selectedTraceId || undefined}
			/>
		</>
	);
}
