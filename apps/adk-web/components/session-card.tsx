"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Clock, Trash2 } from "lucide-react";

export interface SessionLike {
	id: string;
	state?: Record<string, any>;
	eventCount: number;
	lastUpdateTime: number;
	createdAt: number;
}

interface SessionCardProps {
	session: SessionLike;
	active?: boolean;
	onClick?: () => void;
	onDelete?: () => void;
}

export function SessionCard({
	session,
	active,
	onClick,
	onDelete,
}: SessionCardProps) {
	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete?.();
	};

	return (
		<Card
			className={cn(
				"transition-colors hover:bg-muted/50 cursor-pointer",
				active && "bg-primary/5 border-primary/20 border-l-primary border-l-4",
			)}
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<div className="flex justify-between items-center">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-sm font-mono overflow-hidden break-words">
							<div className="line-clamp-2">{session.id}</div>
						</CardTitle>
						<div className="flex items-center gap-2 mt-1">
							<Badge variant="outline" className="text-xs">
								{session.eventCount} events
							</Badge>
						</div>
					</div>
					{onDelete && (
						<CardAction>
							<button
								type="button"
								onClick={handleDelete}
								className="p-1 rounded hover:bg-muted"
								aria-label="Delete session"
							>
								<Trash2 className="h-4 w-4 text-muted-foreground" />
							</button>
						</CardAction>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="flex flex-row justify-between">
					<div className="flex items-center gap-1 text-xs">
						<Clock className="h-3 w-3" />
						<span>
							Created{" "}
							{formatDistanceToNow(new Date(session.createdAt * 1000), {
								addSuffix: true,
							})}
						</span>
					</div>
				</div>
				{session.state && Object.keys(session.state).length > 0 && (
					<div className="mt-2">
						<p className="text-xs font-medium mb-1">State:</p>
						<pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
							{JSON.stringify(session.state, null, 2)}
						</pre>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default SessionCard;
