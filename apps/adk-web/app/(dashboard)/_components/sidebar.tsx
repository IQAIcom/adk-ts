"use client";

import {
	Activity,
	Archive,
	Database,
	LineChart,
	Share2,
	X,
} from "lucide-react";
import Image from "next/image";
import { EventsPanel } from "@/components/events-panel";
import { GraphPanel } from "@/components/graph-panel";
import { SessionsPanel } from "@/components/sessions-panel";
import { StatePanel } from "@/components/state-panel";
import { TracesPanel } from "@/components/traces-panel";
import { Button } from "@/components/ui/button";
import type { TraceSpan } from "@/hooks/use-traces";
import { cn } from "@/lib/utils";
import { PanelId, PanelIdSchema } from "../_schema";

interface SidebarProps {
	selectedPanel: PanelId | null;
	onPanelSelect: (panel: PanelId | null) => void;
	selectedAgent?: any | null;
	currentSessionId?: string | null;
	sessions: any[];
	sessionsLoading: boolean;
	events: any[];
	eventsLoading: boolean;
	graph: any;
	graphLoading: boolean;
	graphError: any;
	tracesByTraceId: Map<string, TraceSpan[]>;
	tracesLoading: boolean;
	onCreateSession: (
		state?: Record<string, any>,
		sessionId?: string,
	) => Promise<any>;
	onDeleteSession: (sessionId: string) => Promise<void>;
	onSwitchSession: (sessionId: string) => Promise<void>;
}

const navigationItems: { id: PanelId; label: string; icon: typeof Database }[] =
	[
		{ id: PanelIdSchema.enum.sessions, label: "Sessions", icon: Database },
		{ id: PanelIdSchema.enum.events, label: "Events", icon: Activity },
		{ id: PanelIdSchema.enum.state, label: "State", icon: Archive },
		{ id: PanelIdSchema.enum.graph, label: "Graph", icon: Share2 },
		{ id: PanelIdSchema.enum.traces, label: "Traces", icon: LineChart },
	];

export function Sidebar({
	selectedPanel,
	onPanelSelect,
	selectedAgent,
	currentSessionId,
	sessions,
	sessionsLoading,
	events,
	eventsLoading,
	graph,
	graphLoading,
	graphError,
	tracesByTraceId,
	tracesLoading,
	onCreateSession,
	onDeleteSession,
	onSwitchSession,
}: SidebarProps) {
	return (
		<div className={cn("flex h-full")}>
			<div className={cn("w-14 border-r bg-card flex flex-col h-full")}>
				{/* Logo */}
				<div className="flex items-center justify-center h-15 border-b shrink-0">
					<div className="relative">
						<Image
							src="/adk.png"
							alt="ADK-TS Logo"
							width={24}
							height={24}
							className="dark:hidden"
						/>
						<Image
							src="/dark-adk.png"
							alt="ADK-TS Logo"
							width={24}
							height={24}
							className="hidden dark:block"
						/>
					</div>
				</div>

				{/* Navigation */}
				<div className="flex-1 flex flex-col items-center py-4 space-y-2 overflow-y-auto">
					{navigationItems.map((item) => {
						const Icon = item.icon;
						const isSelected = selectedPanel === item.id;

						return (
							<Button
								key={item.id}
								variant={isSelected ? "secondary" : "ghost"}
								size="sm"
								className={cn("w-10 h-10 p-0", isSelected && "bg-accent")}
								onClick={() => onPanelSelect(isSelected ? null : item.id)}
								title={item.label}
							>
								<Icon className="h-4 w-4" />
							</Button>
						);
					})}
				</div>
			</div>

			{selectedPanel && (
				<div className="w-80 border-r bg-background flex flex-col">
					{/* Panel Header */}
					<div className="flex h-15 items-center justify-between p-4 border-b">
						<h2 className="text-lg font-semibold">
							{selectedPanel === "sessions"
								? "Sessions"
								: selectedPanel === "events"
									? "Events"
									: selectedPanel === "graph"
										? "Graph"
										: selectedPanel === "traces"
											? "Traces"
											: "State"}
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onPanelSelect(null)}
							className="h-6 w-6 p-0"
							aria-label="Close panel"
						>
							<X className="size-4" />
						</Button>
					</div>

					{/* Panel Content */}
					<div className="flex-1 overflow-hidden">
						{selectedPanel === "sessions" && (
							<SessionsPanel
								sessions={sessions || []}
								currentSessionId={currentSessionId ?? null}
								onCreateSession={onCreateSession}
								onDeleteSession={onDeleteSession}
								onSwitchSession={onSwitchSession}
								isLoading={sessionsLoading}
							/>
						)}
						{selectedPanel === "events" && (
							<EventsPanel events={events || []} isLoading={eventsLoading} />
						)}
						{selectedPanel === "state" && (
							<StatePanel
								selectedAgent={selectedAgent}
								currentSessionId={currentSessionId ?? null}
							/>
						)}
						{selectedPanel === "graph" && (
							<div className="h-full w-full">
								<GraphPanel
									data={graph}
									isLoading={graphLoading}
									error={graphError ?? null}
								/>
							</div>
						)}
						{selectedPanel === "traces" && (
							<TracesPanel
								tracesByTraceId={tracesByTraceId}
								isLoading={tracesLoading}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
