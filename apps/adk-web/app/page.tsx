"use client";

import { Sidebar } from "@/app/(dashboard)/_components/sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { Navbar } from "@/components/navbar";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAgents } from "@/hooks/useAgents";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HomeContent() {
	const searchParams = useSearchParams();
	const apiUrl = searchParams.get("apiUrl");
	const port = searchParams.get("port");

	// Support both legacy apiUrl and new port parameter
	// Default to port 8042 if neither is provided
	const finalApiUrl =
		apiUrl || (port ? `http://localhost:${port}` : "http://localhost:8042");

	// Panel and session state
	const [selectedPanel, setSelectedPanel] = useState<
		"sessions" | "events" | "state" | null
	>(null);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

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

	// Panel action handlers
	const handlePanelSelect = (panel: "sessions" | "events" | "state" | null) => {
		setSelectedPanel(panel);
	};
	// Auto-select first agent if none selected and agents are available
	useEffect(() => {
		if (agents.length > 0 && !selectedAgent) {
			console.log("Auto-selecting first agent:", agents[0].name);
			selectAgent(agents[0]);
		}
	}, [agents, selectedAgent, selectAgent]);
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
							onSelectAgent={selectAgent}
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
