import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pgTable, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

import type { SessionService } from "./base-session-service";
import type { ListSessionOptions, Session } from "./session";
import { SessionState } from "./state";
import type { Event } from "../events/event";
import { generateEventId } from "../events/event";

// Define Drizzle schema for sessions
// Adjust column types based on your specific DB and needs
export const sessionsSchema = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	events: jsonb("events").default("[]").$type<Event[]>(),
	metadata: jsonb("metadata").default("{}").$type<Record<string, any>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	state: jsonb("state").default("{}").$type<Record<string, any>>(),
});

// Type for the Drizzle schema (optional but good for type safety)
export type SessionsTable = typeof sessionsSchema;

// Infer the type of a row in the sessions table for stricter typing
export type SessionRow = typeof sessionsSchema.$inferSelect;

/**
 * Configuration for DatabaseSessionService with Drizzle
 */
export interface DatabaseSessionServiceConfig {
	/**
	 * An initialized Drizzle ORM database client instance.
	 * Example: drizzle(new Pool({ connectionString: '...' }), { schema: { sessions: sessionsSchema } })
	 */
	db: NodePgDatabase<{ sessions: SessionsTable }>; // Adjust NodePgDatabase based on your driver

	/**
	 * Optional: Pass the sessions schema table directly if not attached to db client's schema property
	 */
	sessionsTable?: SessionsTable;
}

export class DatabaseSessionService implements SessionService {
	private db: NodePgDatabase<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;

	constructor(config: DatabaseSessionServiceConfig) {
		this.db = config.db;
		this.sessionsTable = config.sessionsTable || sessionsSchema;
	}

	private generateInternalSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	async createSession(
		userId: string,
		metadata: Record<string, any> = {},
	): Promise<Session> {
		const sessionId = this.generateInternalSessionId();
		const now = new Date();
		const sessionState = new SessionState();

		const newSessionData: SessionRow = {
			id: sessionId,
			userId,
			events: [],
			metadata,
			createdAt: now,
			updatedAt: now,
			state: sessionState.toObject(),
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
			userId: result.userId,
			events: Array.isArray(result.events) ? (result.events as Event[]) : [],
			metadata: result.metadata || {},
			state: SessionState.fromObject(result.state || {}),
			createdAt: new Date(result.createdAt),
			updatedAt: new Date(result.updatedAt),
		};
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		const results = await this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId))
			.limit(1);

		const sessionData = results[0];
		if (!sessionData) {
			return undefined;
		}

		return {
			id: sessionData.id,
			userId: sessionData.userId,
			events: Array.isArray(sessionData.events)
				? (sessionData.events as Event[])
				: [],
			metadata: sessionData.metadata || {},
			state: SessionState.fromObject(sessionData.state || {}),
			createdAt: new Date(sessionData.createdAt),
			updatedAt: new Date(sessionData.updatedAt),
		};
	}

	async updateSession(session: Session): Promise<void> {
		const updateData: Partial<SessionRow> & { id: string } = {
			id: session.id,
			userId: session.userId,
			events: session.events as Event[],
			metadata: session.metadata,
			updatedAt: new Date(),
			state: session.state.toObject(),
		};
		const { id, ...setData } = updateData;

		await this.db
			.update(this.sessionsTable)
			.set(setData)
			.where(eq(this.sessionsTable.id, id));
	}

	async appendEvent(sessionId: string, event: Event): Promise<void> {
		const currentSession = await this.getSession(sessionId);
		if (!currentSession) {
			throw new Error(`Session with ID ${sessionId} not found.`);
		}

		const eventToAppend = { ...event };
		if (!eventToAppend.id) {
			eventToAppend.id = generateEventId();
		}
		if (
			eventToAppend.timestamp === undefined ||
			eventToAppend.timestamp === null
		) {
			eventToAppend.timestamp = Date.now() / 1000;
		}

		const updatedEvents = [...currentSession.events, eventToAppend];

		await this.db
			.update(this.sessionsTable)
			.set({
				events: updatedEvents,
				updatedAt: new Date(),
			})
			.where(eq(this.sessionsTable.id, sessionId));
	}

	async listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]> {
		let query = this.db
			.select()
			.from(this.sessionsTable)
			.where(eq(this.sessionsTable.userId, userId));

		if (options?.limit !== undefined && options.limit > 0) {
			query = query.limit(options.limit) as typeof query;
		}

		const results: SessionRow[] = await query;

		return results.map((sessionData: SessionRow) => ({
			id: sessionData.id,
			userId: sessionData.userId,
			events: Array.isArray(sessionData.events)
				? (sessionData.events as Event[])
				: [],
			metadata: sessionData.metadata || {},
			state: SessionState.fromObject(sessionData.state || {}),
			createdAt: new Date(sessionData.createdAt),
			updatedAt: new Date(sessionData.updatedAt),
		}));
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.db
			.delete(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId));
	}

	// TODO: Consider if table creation/migration logic is needed here or handled externally (e.g., drizzle-kit migrations)
	// TODO: Implement methods corresponding to Python's append_event, list_events,
	// get_app_state, update_app_state, get_user_state, update_user_state
	// if full parity with Python's DatabaseSessionService is desired.
	// This would require defining corresponding Drizzle schemas for Events, AppState, UserState.
}
