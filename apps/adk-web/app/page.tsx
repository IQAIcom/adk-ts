"use client";

import { Sidebar } from "@/app/(dashboard)/_components/sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { Navbar } from "@/components/navbar";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAgents } from "@/hooks/useAgents";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function HomeContent() {
	const searchParams = useSearchParams();
	const apiUrl = searchParams.get("apiUrl");
	const port = searchParams.get("port");

	// Support both legacy apiUrl and new port parameter, else default
	const finalApiUrl = apiUrl
		? apiUrl
		: port
			? `http://localhost:${port}`
			: "http://localhost:8042";

	// Panel and session state
	const [selectedPanel, setSelectedPanel] = useState<
		"sessions" | "events" | "state" | "graph" | null
	>(null);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

	const queryClient = useQueryClient();

	const {
		agents,
		selectedAgent,
		messages,
		connected,
		loading,
		error,
		sendMessage,
		selectAgent,
		refreshAgents,
		isSendingMessage,
	} = useAgents(finalApiUrl, currentSessionId);

	// Subscribe to server-side hot-reload stream (SSE) and refresh data on change
	useEffect(() => {
		if (!finalApiUrl) return;
		let es: EventSource | null = null;
		try {
			es = new EventSource(`${finalApiUrl}/reload/stream`);
			es.onmessage = (ev) => {
				try {
					const data = ev.data ? JSON.parse(ev.data) : null;
					if (data && data.type === "reload") {
						// Refresh agents and invalidate common queries
						refreshAgents();
						queryClient.invalidateQueries({ queryKey: ["agents"] });
						queryClient.invalidateQueries({ queryKey: ["sessions"] });
						queryClient.invalidateQueries({ queryKey: ["events"] });
					}
				} catch {
					// ignore parse errors
				}
			};
		} catch {
			// ignore connection failures
		}
		return () => {
			try {
				es?.close();
			} catch {}
		};
	}, [finalApiUrl, queryClient, refreshAgents]);

	// Panel action handlers
	const handlePanelSelect = (panel: "sessions" | "events" | "state" | "graph" | null) => {
		setSelectedPanel(panel);
	};
	// Auto-select first agent if none selected and agents are available
	useEffect(() => {
		if (agents.length > 0 && !selectedAgent) {
			console.log("Auto-selecting first agent:", agents[0].name);
			selectAgent(agents[0]);
		}
	}, [agents, selectedAgent, selectAgent]);

	// Reset session when switching to a different agent
	const prevAgentRef = useRef<string | null>(null);
	useEffect(() => {
		const currentAgentPath = selectedAgent?.relativePath ?? null;
		if (currentAgentPath !== prevAgentRef.current) {
			// Agent actually changed -> clear active session so new agent's first session can auto-select
			setCurrentSessionId(null);
			prevAgentRef.current = currentAgentPath;
		}
	}, [selectedAgent]);
	// (Session and events lifecycle + management moved into Sidebar)

	if (loading) {
		return <LoadingState message="Connecting to ADK server..." />;
	}

	if (!finalApiUrl) {
		return (
			<ErrorState
				title="ADK-TS Web"
				message="This interface needs to be launched from the ADK CLI. Run adk web to start."
			/>
		);
	}

	if (!connected || error) {
		return (
			<ErrorState
				title="ADK-TS Web"
				message={`Failed to connect to ADK server at ${finalApiUrl}. Make sure the server is running.`}
				actionLabel="Retry Connection"
				onAction={refreshAgents}
			/>
		);
	}

	return (
		<div className="h-screen flex bg-background">
			{/* Sidebar (now includes expanded panel) */}
			<div className="flex-shrink-0 h-full">
				<Sidebar
					key={selectedAgent?.relativePath || "__no_agent__"}
					selectedPanel={selectedPanel}
					onPanelSelect={handlePanelSelect}
					selectedAgent={selectedAgent}
					currentSessionId={currentSessionId}
					onSessionChange={(id) => setCurrentSessionId(id)}
				/>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 flex min-h-0">
				{/* Chat Panel - Always visible, takes remaining space */}
				<div className="flex-1 flex flex-col min-h-0">
					{/* Navbar above chat */}
					<div className="flex-shrink-0">
						<Navbar
							apiUrl={finalApiUrl}
							agents={agents}
							selectedAgent={selectedAgent}
							onSelectAgent={(agent) => {
								// Clear session first to avoid stale session requests against new agent
								setCurrentSessionId(null);
								selectAgent(agent);
							}}
						/>
					</div>

					{/* Chat Content */}
					<div className="flex-1 min-h-0 overflow-hidden">
						<ChatPanel
							selectedAgent={selectedAgent}
							messages={messages}
							onSendMessage={sendMessage}
							isSendingMessage={isSendingMessage}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Home() {
	return (
		<Suspense fallback={<LoadingState message="Loading..." />}>
			<HomeContent />
		</Suspense>
	);
}
