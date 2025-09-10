"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	differenceInDays,
	differenceInHours,
	differenceInMinutes,
	differenceInMonths,
	differenceInSeconds,
	differenceInYears,
} from "date-fns";
import {
	Bot,
	CheckCircle,
	Clock,
	Code,
	MessageSquare,
	User,
} from "lucide-react";

export interface EventLike {
	id: string;
	author: string;
	timestamp: number;
	content: any;
	actions: any;
	functionCalls: any[];
	functionResponses: any[];
	isFinalResponse: boolean;
}

function getEventIcon(event: EventLike) {
	if (event.functionCalls.length > 0)
		return <Clock className="h-4 w-4 text-blue-500" />;
	if (event.functionResponses.length > 0)
		return <CheckCircle className="h-4 w-4 text-green-500" />;
	if (event.isFinalResponse)
		return <MessageSquare className="h-4 w-4 text-purple-500" />;
	if (event.content?.parts?.some((p: any) => p.codeExecutionResult))
		return <Code className="h-4 w-4 text-orange-500" />;
	return <MessageSquare className="h-4 w-4 text-gray-500" />;
}

function getEventTypeLabel(event: EventLike) {
	if (event.functionCalls.length > 0) return "Function Call";
	if (event.functionResponses.length > 0) return "Function Response";
	if (event.isFinalResponse) return "Final Response";
	if (event.content?.parts?.some((p: any) => p.codeExecutionResult))
		return "Code Execution";
	return "Message";
}

function getEventSummary(event: EventLike) {
	if (event.functionCalls.length > 0) {
		const call = event.functionCalls[0].functionCall;
		return `${call.name}(${call.args ? Object.keys(call.args).join(", ") : ""})`;
	}
	if (event.functionResponses.length > 0)
		return `Response from ${event.functionResponses.length} function(s)`;
	if (event.content?.parts?.[0]?.text) return event.content.parts[0].text;
	return "Event content";
}

function formatCompactDistanceToNow(date: Date) {
	const now = new Date();
	const secs = differenceInSeconds(now, date);
	if (secs < 60) return `${secs}s ago`;

	const mins = differenceInMinutes(now, date);
	if (mins < 60) return `${mins} min ago`;

	const hrs = differenceInHours(now, date);
	if (hrs < 24) return `${hrs} hr ago`;

	const days = differenceInDays(now, date);
	if (days < 30) return `${days} d ago`;

	const months = differenceInMonths(now, date);
	if (months < 12) return `${months} mo ago`;

	const years = differenceInYears(now, date);
	return `${years} yr ago`;
}

interface EventCardProps {
	event: EventLike;
	onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
	return (
		<Card
			className="transition-colors hover:bg-muted/50 cursor-pointer"
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								<div className="flex-shrink-0 mr-1">{getEventIcon(event)}</div>
								{getEventTypeLabel(event)}
							</Badge>
						</div>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							{formatCompactDistanceToNow(new Date(event.timestamp * 1000))}
						</div>
					</div>

					<div className="flex items-center gap-2">
						{event.author === "user" ? (
							<User className="h-3 w-3 text-blue-500" />
						) : (
							<Bot className="h-3 w-3 text-green-500" />
						)}
						<CardTitle className="text-sm font-medium">
							{event.author}
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<CardDescription className="text-sm text-muted-foreground line-clamp-2 break-words">
					{getEventSummary(event)}
				</CardDescription>
			</CardContent>
		</Card>
	);
}

export default EventCard;
