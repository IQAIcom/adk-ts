"use client";

import { Activity, Archive, Database, Share2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { EventsPanel } from "@/components/events-panel";
import { GraphPanel } from "@/components/graph-panel";
import { SessionsPanel } from "@/components/sessions-panel";
import { StatePanel } from "@/components/state-panel";
import { Button } from "@/components/ui/button";
import { useAgentGraph } from "@/hooks/use-agent-graph";
import { useEvents } from "@/hooks/use-events";
import { useSessions } from "@/hooks/use-sessions";
import { cn } from "@/lib/utils";
import { PanelId, PanelIdSchema } from "../_schema";

interface SidebarProps {
	selectedPanel: PanelId | null;
	onPanelSelect: (panel: PanelId | null) => void;
	className?: string;
	selectedAgent?: any | null;
	currentSessionId?: string | null;
	onSessionChange?: (sessionId: string | null) => void;
}

const navigationItems: { id: PanelId; label: string; icon: typeof Database }[] =
	[
		{ id: PanelIdSchema.enum.sessions, label: "Sessions", icon: Database },
		{ id: PanelIdSchema.enum.events, label: "Events", icon: Activity },
		{ id: PanelIdSchema.enum.state, label: "State", icon: Archive },
		{ id: PanelIdSchema.enum.graph, label: "Graph", icon: Share2 },
	];

export function Sidebar({
	selectedPanel,
	onPanelSelect,
	className,
	selectedAgent,
	currentSessionId: initialSessionId,
	onSessionChange,
}: SidebarProps) {
	// Manage sessions and events internally
	const {
		sessions,
		isLoading: sessionsLoading,
		createSession,
		deleteSession,
		switchSession,
	} = useSessions(selectedAgent);

	const { events, isLoading: eventsLoading } = useEvents(
		selectedAgent,
		initialSessionId ?? null,
	);

	const {
		data: graph,
		isLoading: graphLoading,
		error: graphError,
	} = useAgentGraph(selectedAgent);

	// Track previous agent to detect actual agent switch
	const prevAgentRef = useRef<string | null>(null);

	// Unified session management effect
	useEffect(() => {
		const currentAgentPath = selectedAgent?.relativePath ?? null;

		// Check if agent changed
		if (currentAgentPath !== prevAgentRef.current) {
			// Agent switched: clear session to allow new agent's first session to auto-select
			onSessionChange?.(null);
			prevAgentRef.current = currentAgentPath;
			return;
		}

		// No sessions available yet
		if (sessions.length === 0) {
			return;
		}

		// Validate URL sessionId
		const isUrlSessionValid =
			initialSessionId && sessions.some((s) => s.id === initialSessionId);

		if (isUrlSessionValid) {
			// URL has a valid sessionId - use it and sync with server
			switchSession(initialSessionId).catch((error) => {
				console.error("Failed to switch to URL session:", error);
			});
		} else if (initialSessionId) {
			// URL has invalid sessionId - clear it
			onSessionChange?.(null);
		} else {
			// No URL sessionId - auto-select first session
			const firstSessionId = sessions[0].id;
			onSessionChange?.(firstSessionId);
			switchSession(firstSessionId).catch((error) => {
				console.error("Failed to auto-select first session:", error);
			});
		}
	}, [
		sessions,
		initialSessionId,
		selectedAgent,
		onSessionChange,
		switchSession,
	]);

	const handleCreateSession = async (
		state?: Record<string, any>,
		sessionId?: string,
	) => {
		const created = await createSession({ state, sessionId });
		// Return the created session so caller can switch to it
		return created;
	};

	const handleDeleteSession = async (sessionId: string) => {
		await deleteSession(sessionId);
		if (initialSessionId === sessionId) {
			onSessionChange?.(null);
		}
	};

	const handleSwitchSession = async (sessionId: string) => {
		await switchSession(sessionId);
		onSessionChange?.(sessionId);
	};

	return (
		<div className={cn("flex h-full", className)}>
			<div className={cn("w-14 border-r bg-card flex flex-col h-full")}>
				{/* Logo */}
				<div className="flex items-center justify-center h-[60px] border-b flex-shrink-0">
					<div className="relative">
						<Image
							src="/adk.png"
							alt="ADK Logo"
							width={24}
							height={24}
							className="dark:hidden"
						/>
						<Image
							src="/dark-adk.png"
							alt="ADK Logo"
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

			{/* Expanded panel (moved from page.tsx) */}
			{selectedPanel && (
				<div className="w-80 border-r bg-background flex flex-col">
					{/* Panel Header */}
					<div className="flex h-[60px] items-center justify-between p-4 border-b">
						<h2 className="text-lg font-semibold">
							{selectedPanel === "sessions"
								? "Sessions"
								: selectedPanel === "events"
									? "Events"
									: selectedPanel === "graph"
										? "Graph"
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
								currentSessionId={initialSessionId ?? null}
								onCreateSession={handleCreateSession}
								onDeleteSession={handleDeleteSession}
								onSwitchSession={handleSwitchSession}
								isLoading={!!sessionsLoading}
							/>
						)}
						{selectedPanel === "events" && (
							<EventsPanel events={events || []} isLoading={!!eventsLoading} />
						)}
						{selectedPanel === "state" && (
							<StatePanel
								selectedAgent={selectedAgent}
								currentSessionId={initialSessionId ?? null}
							/>
						)}
						{selectedPanel === "graph" && (
							<div className="h-full w-full">
								<GraphPanel
									data={graph}
									isLoading={!!graphLoading}
									error={graphError ?? null}
								/>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
