"use client";

import { EventCard } from "@/components/event-card";
import { EventDetails } from "@/components/event-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";

interface Event {
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

interface EventsPanelProps {
	events: Event[];
	isLoading?: boolean;
	onSelectEvent?: (event: Event) => void;
}

export function EventsPanel({
	events,
	isLoading = false,
	onSelectEvent,
}: EventsPanelProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [authorFilter, setAuthorFilter] = useState<string>("all");
	const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
	const [drillEvent, setDrillEvent] = useState<Event | null>(null);

	const authors = useMemo(() => {
		const uniqueAuthors = new Set(events.map((event) => event.author));
		return Array.from(uniqueAuthors);
	}, [events]);

	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			if (searchTerm) {
				const searchLower = searchTerm.toLowerCase();
				const matchesSearch =
					event.author.toLowerCase().includes(searchLower) ||
					event.id.toLowerCase().includes(searchLower) ||
					JSON.stringify(event.content).toLowerCase().includes(searchLower) ||
					JSON.stringify(event.actions).toLowerCase().includes(searchLower);

				if (!matchesSearch) return false;
			}

			if (authorFilter !== "all" && event.author !== authorFilter) return false;

			if (eventTypeFilter !== "all") {
				const hasFunctionCalls = event.functionCalls.length > 0;
				const hasFunctionResponses = event.functionResponses.length > 0;
				switch (eventTypeFilter) {
					case "messages":
						if (hasFunctionCalls || hasFunctionResponses) return false;
						break;
					case "function-calls":
						if (!hasFunctionCalls) return false;
						break;
					case "function-responses":
						if (!hasFunctionResponses) return false;
						break;
					case "final-responses":
						if (!event.isFinalResponse) return false;
						break;
				}
			}

			return true;
		});
	}, [events, searchTerm, authorFilter, eventTypeFilter]);

	// Drill-in details inside panel
	if (drillEvent) {
		return (
			<div className="h-full flex flex-col bg-background">
				<div className="p-3 border-b flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={() => setDrillEvent(null)}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm font-medium">Event Details</span>
				</div>
				<EventDetails
					event={drillEvent}
					onClose={() => setDrillEvent(null)}
					hideHeader
				/>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-background">
			<div className="p-4 border-b space-y-4">
				<div className="flex items-center justify-between">
					<Badge variant="outline">{filteredEvents.length} events</Badge>
				</div>

				<div className="flex flex-col gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search events..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-9"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<Select value={authorFilter} onValueChange={setAuthorFilter}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Author" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Authors</SelectItem>
								{authors.map((author) => (
									<SelectItem key={author} value={author}>
										{author === "user" ? "👤 User" : `🤖 ${author}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Event Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Types</SelectItem>
								<SelectItem value="messages">Messages</SelectItem>
								<SelectItem value="function-calls">Function Calls</SelectItem>
								<SelectItem value="function-responses">
									Function Responses
								</SelectItem>
								<SelectItem value="final-responses">Final Responses</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<ScrollArea className="flex-1 max-h-[calc(100vh-200px)]">
				<div className="p-4 space-y-3">
					{isLoading ? (
						<div className="text-center text-muted-foreground py-8">
							Loading events...
						</div>
					) : filteredEvents.length === 0 ? (
						<div className="text-center text-muted-foreground py-8">
							<AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="text-sm">No events found</p>
							{events.length !== 0 && (
								<p className="text-xs">Try adjusting your filters</p>
							)}
						</div>
					) : (
						filteredEvents.map((event) => (
							<EventCard
								key={event.id}
								event={event}
								onClick={() => {
									setDrillEvent(event);
									onSelectEvent?.(event);
								}}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
