"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { IncompatibleState } from "@/components/ui/incompatible-state";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAgents } from "@/hooks/use-agent";
import { useCompatibility } from "@/hooks/use-compatibility";
import { SessionManager } from "./(dashboard)/_components/session-manager";
import { isPanelId } from "./(dashboard)/_schema";

function HomeContent() {
	const [urlState, setUrlState] = useQueryStates({
		apiUrl: parseAsString,
		port: parseAsString,
		sessionId: parseAsString,
		agent: parseAsString,
		panel: {
			parse: (value) => (isPanelId(value) ? value : null),
			serialize: (value) => value ?? "",
		},
	});

	const {
		apiUrl,
		port,
		sessionId,
		agent: agentName,
		panel: selectedPanel,
	} = urlState;

	const finalApiUrl = apiUrl
		? apiUrl
		: port
			? `http://localhost:${port}`
			: "http://localhost:8042";

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

	const targetAgent = useMemo(() => {
		if (!agents.length) return null;
		if (agentName) {
			const found = agents.find((a) => a.name === agentName);
			if (found) return found;
		}
		return agents[0];
	}, [agents, agentName]);

	const prevAgentRef = useRef<string | null>(null);

	// Single unified effect for SSE hot-reload and agent selection sync
	useEffect(() => {
		// SSE hot-reload subscription
		let es: EventSource | null = null;
		if (finalApiUrl) {
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
								queryKey: [
									"state",
									finalApiUrl,
									data.agentPath,
									data.sessionId,
								],
							});
						}
					} catch {
						// ignore parse errors
					}
				};
			} catch {
				// ignore connection failures
			}
		}

		// Agent selection sync
		if (targetAgent) {
			const currentAgentName = targetAgent.name;

			// Check if agent changed from previous render
			if (currentAgentName !== prevAgentRef.current) {
				// Update via combined setter
				setUrlState({ sessionId: null });
				prevAgentRef.current = currentAgentName;
			}

			// Sync selected agent if needed
			if (selectedAgent?.name !== currentAgentName) {
				selectAgent(targetAgent);
			}

			// Set agent name in URL if not present
			if (!agentName && currentAgentName) {
				setUrlState({ agent: currentAgentName });
			}
		}

		// Cleanup SSE connection
		return () => {
			try {
				es?.close();
			} catch {}
		};
	}, [
		finalApiUrl,
		queryClient,
		refreshAgents,
		targetAgent,
		selectedAgent,
		agentName,
		selectAgent,
		setUrlState,
	]);

	const handleAgentSelect = (agent: (typeof agents)[0]) => {
		setUrlState({
			agent: agent.name,
			sessionId: null,
		});
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
		<SessionManager
			apiUrl={finalApiUrl}
			agents={agents}
			selectedAgent={selectedAgent}
			sessionId={sessionId}
			selectedPanel={selectedPanel}
			messages={messages}
			isSendingMessage={isSendingMessage}
			onSessionChange={(id) => setUrlState({ sessionId: id })}
			onPanelSelect={(panel) => setUrlState({ panel })}
			onAgentSelect={handleAgentSelect}
			onSendMessage={sendMessage}
		/>
	);
}

export default function Home() {
	return (
		<Suspense fallback={<LoadingState message="Loading..." />}>
			<HomeContent />
		</Suspense>
	);
}
