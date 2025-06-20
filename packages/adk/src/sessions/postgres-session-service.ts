import type { Event } from "@adk/events/event";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import type { Message } from "../models/llm-request";
import type { SessionService } from "./base-session-service";
import type { ListSessionOptions, Session } from "./session";
import { SessionState } from "./state";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Define Drizzle schema for sessions
// Adjust column types based on your specific DB and needs
export const sessionsSchema = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	messages: jsonb("messages").default("[]").$type<Message[]>(), // Store Message array as JSONB
	metadata: jsonb("metadata").default("{}").$type<Record<string, any>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	state: jsonb("state").default("{}").$type<Record<string, any>>(), // Store serialized SessionState as JSONB
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

export class PostgresSessionService implements SessionService {
	private db: NodePgDatabase<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;

	constructor(config: DatabaseSessionServiceConfig) {
		this.db = config.db;
		this.sessionsTable = config.sessionsTable || sessionsSchema;
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	async createSession(
		userId: string,
		metadata: Record<string, any> = {},
	): Promise<Session> {
		const sessionId = this.generateSessionId();
		const now = new Date();
		const sessionState = new SessionState();

		const newSessionData: SessionRow = {
			id: sessionId,
			userId,
			messages: [] as Message[],
			metadata,
			createdAt: now,
			updatedAt: now, // Drizzle's defaultNow() on schema handles this, but explicit is fine
			state: sessionState.toObject(), // Serialize SessionState
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
			messages: Array.isArray(result.messages)
				? (result.messages as Message[])
				: [],
			metadata: result.metadata || {},
			state: SessionState.fromObject(result.state || {}),
			// Ensure dates are Date objects if Drizzle returns strings for some drivers/configs
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
			messages: Array.isArray(sessionData.messages)
				? (sessionData.messages as Message[])
				: [],
			metadata: sessionData.metadata || {},
			state: SessionState.fromObject(sessionData.state || {}),
			createdAt: new Date(sessionData.createdAt),
			updatedAt: new Date(sessionData.updatedAt),
		};
	}

	async updateSession(session: Session): Promise<void> {
		const updateData: Partial<SessionRow> = {
			userId: session.userId,
			messages: session.messages as Message[],
			metadata: session.metadata,
			// createdAt should typically not be updated after creation
			updatedAt: new Date(),
			state: session.state.toObject(),
		};

		await this.db
			.update(this.sessionsTable)
			.set(updateData)
			.where(eq(this.sessionsTable.id, session.id));
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
			query = query.limit(options.limit) as typeof query; // Using 'as' to help TypeScript if inference is tricky
		}

		const results: SessionRow[] = await query;

		return results.map((sessionData: SessionRow) => ({
			id: sessionData.id,
			userId: sessionData.userId,
			messages: Array.isArray(sessionData.messages)
				? (sessionData.messages as Message[])
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

	/**
	 * Appends an event to a session object
	 * @param session The session to append the event to
	 * @param event The event to append
	 * @returns The appended event
	 */
	async appendEvent(session: Session, event: Event): Promise<Event> {
		if (event.is_partial) {
			return event;
		}

		// Update session state based on event
		if (event.actions?.stateDelta) {
			for (const [key, value] of Object.entries(event.actions.stateDelta)) {
				if (key.startsWith("_temp_")) {
					continue;
				}

				session.state?.set(key, value);
			}
		}

		// Add event to session
		if (!session.events) {
			session.events = [];
		}
		session.events.push(event);

		// Update session timestamp
		session.updatedAt = new Date();

		// Save the updated session to the database (including messages)
		await this.updateSession(session);

		return event;
	}

	static fromConnectionString(
		connectionString: string,
	): PostgresSessionService {
		const pool = new Pool({ connectionString });
		const db = drizzle(pool, { schema: { sessions: sessionsSchema } });
		return new PostgresSessionService({ db });
	}
}
