"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { IncompatibleState } from "@/components/ui/incompatible-state";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAgents } from "@/hooks/use-agent";
import { useApiUrl } from "@/hooks/use-api-url";
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

	const { sessionId, agent: agentName, panel: selectedPanel } = urlState;

	const finalApiUrl = useApiUrl();

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
		// Always set up EventSource - empty string means relative URL (bundled mode)
		if (typeof window !== "undefined") {
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
		return <LoadingState message="Connecting to ADK-TS server..." />;
	}

	if (!connected || error || compatError) {
		// In bundled mode, finalApiUrl is "" (same origin), so show current location
		const displayUrl =
			finalApiUrl ||
			(typeof window !== "undefined" ? window.location.origin : "the server");

		const describeError = (err: unknown): string => {
			if (!err) return "Unknown error";
			if (err instanceof Error) return err.message;
			if (typeof err === "string") return err;
			if (typeof Response !== "undefined" && err instanceof Response) {
				const status = err.status ? `HTTP ${err.status}` : "";
				const text = err.statusText || "";
				return `${status} ${text}`.trim() || "Request failed";
			}
			return "Unknown error";
		};

		const errorMessage = compatError
			? `Failed to check CLI compatibility: ${describeError(compatError)}`
			: `Failed to connect to ADK-TS server at ${displayUrl}. Make sure the server is running.`;

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
