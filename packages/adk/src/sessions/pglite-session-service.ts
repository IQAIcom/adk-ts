import type { Event } from "@adk/events/event";
import type { Session } from "./session";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";

// Define Drizzle schema for sessions
const sessionsSchema = pgTable("sessions", {
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
 * Configuration for PgLiteSessionService
 */
export interface PgLiteSessionServiceConfig {
	/**
	 * An initialized PGlite instance.
	 * The service will handle all Drizzle ORM setup internally.
	 */
	pglite: PGlite;

	/**
	 * Optional: Skip automatic table creation if you handle migrations externally
	 */
	skipTableCreation?: boolean;
}

export class PgLiteSessionService extends BaseSessionService {
	private db: PgliteDatabase<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;
	private initialized = false;

	constructor(config: PgLiteSessionServiceConfig) {
		super();
		// Initialize Drizzle with the provided PGlite instance
		this.db = drizzle(config.pglite, {
			schema: { sessions: sessionsSchema },
		});
		this.sessionsTable = sessionsSchema;

		// Initialize database tables unless explicitly skipped
		if (!config.skipTableCreation) {
			this.initializeDatabase().catch((error) => {
				console.error("Failed to initialize PgLite database:", error);
			});
		}
	}

	/**
	 * Initialize the database by creating required tables if they don't exist
	 */
	private async initializeDatabase(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			await this.db.execute(`
				CREATE TABLE IF NOT EXISTS sessions (
					id VARCHAR(255) PRIMARY KEY,
					app_name VARCHAR(255) NOT NULL,
					user_id VARCHAR(255) NOT NULL,
					created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
					last_update_time INTEGER NOT NULL,
					state JSONB DEFAULT '{}',
					events JSONB DEFAULT '[]'
				);
			`);

			this.initialized = true;
		} catch (error) {
			console.error("Error initializing PgLite database:", error);
			throw error;
		}
	}

	/**
	 * Ensure database is initialized before any operation
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.initializeDatabase();
		}
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
		await this.ensureInitialized();

		const id = sessionId?.trim() || this.generateSessionId();
		const now = Date.now() / 1000;
		const sessionState = state ? state : {};

		const newSessionData: SessionRow = {
			id,
			appName,
			userId,
			createdAt: new Date(),
			lastUpdateTime: Math.floor(now),
			state: sessionState.toObject(),
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
			state,
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
		await this.ensureInitialized();

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
		await this.ensureInitialized();

		const updateData: Partial<SessionRow> = {
			appName: session.appName,
			userId: session.userId,
			lastUpdateTime: session.lastUpdateTime,
			state: session.state.toObject(),
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
		await this.ensureInitialized();

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
		await this.ensureInitialized();

		await this.db
			.delete(this.sessionsTable)
			.where(eq(this.sessionsTable.id, sessionId));
	}

	async appendEvent(session: Session, event: Event): Promise<Event> {
		await this.ensureInitialized();

		if (event.partial) {
			return event;
		}

		this.updateSessionState(session, event);

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
				session.state.set(key, event.actions.stateDelta[key]);
			}
		}
	}
}
