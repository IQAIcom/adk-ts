import type { Event } from "@adk/events/event";
import type { Session } from "./session";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	integer,
	jsonb,
	pgTable,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Define Drizzle schema for sessions
export const sessionsSchema = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	appName: varchar("app_name", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	lastUpdateTime: integer("last_update_time").notNull(),
	state: jsonb("state").default("{}").$type<Record<string, any>>(),
	events: jsonb("events").default("[]").$type<Event[]>(),
});

// Type for the Drizzle schema
export type SessionsTable = typeof sessionsSchema;
export type SessionRow = typeof sessionsSchema.$inferSelect;

/**
 * Configuration for PostgresSessionService
 */
export interface PostgresSessionServiceConfig {
	/**
	 * An initialized Drizzle ORM database client instance.
	 */
	db: NodePgDatabase<{ sessions: SessionsTable }>;

	/**
	 * Optional: Pass the sessions schema table directly if not attached to db client's schema property
	 */
	sessionsTable?: SessionsTable;
}

export class PostgresSessionService extends BaseSessionService {
	private db: NodePgDatabase<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;

	constructor(config: PostgresSessionServiceConfig) {
		super();
		this.db = config.db;
		this.sessionsTable = config.sessionsTable || sessionsSchema;
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	async createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Promise<Session> {
		const id = sessionId?.trim() || this.generateSessionId();
		const now = Date.now() / 1000;
		const sessionState = state || {};

		const newSessionData: SessionRow = {
			id,
			appName,
			userId,
			createdAt: new Date(),
			lastUpdateTime: Math.floor(now),
			state: sessionState,
			events: [],
		};

		const results = await this.db
			.insert(this.sessionsTable)
			.values(newSessionData)
			.returning();

		const result = results[0];
		if (!result) {
			throw new Error(
				"Failed to create session, no data returned from insert.",
			);
		}

		return {
			id: result.id,
			appName: result.appName,
			userId: result.userId,
			state: result.state || {},
			events: Array.isArray(result.events) ? result.events : [],
			lastUpdateTime: result.lastUpdateTime,
		};
	}

	async getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined> {
		const results = await this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId))
			.limit(1);

		const sessionData = results[0];
		if (
			!sessionData ||
			sessionData.appName !== appName ||
			sessionData.userId !== userId
		) {
			return undefined;
		}

		return {
			id: sessionData.id,
			appName: sessionData.appName,
			userId: sessionData.userId,
			state: sessionData.state || {},
			events: Array.isArray(sessionData.events) ? sessionData.events : [],
			lastUpdateTime: sessionData.lastUpdateTime,
		};
	}

	async updateSession(session: Session): Promise<void> {
		const updateData: Partial<SessionRow> = {
			appName: session.appName,
			userId: session.userId,
			lastUpdateTime: session.lastUpdateTime,
			state: session.state,
			events: session.events || [],
		};

		await this.db
			.update(this.sessionsTable)
			.set(updateData)
			.where(eq(this.sessionsTable.id, session.id));
	}

	async listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse> {
		const results: SessionRow[] = await this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.userId, userId));

		const sessions = results
			.filter((sessionData) => sessionData.appName === appName)
			.map((sessionData: SessionRow) => ({
				id: sessionData.id,
				appName: sessionData.appName,
				userId: sessionData.userId,
				state: sessionData.state || {},
				events: Array.isArray(sessionData.events) ? sessionData.events : [],
				lastUpdateTime: sessionData.lastUpdateTime,
			}));

		return { sessions };
	}

	async deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<void> {
		await this.db
			.delete(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId));
	}

	async appendEvent(session: Session, event: Event): Promise<Event> {
		if (event.partial) {
			return event;
		}

		// Use the base class method which calls our overridden updateSessionState
		this.updateSessionState(session, event);

		// Add event to session
		if (!session.events) {
			session.events = [];
		}
		session.events.push(event);

		// Update session timestamp
		session.lastUpdateTime = Date.now() / 1000;

		// Save the updated session to the database
		await this.updateSession(session);

		return event;
	}

	/**
	 * Updates the session state based on the event.
	 * Overrides the base class method to work with plain object state.
	 */
	protected updateSessionState(session: Session, event: Event): void {
		if (!event.actions || !event.actions.stateDelta) {
			return;
		}
		for (const key in event.actions.stateDelta) {
			if (Object.prototype.hasOwnProperty.call(event.actions.stateDelta, key)) {
				if (key.startsWith("temp_")) {
					continue;
				}
				session.state[key] = event.actions.stateDelta[key];
			}
		}
	}

	static fromConnectionString(
		connectionString: string,
	): PostgresSessionService {
		const pool = new Pool({ connectionString });
		const db = drizzle(pool, { schema: { sessions: sessionsSchema } });
		return new PostgresSessionService({ db });
	}
}
