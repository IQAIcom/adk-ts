import { X } from "lucide-react";
import ReactJson from "react-json-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TraceSpan } from "@/hooks/use-traces";
import { jsonViewTheme } from "@/lib/json-view-theme";
import { getLlmRequest, getLlmResponse } from "@/lib/trace-utils";

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

	return (
		<div className="border-t bg-background z-10 flex flex-col h-1/2 min-h-75 fixed bottom-0 w-screen">
			<div className="flex items-center justify-between p-2 border-b">
				<div className="flex items-center gap-2 px-2">
					<h3 className="font-semibold text-sm">Trace Details</h3>
					<span className="text-xs text-muted-foreground font-mono">
						{selectedSpan.span_id}
					</span>
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
						<ReactJson
							src={selectedSpan}
							theme={jsonViewTheme}
							name={false}
							collapsed={1}
							enableClipboard={false}
							displayDataTypes={false}
							displayObjectSize={false}
							indentWidth={2}
							style={{
								fontFamily: "var(--font-mono)",
								fontSize: "0.875rem",
								backgroundColor: "transparent",
							}}
						/>
					</TabsContent>

					<TabsContent value="request" className="m-0 h-full">
						{llmRequest ? (
							<ReactJson
								src={llmRequest}
								theme={jsonViewTheme}
								name={false}
								collapsed={1}
								enableClipboard={false}
								displayDataTypes={false}
								displayObjectSize={false}
								indentWidth={2}
								style={{
									fontFamily: "var(--font-mono)",
									fontSize: "0.875rem",
									backgroundColor: "transparent",
								}}
							/>
						) : (
							<div className="text-muted-foreground text-sm p-4">
								Request is not available.
							</div>
						)}
					</TabsContent>

					<TabsContent value="response" className="m-0 h-full">
						{llmResponse ? (
							<ReactJson
								src={llmResponse}
								theme={jsonViewTheme}
								name={false}
								collapsed={1}
								enableClipboard={false}
								displayDataTypes={false}
								displayObjectSize={false}
								indentWidth={2}
								style={{
									fontFamily: "var(--font-mono)",
									fontSize: "0.875rem",
									backgroundColor: "transparent",
								}}
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
