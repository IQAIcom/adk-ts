"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Suspense, useEffect, useMemo } from "react";
import { Sidebar } from "@/app/(dashboard)/_components/sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { Navbar } from "@/components/navbar";
import { IncompatibleState } from "@/components/ui/incompatible-state";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAgents } from "@/hooks/use-agent";
import { useCompatibility } from "@/hooks/use-compatibility";
import { isPanelId, PanelId } from "./(dashboard)/_schema";

function HomeContent() {
	// Use nuqs for URL state management
	const [apiUrl] = useQueryState("apiUrl");
	const [port] = useQueryState("port");
	const [sessionId, setSessionId] = useQueryState("sessionId");
	const [agentName, setAgentName] = useQueryState("agent");

	// Support both legacy apiUrl and new port parameter, else default
	const finalApiUrl = apiUrl
		? apiUrl
		: port
			? `http://localhost:${port}`
			: "http://localhost:8042";

	const [selectedPanel, setSelectedPanel] = useQueryState<PanelId | null>(
		"panel",
		{
			parse: (value) => (isPanelId(value) ? value : null),
			serialize: (value) => value ?? "",
			defaultValue: null,
		},
	);

	const queryClient = useQueryClient();
	const {
		compatible,
		loading: compatLoading,
		error: compatError,
		cliVersion,
		minCliVersion,
	} = useCompatibility();

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
	} = useAgents(sessionId);

	// Determine which agent should be selected based on URL state
	const targetAgent = useMemo(() => {
		if (!agents.length) return null;

		// If agentName is in URL, find that agent
		if (agentName) {
			const found = agents.find((a) => a.name === agentName);
			if (found) return found;
		}

		// Otherwise default to first agent
		return agents[0];
	}, [agents, agentName]);

	// Single effect for SSE hot-reload subscription
	useEffect(() => {
		if (!finalApiUrl) return;

		let es: EventSource | null = null;
		try {
			es = new EventSource(`${finalApiUrl}/reload/stream`);
			es.onmessage = (ev) => {
				try {
					const data = ev.data ? JSON.parse(ev.data) : null;
					if (data && data.type === "reload") {
						refreshAgents();
						queryClient.invalidateQueries({ queryKey: ["agents"] });
						queryClient.invalidateQueries({ queryKey: ["sessions"] });
						queryClient.invalidateQueries({ queryKey: ["events"] });
					} else if (data && data.type === "state") {
						queryClient.invalidateQueries({
							queryKey: ["state", finalApiUrl, data.agentPath, data.sessionId],
						});
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

	// Single effect for syncing agent selection and session clearing
	useEffect(() => {
		// If no target agent, nothing to do
		if (!targetAgent) return;

		// If selected agent doesn't match target, update it
		if (selectedAgent?.name !== targetAgent.name) {
			// Clear session when switching agents
			setSessionId(null);
			selectAgent(targetAgent);
		}

		// If no agentName in URL, set it to match current agent
		if (!agentName && targetAgent.name) {
			setAgentName(targetAgent.name);
		}
	}, [
		targetAgent,
		selectedAgent,
		agentName,
		selectAgent,
		setSessionId,
		setAgentName,
	]);

	// Panel action handlers
	const handlePanelSelect = (panel: PanelId | null) => {
		setSelectedPanel(panel);
	};

	const handleAgentSelect = (agent: (typeof agents)[0]) => {
		// Update URL state, which will trigger the sync effect
		setAgentName(agent.name);
		setSessionId(null);
	};

	if (loading || compatLoading) {
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

	if (!connected || error || compatError) {
		const errorMessage = compatError
			? `Failed to check CLI compatibility: ${compatError.message || compatError}`
			: `Failed to connect to ADK server at ${finalApiUrl}. Make sure the server is running.`;

		return (
			<ErrorState
				title="ADK-TS Web"
				message={errorMessage}
				actionLabel="Retry Connection"
				onAction={refreshAgents}
			/>
		);
	}

	if (!compatible) {
		return (
			<IncompatibleState
				cliVersion={cliVersion}
				minCliVersion={minCliVersion}
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
					currentSessionId={sessionId}
					onSessionChange={(id) => setSessionId(id)}
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
							onSelectAgent={handleAgentSelect}
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
