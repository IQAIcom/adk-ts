import { createHash } from "node:crypto";
import type {
	BaseAgent,
	BuiltAgent,
	EnhancedRunner,
	InMemorySessionService,
	Session,
} from "@iqai/adk";
import { AgentBuilder } from "@iqai/adk";
import { DEFAULT_APP_NAME, USER_ID_PREFIX } from "../../../common/constants";
import type { Agent } from "../../../common/types";
import type { SessionState } from "../agent-loader.types";

export function hashState(state: SessionState | undefined): string {
	if (!state || Object.keys(state).length === 0) return "empty";
	return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

export async function getExistingSession(
	sessionService: InMemorySessionService,
	agentPath: string,
	sessionId: string,
	logger: { log: (...args: any[]) => void; warn: (...args: any[]) => void },
): Promise<Session> {
	const userId = `${USER_ID_PREFIX}${agentPath}`;
	const appName = DEFAULT_APP_NAME;
	try {
		const session = await sessionService.getSession(appName, userId, sessionId);
		if (session) {
			logger.log(`Restored existing session: ${sessionId}`);
			return session;
		}
	} catch (error) {
		logger.warn(
			`Failed to restore session ${sessionId}, creating new one: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	return sessionService.createSession(appName, userId);
}

export async function getOrCreateSession(
	sessionService: InMemorySessionService,
	agentPath: string,
	agentResult: { agent: BaseAgent; builtAgent?: BuiltAgent },
	extractInitialStateFn: (r: {
		agent: BaseAgent;
		builtAgent?: BuiltAgent;
	}) => SessionState | undefined,
	logger: { log: (...args: any[]) => void },
): Promise<Session> {
	const userId = `${USER_ID_PREFIX}${agentPath}`;
	const appName = DEFAULT_APP_NAME;

	const existingSessions = await sessionService.listSessions(appName, userId);
	if (existingSessions.sessions.length > 0) {
		const mostRecentSession = existingSessions.sessions.reduce(
			(latest, current) =>
				current.lastUpdateTime > latest.lastUpdateTime ? current : latest,
		);
		const hasState =
			mostRecentSession.state &&
			Object.keys(mostRecentSession.state).length > 0;
		if (!hasState) {
			const initialState = extractInitialStateFn(agentResult);
			if (initialState) {
				logger.log(
					`Existing session has no state, initializing with agent's initial state: ${Object.keys(initialState)}`,
				);
				await sessionService.createSession(
					appName,
					userId,
					initialState,
					mostRecentSession.id,
				);
				mostRecentSession.state = initialState;
			}
		}
		logger.log(
			`Reusing existing session: ${JSON.stringify({ sessionId: mostRecentSession.id })}`,
		);
		return mostRecentSession;
	}

	const initialState = extractInitialStateFn(agentResult);
	return sessionService.createSession(appName, userId, initialState);
}

export async function createRunnerWithSession(
	sessionService: InMemorySessionService,
	baseAgent: BaseAgent,
	sessionToUse: Session,
	agentPath: string,
): Promise<EnhancedRunner> {
	const userId = `${USER_ID_PREFIX}${agentPath}`;
	const appName = DEFAULT_APP_NAME;
	const agentBuilder = AgentBuilder.create(baseAgent.name).withAgent(baseAgent);
	agentBuilder.withSessionService(sessionService, {
		userId,
		appName,
		sessionId: sessionToUse.id,
		state: sessionToUse.state,
	});
	const { runner } = await agentBuilder.build();
	return runner;
}

export async function storeLoadedAgent(
	sessionService: InMemorySessionService,
	agentPath: string,
	agentResult: { agent: BaseAgent; builtAgent?: BuiltAgent },
	runner: EnhancedRunner,
	sessionToUse: Session,
	agent: Agent,
	setLoaded: (
		path: string,
		payload: {
			agent: BaseAgent;
			runner: EnhancedRunner;
			sessionId: string;
			userId: string;
			appName: string;
		},
	) => void,
	logger: { log: (...args: any[]) => void; error: (...args: any[]) => void },
	setBuilt?: (path: string, built: BuiltAgent) => void,
): Promise<void> {
	const userId = `${USER_ID_PREFIX}${agentPath}`;
	const appName = DEFAULT_APP_NAME;

	setLoaded(agentPath, {
		agent: agentResult.agent,
		runner,
		sessionId: sessionToUse.id,
		userId,
		appName,
	});
	agent.instance = agentResult.agent;
	agent.name = agentResult.agent.name;
	if (agentResult.builtAgent && setBuilt)
		setBuilt(agentPath, agentResult.builtAgent);

	try {
		const existingSession = await sessionService.getSession(
			appName,
			userId,
			sessionToUse.id,
		);
		if (!existingSession) {
			logger.log(`Creating session in sessionService: ${sessionToUse.id}`);
			await sessionService.createSession(
				appName,
				userId,
				sessionToUse.state,
				sessionToUse.id,
			);
		} else {
			logger.log(
				`Session already exists in sessionService: ${sessionToUse.id}`,
			);
		}
	} catch (error) {
		logger.error("Error ensuring session exists:", error);
	}
}

export async function clearAgentSessions(
	sessionService: InMemorySessionService,
	agentPath: string,
	logger: { log: (...args: any[]) => void; warn: (...args: any[]) => void },
): Promise<void> {
	try {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;
		const sessions = await sessionService.listSessions(appName, userId);
		for (const session of sessions.sessions) {
			try {
				await sessionService.deleteSession(appName, userId, session.id);
				logger.log(`Cleared session ${session.id} for agent ${agentPath}`);
			} catch (error) {
				logger.warn(
					`Failed to clear session ${session.id}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	} catch (error) {
		logger.warn(
			`Failed to list sessions for clearing: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
