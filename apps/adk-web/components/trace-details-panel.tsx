import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonViewer } from "@/components/ui/json-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TraceSpan } from "@/hooks/use-traces";
import {
	getErrorDetails,
	getLlmRequest,
	getLlmResponse,
	getPerformanceMetrics,
	getSystemInstructions,
	getTraceTitle,
} from "@/lib/trace-utils";

interface TraceDetailsPanelProps {
	selectedSpan: TraceSpan;
	onClose: () => void;
}

export function TraceDetailsPanel({
	selectedSpan,
	onClose,
}: TraceDetailsPanelProps) {
	const llmRequest = getLlmRequest(selectedSpan);
	const llmResponse = getLlmResponse(selectedSpan);
	const title = getTraceTitle(selectedSpan);
	const metrics = getPerformanceMetrics(selectedSpan);
	const errorDetails = getErrorDetails(selectedSpan);
	const systemInstructions = getSystemInstructions(selectedSpan);

	return (
		<div className="border-t bg-background z-10 flex flex-col h-1/2 min-h-75 fixed bottom-0 w-[calc(100vw-60px)]">
			<div className="flex items-center justify-between p-2 border-b">
				<div className="flex items-center gap-2 px-2">
					<h3 className="font-semibold text-sm">Trace Details</h3>
					<span className="text-xs text-muted-foreground font-mono">
						{selectedSpan.span_id}
					</span>
					{title && title !== selectedSpan.span_id && (
						<span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
							{title}
						</span>
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="h-8 w-8 p-0"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Error Banner */}
			{errorDetails && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 border-b flex items-start gap-2">
					<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
					<div className="flex-1">
						<div className="font-semibold">
							Error
							{errorDetails.category && (
								<span className="font-normal opacity-80 ml-1">
									({errorDetails.category})
								</span>
							)}
						</div>
						<div className="mt-1 opacity-90">{errorDetails.message}</div>
						{(errorDetails.recoverable || errorDetails.retryRecommended) && (
							<div className="mt-2 text-xs flex gap-2">
								{errorDetails.recoverable && (
									<span className="bg-destructive/20 px-1.5 py-0.5 rounded">
										Recoverable
									</span>
								)}
								{errorDetails.retryRecommended && (
									<span className="bg-destructive/20 px-1.5 py-0.5 rounded">
										Retry Recommended
									</span>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Performance Metrics Bar */}
			{(metrics.inputTokens !== undefined ||
				metrics.outputTokens !== undefined ||
				metrics.ttft !== undefined ||
				metrics.cachedTokens !== undefined) && (
				<div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 text-xs text-muted-foreground overflow-x-auto">
					{metrics.inputTokens !== undefined && (
						<div className="whitespace-nowrap">
							<span className="font-semibold text-foreground">
								{metrics.inputTokens}
							</span>{" "}
							in
						</div>
					)}
					{metrics.outputTokens !== undefined && (
						<div className="whitespace-nowrap">
							<span className="font-semibold text-foreground">
								{metrics.outputTokens}
							</span>{" "}
							out
						</div>
					)}
					{metrics.cachedTokens !== undefined && (
						<div className="whitespace-nowrap">
							<span className="font-semibold text-foreground">
								{metrics.cachedTokens}
							</span>{" "}
							cached
						</div>
					)}
					{metrics.ttft !== undefined && (
						<div className="whitespace-nowrap">
							<span className="font-semibold text-foreground">
								{metrics.ttft.toFixed(0)}ms
							</span>{" "}
							TTFT
						</div>
					)}
					{metrics.contextWindowUsed !== undefined && (
						<div className="whitespace-nowrap">
							<span className="font-semibold text-foreground">
								{(metrics.contextWindowUsed * 100).toFixed(1)}%
							</span>{" "}
							ctx
						</div>
					)}
				</div>
			)}

			<Tabs defaultValue="event" className="flex-1 flex flex-col min-h-0">
				<div className="px-4 pt-2">
					<TabsList className="w-full justify-start h-9 p-0 bg-transparent border-b rounded-none">
						<TabsTrigger
							value="event"
							className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4"
						>
							Event
						</TabsTrigger>
						<TabsTrigger
							value="request"
							className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4"
						>
							Request
						</TabsTrigger>
						<TabsTrigger
							value="response"
							className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4"
						>
							Response
						</TabsTrigger>
						<TabsTrigger
							value="graph"
							className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-4"
						>
							Graph
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="flex-1 overflow-auto bg-(--color-card) p-4">
					<TabsContent value="event" className="m-0 h-full">
						<JsonViewer
							data={selectedSpan}
							defaultExpanded={true}
							className="bg-transparent"
						/>
					</TabsContent>

					<TabsContent value="request" className="m-0 h-full">
						{systemInstructions && (
							<div className="mb-4">
								<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									System Instructions
								</h4>
								<div className="bg-muted/50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">
									{systemInstructions}
								</div>
							</div>
						)}

						{llmRequest ? (
							<JsonViewer
								data={llmRequest}
								defaultExpanded={true}
								className="bg-transparent"
							/>
						) : (
							<div className="text-muted-foreground text-sm p-4">
								Request is not available.
							</div>
						)}
					</TabsContent>

					<TabsContent value="response" className="m-0 h-full">
						{llmResponse ? (
							<JsonViewer
								data={llmResponse}
								defaultExpanded={true}
								className="bg-transparent"
							/>
						) : (
							<div className="text-muted-foreground text-sm p-4">
								Response is not available.
							</div>
						)}
					</TabsContent>

					<TabsContent value="graph" className="m-0 h-full">
						<div className="text-muted-foreground text-sm p-4">
							Graph visualization coming soon.
						</div>
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
