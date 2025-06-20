import * as fs from "node:fs";
import * as path from "node:path";
import type { Event } from "@adk/events/event";
import type { Session } from "./session";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import {
	type BetterSQLite3Database,
	drizzle,
} from "drizzle-orm/better-sqlite3";
import { integer, text } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";

// Define Drizzle schema for sessions
const sessionsSchema = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	appName: text("app_name").notNull(),
	userId: text("user_id").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	lastUpdateTime: integer("last_update_time").notNull(),
	state: text("state", { mode: "json" })
		.default("{}")
		.$type<Record<string, any>>(),
	events: text("events", { mode: "json" }).default("[]").$type<Event[]>(),
});

// Type for the Drizzle schema
export type SessionsTable = typeof sessionsSchema;
export type SessionRow = typeof sessionsSchema.$inferSelect;

/**
 * Configuration for SqliteSessionService
 */
export interface SqliteSessionServiceConfig {
	/**
	 * An initialized better-sqlite3 Database instance.
	 * The service will handle all Drizzle ORM setup internally.
	 */
	sqlite: Database.Database;

	/**
	 * Optional: Skip automatic table creation if you handle migrations externally
	 */
	skipTableCreation?: boolean;
}

export class SqliteSessionService extends BaseSessionService {
	private db: BetterSQLite3Database<{ sessions: SessionsTable }>;
	private sessionsTable: SessionsTable;
	private initialized = false;
	private sqliteInstance: Database.Database;

	constructor(config: SqliteSessionServiceConfig) {
		super();
		this.sqliteInstance = config.sqlite;

		// Ensure the database directory exists
		const dbPath = this.sqliteInstance.name;
		if (dbPath && dbPath !== ":memory:") {
			const dbDir = path.dirname(dbPath);
			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true });
			}
		}

		// Initialize Drizzle with the provided SQLite instance
		this.db = drizzle(config.sqlite, {
			schema: { sessions: sessionsSchema },
		});
		this.sessionsTable = sessionsSchema;

		// Initialize database tables unless explicitly skipped
		if (!config.skipTableCreation) {
			this.initializeDatabase().catch((error) => {
				console.error("Failed to initialize SQLite database:", error);
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
			// Enable WAL mode for better concurrent access
			this.sqliteInstance.pragma("journal_mode = WAL");

			// Create sessions table using raw SQL since Drizzle doesn't have migrations built-in
			this.sqliteInstance.exec(`
				CREATE TABLE IF NOT EXISTS sessions (
					id TEXT PRIMARY KEY,
					app_name TEXT NOT NULL,
					user_id TEXT NOT NULL,
					created_at INTEGER NOT NULL,
					last_update_time INTEGER NOT NULL,
					state TEXT DEFAULT '{}',
					events TEXT DEFAULT '[]'
				);
			`);

			// Create index on user_id for faster queries
			this.sqliteInstance.exec(`
				CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
			`);

			this.initialized = true;
		} catch (error) {
			console.error("Error initializing SQLite database:", error);
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
		const sessionState = state || {};

		const newSessionData: typeof this.sessionsTable.$inferInsert = {
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
}
