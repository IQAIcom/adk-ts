"use client";

import { Bot, Circle, MessageSquare, PlayCircle, Wrench } from "lucide-react";
import { useMemo } from "react";
import type { SpanNode, TraceSpan } from "@/hooks/use-traces";
import {
	buildSpanTree,
	flattenTree,
	getGlobalTimes,
	getRelativeStart,
	getRelativeWidth,
	getSpanIcon as getSpanIconName,
} from "@/lib/trace-utils";

interface TraceTreeProps {
	spans: TraceSpan[];
	invocationId?: string;
	onSelectSpan?: (span: TraceSpan) => void;
	selectedSpanId?: string | null;
}

interface FlatNode {
	span: SpanNode;
	level: number;
}

export function TraceTree({
	spans,
	invocationId,
	onSelectSpan,
	selectedSpanId,
}: TraceTreeProps) {
	const { flatTree, baseStartTimeMs, totalDurationMs } = useMemo(() => {
		const roots = buildSpanTree(spans);
		const flat = flattenTree(roots);
		const { start, duration } = getGlobalTimes(spans);

		return {
			flatTree: flat,
			baseStartTimeMs: start,
			totalDurationMs: duration,
		};
	}, [spans]);

	const getIconComponent = (iconName: string) => {
		const iconClass = "w-4 h-4";
		switch (iconName) {
			case "play-circle":
				return <PlayCircle className={`${iconClass} text-blue-500`} />;
			case "bot":
				return <Bot className={`${iconClass} text-green-500`} />;
			case "wrench":
				return <Wrench className={`${iconClass} text-purple-500`} />;
			case "message-square":
				return <MessageSquare className={`${iconClass} text-orange-500`} />;
			default:
				return <Circle className={`${iconClass} text-muted-foreground`} />;
		}
	};

	const handleSelect = (node: FlatNode) => {
		onSelectSpan?.(node.span);
	};

	return (
		<div>
			{invocationId && (
				<div className="mb-2 font-mono font-bold text-sm">
					Invocation ID:{" "}
					<span className="font-normal text-muted-foreground">
						{invocationId}
					</span>
				</div>
			)}

			<div className="w-full font-mono text-xs rounded-lg overflow-x-auto bg-background">
				{flatTree.map((node) => {
					const isSelected = selectedSpanId === node.span.span_id;
					const duration = node.span.duration;

					return (
						<button
							key={node.span.span_id}
							type="button"
							onClick={() => handleSelect(node)}
							className={`flex items-center min-w-max text-left h-9 border-b last:border-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors cursor-pointer ${
								isSelected ? "bg-muted" : "hover:bg-muted-foreground/5"
							}`}
						>
							<div
								className="flex items-center shrink-0 border-r pr-4 h-full"
								style={{ width: 350 }}
							>
								<div
									className="flex items-center"
									style={{ marginLeft: node.level * 10 + 8 }}
								>
									{getIconComponent(getSpanIconName(node.span.name))}
									<span className="truncate ml-2 font-medium">
										{node.span.name}
									</span>
								</div>
							</div>

							<div className="flex-1 relative h-full flex items-center px-2 bg-muted/10 pointer-events-none">
								<div
									className="absolute h-5 bg-blue-500/80 rounded-sm flex items-center justify-center text-[10px] text-white font-bold"
									style={{
										left: `${getRelativeStart(node.span, baseStartTimeMs, totalDurationMs)}%`,
										width: `${Math.max(getRelativeWidth(node.span, totalDurationMs), 0.5)}%`,
									}}
								>
									{getRelativeWidth(node.span, totalDurationMs) > 15 &&
										`${duration.toFixed(1)}ms`}
								</div>

								{getRelativeWidth(node.span, totalDurationMs) <= 15 && (
									<span
										className="absolute text-[10px] text-blue-600 font-semibold"
										style={{
											left: `${getRelativeStart(node.span, baseStartTimeMs, totalDurationMs) + getRelativeWidth(node.span, totalDurationMs) + 1}%`,
										}}
									>
										{duration.toFixed(1)}ms
									</span>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
