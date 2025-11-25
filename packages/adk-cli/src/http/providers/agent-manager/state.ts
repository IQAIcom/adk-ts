import type { BaseAgent, BuiltAgent } from "@iqai/adk";
import type { Logger } from "@nestjs/common";
import type { SessionState, SessionWithState } from "../agent-loader.types";

interface AgentWithSessionService {
	sessionService?: {
		sessions?: Map<string, Map<string, Map<string, SessionWithState>>>;
	};
}

function hasSessionService(agent: unknown): agent is AgentWithSessionService {
	return (
		typeof agent === "object" && agent !== null && "sessionService" in agent
	);
}

function extractNonEmptyState(
	state: SessionState | Map<string, unknown> | undefined,
): SessionState | undefined {
	if (state == null) return undefined;
	if (state instanceof Map) {
		if (state.size > 0) return Object.fromEntries(state);
		return undefined;
	}
	if (typeof state === "object" && Object.keys(state).length > 0) {
		return state as SessionState;
	}
	return undefined;
}

function getInitialStateFromSessionService(
	agent: AgentWithSessionService | undefined,
): SessionState | undefined {
	const sessions = agent?.sessionService?.sessions;
	if (!sessions) return undefined;
	for (const [, userSessions] of sessions) {
		for (const [, session] of userSessions) {
			for (const [, innerSession] of session) {
				const extractedState = extractNonEmptyState(innerSession?.state);
				if (extractedState) return extractedState;
			}
		}
	}
	return undefined;
}

function extractBuiltAgentState(
	builtAgent: BuiltAgent | undefined,
): SessionState | undefined {
	if (!builtAgent?.session) return undefined;
	const state = builtAgent.session.state as SessionState | undefined;
	if (state && Object.keys(state).length > 0) return state;
	return undefined;
}

function extractSubAgentState(
	agent: BaseAgent,
	logger?: Logger,
): SessionState | undefined {
	const subAgents = (agent as { subAgents?: BaseAgent[] }).subAgents;
	if (!Array.isArray(subAgents)) return undefined;
	for (const subAgent of subAgents) {
		if (hasSessionService(subAgent)) {
			const subState = getInitialStateFromSessionService(subAgent);
			if (subState) {
				logger?.log(
					`✅ Extracted state from sub-agent: ${Object.keys(subState)}`,
				);
				return subState;
			}
		}
	}
	return undefined;
}

export function extractInitialState(
	agentResult: { agent: BaseAgent; builtAgent?: BuiltAgent },
	logger?: Logger,
): SessionState | undefined {
	const builtAgentState = extractBuiltAgentState(agentResult.builtAgent);
	if (builtAgentState) return builtAgentState;

	if (hasSessionService(agentResult.agent)) {
		const agentState = getInitialStateFromSessionService(agentResult.agent);
		if (agentState) return agentState;
	}

	const subAgentState = extractSubAgentState(agentResult.agent, logger);
	if (subAgentState) return subAgentState;

	return undefined;
}
