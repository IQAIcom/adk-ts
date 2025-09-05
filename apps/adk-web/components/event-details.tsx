"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import {
	Bot,
	CheckCircle,
	Clock,
	Code,
	MessageSquare,
	User,
	X,
} from "lucide-react";

interface EventLike {
	id: string;
	author: string;
	timestamp: number;
	content: any;
	actions: any;
	functionCalls: any[];
	functionResponses: any[];
	branch?: string;
	isFinalResponse: boolean;
}

interface EventDetailsProps {
	event: EventLike;
	onClose: () => void;
	hideHeader?: boolean;
}

function getEventIcon(event: EventLike) {
	if (event.functionCalls?.length > 0)
		return <Clock className="h-4 w-4 text-blue-500" />;
	if (event.functionResponses?.length > 0)
		return <CheckCircle className="h-4 w-4 text-green-500" />;
	if (event.isFinalResponse)
		return <MessageSquare className="h-4 w-4 text-purple-500" />;
	if (event.content?.parts?.some((p: any) => p.codeExecutionResult))
		return <Code className="h-4 w-4 text-orange-500" />;
	return <MessageSquare className="h-4 w-4 text-gray-500" />;
}

export function EventDetails({
	event,
	onClose,
	hideHeader,
}: EventDetailsProps) {
	return (
		<div className="h-full flex flex-col bg-background pb-16">
			{!hideHeader && (
				<div className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center gap-2">
						{getEventIcon(event)}
						<h3 className="text-base font-semibold">Event Details</h3>
						<Badge variant="outline" className="text-xs">
							{event.id.slice(0, 6)}
						</Badge>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}

			<ScrollArea className="flex-1">
				<div className="p-4 space-y-4">
					{/* Meta */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
						<div>
							<span className="font-medium">Event ID:</span>
							<p className="font-mono text-xs mt-1 break-all">{event.id}</p>
						</div>
						<div>
							<span className="font-medium">Timestamp:</span>
							<p className="text-xs mt-1">
								{format(new Date(event.timestamp * 1000), "PPpp")} (
								{formatDistanceToNow(new Date(event.timestamp * 1000), {
									addSuffix: true,
								})}
								)
							</p>
						</div>
						<div>
							<span className="font-medium">Author:</span>
							<div className="mt-1 flex items-center gap-2 text-xs">
								{event.author === "user" ? (
									<User className="h-3 w-3 text-blue-500" />
								) : (
									<Bot className="h-3 w-3 text-green-500" />
								)}
								<span className="font-medium break-words">{event.author}</span>
							</div>
						</div>
						{event.branch && (
							<div>
								<span className="font-medium">Agent:</span>
								<p className="font-mono text-xs mt-1 break-all">
									{event.branch}
								</p>
							</div>
						)}
					</div>

					{/* Content */}
					{event.content && Object.keys(event.content).length > 0 && (
						<div>
							<h4 className="font-medium mb-2">Content</h4>
							<pre className="text-xs bg-muted p-3 rounded max-h-80 overflow-auto whitespace-pre-wrap break-words">
								{JSON.stringify(event.content, null, 2)}
							</pre>
						</div>
					)}

					{/* Actions */}
					{event.actions && Object.keys(event.actions).length > 0 && (
						<div>
							<h4 className="font-medium mb-2">Actions</h4>
							<pre className="text-xs bg-muted p-3 rounded max-h-80 overflow-auto whitespace-pre-wrap break-words">
								{JSON.stringify(event.actions, null, 2)}
							</pre>
						</div>
					)}

					{/* Function Calls */}
					{event.functionCalls?.length > 0 && (
						<div>
							<h4 className="font-medium mb-2">Function Calls</h4>
							<div className="space-y-2">
								{event.functionCalls.map((call, index) => (
									<div
										key={`${event.id}-call-${index}`}
										className="border rounded p-3 bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-2">
											<Clock className="h-4 w-4 text-blue-500" />
											<span className="font-medium">
												{call.functionCall.name}
											</span>
										</div>
										{call.functionCall.args && (
											<pre className="text-xs bg-muted/70 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap break-words">
												{JSON.stringify(call.functionCall.args, null, 2)}
											</pre>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Function Responses */}
					{event.functionResponses?.length > 0 && (
						<div>
							<h4 className="font-medium mb-2">Function Responses</h4>
							<div className="space-y-2">
								{event.functionResponses.map((response, index) => (
									<div
										key={`${event.id}-response-${index}`}
										className="border rounded p-3 bg-muted/50"
									>
										<div className="flex items-center gap-2 mb-2">
											<CheckCircle className="h-4 w-4 text-green-500" />
											<span className="font-medium">
												{response.functionResponse.name}
											</span>
										</div>
										{response.functionResponse && (
											<pre className="text-xs bg-muted/70 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap break-words">
												{JSON.stringify(response.functionResponse, null, 2)}
											</pre>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

export default EventDetails;
