"use client";

import { EventsPanel } from "@/components/events-panel";
import { SessionsPanel } from "@/components/sessions-panel";
import { StatePanel } from "@/components/state-panel";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/useEvents";
import { useSessions } from "@/hooks/useSessions";
import { cn } from "@/lib/utils";
import { Activity, Archive, Database, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SidebarProps {
	selectedPanel: "sessions" | "events" | "state" | null;
	onPanelSelect: (panel: "sessions" | "events" | "state" | null) => void;
	className?: string;
	selectedAgent?: any | null;
	currentSessionId?: string | null;
	onSessionChange?: (sessionId: string | null) => void;
}

export function Sidebar({
	selectedPanel,
	onPanelSelect,
	className,
	selectedAgent,
	currentSessionId: initialSessionId,
	onSessionChange,
}: SidebarProps) {
	const navigationItems = [
		{
			id: "sessions" as const,
			label: "Sessions",
			icon: Database,
		},
		{
			id: "events" as const,
			label: "Events",
			icon: Activity,
		},
		{
			id: "state" as const,
			label: "State",
			icon: Archive,
		},
	];

	// Determine API URL from search params (same logic as page.tsx)
	const searchParams = useSearchParams();
	const apiUrl = searchParams.get("apiUrl");
	const port = searchParams.get("port");

	const finalApiUrl =
		apiUrl || (port ? `http://localhost:${port}` : "http://localhost:8042");

	// Local session state should be declared before hooks that depend on it
	const [localSessionId, setLocalSessionId] = useState<string | null>(
		initialSessionId ?? null,
	);

	// Manage sessions and events internally
	const {
		sessions,
		isLoading: sessionsLoading,
		createSession,
		deleteSession,
		switchSession,
	} = useSessions(finalApiUrl, selectedAgent);

	const { events, isLoading: eventsLoading } = useEvents(
		finalApiUrl,
		selectedAgent,
		localSessionId ?? null,
	);

	const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

	// Track previous agent to detect actual agent switch
	const prevAgentRef = useRef<string | null>(null);
	useEffect(() => {
		const currentAgentPath = selectedAgent?.relativePath ?? null;
		if (currentAgentPath !== prevAgentRef.current) {
			// Agent changed: clear local session so auto-select can pick correct one for new agent
			setLocalSessionId(null);
			onSessionChange?.(null);
			prevAgentRef.current = currentAgentPath;
		}
	}, [selectedAgent, onSessionChange]);

	// Sync incoming initialSessionId prop into local state
	useEffect(() => {
		setLocalSessionId(initialSessionId ?? null);
	}, [initialSessionId]);

	// Auto-select first session when sessions are loaded if no current session (per agent)
	useEffect(() => {
		if (sessions.length > 0 && !localSessionId) {
			const firstSessionId = sessions[0].id;
			setLocalSessionId(firstSessionId);
			onSessionChange?.(firstSessionId);
			// Also sync server-side active session for consistency
			try {
				void switchSession(firstSessionId);
			} catch {}
		}
		// If current local session id is no longer present in sessions (e.g., after agent change or deletion), clear it
		if (localSessionId && !sessions.some((s) => s.id === localSessionId)) {
			setLocalSessionId(null);
			onSessionChange?.(null);
		}
	}, [sessions, localSessionId, onSessionChange, switchSession]);

	const handleCreateSession = async (
		state?: Record<string, any>,
		sessionId?: string,
	) => {
		await createSession({ state, sessionId });
	};

	const handleDeleteSession = async (sessionId: string) => {
		await deleteSession(sessionId);
		if (localSessionId === sessionId) {
			setLocalSessionId(null);
			onSessionChange?.(null);
		}
	};

	const handleSwitchSession = async (sessionId: string) => {
		await switchSession(sessionId);
		setLocalSessionId(sessionId);
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
								currentSessionId={localSessionId}
								onCreateSession={handleCreateSession}
								onDeleteSession={handleDeleteSession}
								onSwitchSession={handleSwitchSession}
								isLoading={!!sessionsLoading}
							/>
						)}
						{selectedPanel === "events" && (
							<EventsPanel
								events={events || []}
								isLoading={!!eventsLoading}
								onSelectEvent={(e) => {
									setSelectedEvent(e);
								}}
							/>
						)}
						{selectedPanel === "state" && (
							<StatePanel
								selectedAgent={selectedAgent}
								currentSessionId={localSessionId}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
