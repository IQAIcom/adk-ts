"use client";

import { useEffect, useRef } from "react";
import type { AgentListItemDto as Agent } from "@/Api";
import { Sidebar } from "@/app/(dashboard)/_components/sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { Navbar } from "@/components/navbar";
import { useAgentGraph } from "@/hooks/use-agent-graph";
import { useEvents } from "@/hooks/use-events";
import { useSessions } from "@/hooks/use-sessions";
import { useTraces } from "@/hooks/use-traces";
import type { Message, PanelId } from "../_schema";

interface SessionManagerProps {
	apiUrl: string;
	agents: Agent[];
	selectedAgent: Agent | null;
	sessionId: string | null;
	selectedPanel: PanelId | null;
	messages: Message[];
	isSendingMessage: boolean;
	onSessionChange: (id: string | null) => void;
	onPanelSelect: (panel: PanelId | null) => void;
	onAgentSelect: (agent: Agent) => void;
	onSendMessage: (message: string, attachments?: File[]) => void;
}

export function SessionManager({
	apiUrl,
	agents,
	selectedAgent,
	sessionId,
	selectedPanel,
	messages,
	isSendingMessage,
	onSessionChange,
	onPanelSelect,
	onAgentSelect,
	onSendMessage,
}: SessionManagerProps) {
	const {
		sessions,
		isLoading: sessionsLoading,
		createSession,
		deleteSession,
		switchSession,
	} = useSessions(selectedAgent);

	const { events, isLoading: eventsLoading } = useEvents(
		selectedAgent,
		sessionId,
	);

	const {
		data: graph,
		isLoading: graphLoading,
		error: graphError,
	} = useAgentGraph(selectedAgent);

	const { tracesByTraceId, isLoading: tracesLoading } = useTraces(
		selectedAgent,
		sessionId,
	);

	const prevAgentRef = useRef<string | null>(null);

	// Single effect for session management
	useEffect(() => {
		const currentAgentPath = selectedAgent?.relativePath ?? null;

		// Agent switched - clear session
		if (currentAgentPath !== prevAgentRef.current) {
			onSessionChange(null);
			prevAgentRef.current = currentAgentPath;
			return;
		}

		// No sessions available yet or still loading
		if (sessions.length === 0 || sessionsLoading) {
			return;
		}

		// Validate URL sessionId
		const isUrlSessionValid =
			sessionId && sessions.some((s) => s.id === sessionId);

		if (isUrlSessionValid) {
			switchSession(sessionId).catch((error) => {
				console.error("Failed to switch to URL session:", error);
			});
		} else if (sessionId) {
			// URL has invalid sessionId (e.g., session was deleted) - clear it
			onSessionChange(null);
		} else if (sessions.length > 0) {
			// No URL sessionId - auto-select first session
			const firstSessionId = sessions[0].id;
			onSessionChange(firstSessionId);
			switchSession(firstSessionId).catch((error) => {
				console.error("Failed to auto-select first session:", error);
			});
		}
	}, [
		sessions,
		sessionsLoading,
		sessionId,
		selectedAgent,
		onSessionChange,
		switchSession,
	]);

	const handleCreateSession = async (
		state?: Record<string, any>,
		newSessionId?: string,
	) => {
		const created = await createSession({ state, sessionId: newSessionId });
		return created;
	};

	const handleDeleteSession = async (deleteSessionId: string) => {
		// If deleting the current session, clear it from URL first to prevent
		// the useEffect from trying to switch to it after deletion
		if (sessionId === deleteSessionId) {
			onSessionChange(null);
		}
		await deleteSession(deleteSessionId);
	};

	const handleSwitchSession = async (newSessionId: string) => {
		await switchSession(newSessionId);
		onSessionChange(newSessionId);
	};

	// Chat is disabled if sessions are loading, no session is selected,
	// OR all sessions were deleted (empty sessions)
	const isChatDisabled = sessionsLoading || !sessionId || sessions.length === 0;

	return (
		<div className="h-screen flex bg-background">
			<div className="shrink-0 h-full">
				<Sidebar
					key={selectedAgent?.relativePath || "__no_agent__"}
					selectedPanel={selectedPanel}
					onPanelSelect={onPanelSelect}
					selectedAgent={selectedAgent}
					currentSessionId={sessionId}
					sessions={sessions}
					sessionsLoading={sessionsLoading}
					events={events}
					eventsLoading={eventsLoading}
					graph={graph}
					graphLoading={graphLoading}
					graphError={graphError}
					tracesByTraceId={tracesByTraceId}
					tracesLoading={tracesLoading}
					onCreateSession={handleCreateSession}
					onDeleteSession={handleDeleteSession}
					onSwitchSession={handleSwitchSession}
				/>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 flex min-h-0">
				<div className="flex-1 flex flex-col min-h-0">
					{/* Navbar */}
					<div className="shrink-0">
						<Navbar
							apiUrl={apiUrl}
							agents={agents}
							selectedAgent={selectedAgent}
							onSelectAgent={onAgentSelect}
						/>
					</div>

					{/* Chat Content */}
					<div className="flex-1 min-h-0 overflow-hidden">
						<ChatPanel
							selectedAgent={selectedAgent}
							messages={messages}
							onSendMessage={onSendMessage}
							isSendingMessage={isSendingMessage}
							isLoading={isChatDisabled}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
