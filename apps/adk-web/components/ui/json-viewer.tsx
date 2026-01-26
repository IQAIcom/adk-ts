"use client";

import {
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Copy,
	MoreHorizontal,
} from "lucide-react";
import * as React from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type JsonViewerProps = {
	data: any;
	rootName?: string;
	defaultExpanded?: boolean;
	className?: string;
};

export function JsonViewer({
	data,
	rootName = "root",
	defaultExpanded = true,
	className,
}: JsonViewerProps) {
	return (
		<TooltipProvider>
			<div className={cn("font-mono text-sm", className)}>
				<JsonNode
					name={rootName}
					data={data}
					isRoot={true}
					defaultExpanded={defaultExpanded}
				/>
			</div>
		</TooltipProvider>
	);
}

type JsonNodeProps = {
	name: string;
	data: any;
	isRoot?: boolean;
	defaultExpanded?: boolean;
	level?: number;
};

function JsonNode({
	name,
	data,
	isRoot = false,
	defaultExpanded = true,
	level = 0,
}: JsonNodeProps) {
	const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
	const [isCopied, setIsCopied] = React.useState(false);

	const handleToggle = () => {
		setIsExpanded(!isExpanded);
	};

	const copyToClipboard = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(JSON.stringify(data, null, 2));
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const dataType =
		data === null ? "null" : Array.isArray(data) ? "array" : typeof data;
	const isExpandable =
		data !== null &&
		data !== undefined &&
		!(data instanceof Date) &&
		(dataType === "object" || dataType === "array");
	const itemCount =
		isExpandable && data !== null && data !== undefined
			? Object.keys(data).length
			: 0;

	return (
		<div
			className={cn("pl-4 group/object", level > 0 && "border-l border-border")}
		>
			<div className="flex items-center gap-1 py-1 -ml-4 group/property w-full">
				{isExpandable ? (
					<button
						type="button"
						onClick={handleToggle}
						className={cn(
							"flex items-center gap-1 hover:bg-muted/50 rounded px-1 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 min-w-0",
							isRoot && "text-primary font-semibold",
						)}
					>
						<div className="w-4 h-4 flex items-center justify-center shrink-0">
							{isExpanded ? (
								<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
							) : (
								<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
							)}
						</div>

						<span className="text-primary shrink-0">{name}</span>

						<span className="text-muted-foreground shrink-0">
							{dataType === "array" ? "[" : "{"}
							{!isExpanded && (
								<span className="text-muted-foreground">
									{" "}
									{itemCount} {itemCount === 1 ? "item" : "items"}{" "}
									{dataType === "array" ? "]" : "}"}
								</span>
							)}
						</span>
					</button>
				) : (
					<div
						className={cn(
							"flex items-center gap-1 rounded px-1 flex-1 min-w-0",
							isRoot && "text-primary font-semibold",
						)}
					>
						<div className="w-4 shrink-0" />

						<span className="text-primary shrink-0">{name}</span>

						<span className="text-muted-foreground shrink-0">:</span>

						<JsonValue data={data} />

						<div className="w-3.5 shrink-0" />
					</div>
				)}

				<button
					type="button"
					onClick={copyToClipboard}
					className="ml-auto opacity-0 group-hover/property:opacity-100 hover:bg-muted p-1 rounded transition-opacity shrink-0 outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
					title="Copy to clipboard"
				>
					{isCopied ? (
						<Check className="h-3.5 w-3.5 text-green-500" />
					) : (
						<Copy className="h-3.5 w-3.5 text-muted-foreground" />
					)}
				</button>
			</div>

			{isExpandable && isExpanded && data !== null && data !== undefined && (
				<div className="pl-4">
					{Object.keys(data).map((key) => (
						<JsonNode
							key={key}
							name={dataType === "array" ? `${key}` : key}
							data={data[key]}
							level={level + 1}
							defaultExpanded={level < 1}
						/>
					))}
					<div className="text-muted-foreground pl-4 py-1">
						{dataType === "array" ? "]" : "}"}
					</div>
				</div>
			)}
		</div>
	);
}

function JsonValue({ data }: { data: any }) {
	const [isExpanded, setIsExpanded] = React.useState(false);
	const dataType = typeof data;
	const TEXT_LIMIT = 80; // Character limit before truncation

	if (data === null) {
		return <span className="text-destructive">null</span>;
	}

	if (data === undefined) {
		return <span className="text-muted-foreground">undefined</span>;
	}

	if (data instanceof Date) {
		return (
			<span className="text-[hsl(var(--chart-3))]">{data.toISOString()}</span>
		);
	}

	switch (dataType) {
		case "string":
			if (data.length > TEXT_LIMIT) {
				return (
					<button
						type="button"
						className="text-[hsl(var(--chart-2))] flex-1 flex items-center relative group cursor-pointer text-left outline-none"
						onClick={(e) => {
							e.stopPropagation();
							setIsExpanded(!isExpanded);
						}}
					>
						{`"`}
						{isExpanded ? (
							<span className="inline-block max-w-full break-all whitespace-pre-wrap">
								{data}
							</span>
						) : (
							<Tooltip delayDuration={300}>
								<TooltipTrigger asChild>
									<span className="inline-block max-w-full">
										{data.substring(0, TEXT_LIMIT)}...
									</span>
								</TooltipTrigger>
								<TooltipContent
									side="bottom"
									className="max-w-md text-xs p-2 wrap-break-word"
								>
									{data}
								</TooltipContent>
							</Tooltip>
						)}
						{`"`}
						<div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+4px)] opacity-0 group-hover:opacity-100 transition-opacity">
							{isExpanded ? (
								<ChevronUp className="h-3 w-3 text-muted-foreground" />
							) : (
								<MoreHorizontal className="h-3 w-3 text-muted-foreground" />
							)}
						</div>
					</button>
				);
			}
			return <span className="text-[hsl(var(--chart-2))]">{`"${data}"`}</span>;
		case "number":
			return <span className="text-[hsl(var(--chart-5))]">{data}</span>;
		case "boolean":
			return (
				<span className="text-[hsl(var(--chart-4))]">{data.toString()}</span>
			);
		default:
			return <span>{String(data)}</span>;
	}
}
