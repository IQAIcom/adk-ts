import type { Event } from "@adk/events/event";
import { type Generated, type Kysely, sql } from "kysely";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type { Session } from "./session";
import { State } from "./state";

// Database schema types
export interface Database {
	sessions: SessionsTable;
	events: EventsTable;
	app_states: AppStatesTable;
	user_states: UserStatesTable;
}

export interface SessionsTable {
	id: string;
	app_name: string;
	user_id: string;
	state: string;
	create_time: Generated<Date>;
	update_time: Generated<Date>;
}

export interface EventsTable {
	id: string;
	app_name: string;
	user_id: string;
	session_id: string;
	invocation_id: string;
	author: string;
	branch: string | null;
	timestamp: Generated<Date>;
	content: string | null;
	actions: string | null;
	long_running_tool_ids_json: string | null;
	grounding_metadata: string | null;
	partial: boolean | null;
	turn_complete: boolean | null;
	error_code: string | null;
	error_message: string | null;
	interrupted: boolean | null;
}

export interface AppStatesTable {
	app_name: string;
	state: string;
	update_time: Generated<Date>;
}

export interface UserStatesTable {
	app_name: string;
	user_id: string;
	state: string;
	update_time: Generated<Date>;
}

/**
 * Configuration for DatabaseSessionService
 */
export interface DatabaseSessionServiceConfig {
	/**
	 * An initialized Kysely database instance
	 */
	db: Kysely<Database>;

	/**
	 * Optional: Skip automatic table creation if you handle migrations externally
	 */
	skipTableCreation?: boolean;
}

export class DatabaseSessionService extends BaseSessionService {
	private db: Kysely<Database>;
	private initialized = false;

	constructor(config: DatabaseSessionServiceConfig) {
		super();
		this.db = config.db;

		// Initialize database tables unless explicitly skipped
		if (!config.skipTableCreation) {
			this.initializeDatabase().catch((error) => {
				console.error("Failed to initialize database:", error);
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
			// Create sessions table
			await this.db.schema
				.createTable("sessions")
				.ifNotExists()
				.addColumn("id", "varchar(128)", (col) => col.notNull())
				.addColumn("app_name", "varchar(128)", (col) => col.notNull())
				.addColumn("user_id", "varchar(128)", (col) => col.notNull())
				.addColumn("state", "text", (col) => col.defaultTo("{}"))
				.addColumn("create_time", "timestamp", (col) =>
					col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
				)
				.addColumn("update_time", "timestamp", (col) =>
					col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
				)
				.addPrimaryKeyConstraint("sessions_pk", ["app_name", "user_id", "id"])
				.execute();

			// Create events table
			await this.db.schema
				.createTable("events")
				.ifNotExists()
				.addColumn("id", "varchar(128)", (col) => col.notNull())
				.addColumn("app_name", "varchar(128)", (col) => col.notNull())
				.addColumn("user_id", "varchar(128)", (col) => col.notNull())
				.addColumn("session_id", "varchar(128)", (col) => col.notNull())
				.addColumn("invocation_id", "varchar(256)")
				.addColumn("author", "varchar(256)")
				.addColumn("branch", "varchar(256)")
				.addColumn("timestamp", "timestamp", (col) =>
					col.defaultTo(sql`CURRENT_TIMESTAMP`),
				)
				.addColumn("content", "text")
				.addColumn("actions", "text")
				.addColumn("long_running_tool_ids_json", "text")
				.addColumn("grounding_metadata", "text")
				.addColumn("partial", "boolean")
				.addColumn("turn_complete", "boolean")
				.addColumn("error_code", "varchar(256)")
				.addColumn("error_message", "varchar(1024)")
				.addColumn("interrupted", "boolean")
				.addPrimaryKeyConstraint("events_pk", [
					"id",
					"app_name",
					"user_id",
					"session_id",
				])
				.addForeignKeyConstraint(
					"events_session_fk",
					["app_name", "user_id", "session_id"],
					"sessions",
					["app_name", "user_id", "id"],
				)
				.execute();

			// Create app_states table
			await this.db.schema
				.createTable("app_states")
				.ifNotExists()
				.addColumn("app_name", "varchar(128)", (col) => col.primaryKey())
				.addColumn("state", "text", (col) => col.defaultTo("{}"))
				.addColumn("update_time", "timestamp", (col) =>
					col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
				)
				.execute();

			// Create user_states table
			await this.db.schema
				.createTable("user_states")
				.ifNotExists()
				.addColumn("app_name", "varchar(128)", (col) => col.notNull())
				.addColumn("user_id", "varchar(128)", (col) => col.notNull())
				.addColumn("state", "text", (col) => col.defaultTo("{}"))
				.addColumn("update_time", "timestamp", (col) =>
					col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
				)
				.addPrimaryKeyConstraint("user_states_pk", ["app_name", "user_id"])
				.execute();

			// Create indexes
			await this.db.schema
				.createIndex("idx_sessions_user_id")
				.ifNotExists()
				.on("sessions")
				.column("user_id")
				.execute();

			this.initialized = true;
		} catch (error) {
			console.error("Error initializing database:", error);
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

	/**
	 * Helper to safely parse JSON strings
	 */
	private parseJsonSafely<T>(jsonString: string | null, defaultValue: T): T {
		if (!jsonString) return defaultValue;
		try {
			return JSON.parse(jsonString) as T;
		} catch {
			return defaultValue;
		}
	}

	/**
	 * Convert database timestamp to Unix seconds
	 * Handles different timestamp formats from different databases
	 */
	private timestampToUnixSeconds(timestamp: any): number {
		if (timestamp instanceof Date) {
			return timestamp.getTime() / 1000;
		}
		if (typeof timestamp === "string") {
			return new Date(timestamp).getTime() / 1000;
		}
		if (typeof timestamp === "number") {
			// Assume it's already Unix timestamp in seconds or milliseconds
			return timestamp > 10000000000 ? timestamp / 1000 : timestamp;
		}
		// Fallback to current time
		return Date.now() / 1000;
	}

	async createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Promise<Session> {
		await this.ensureInitialized();

		const id = sessionId?.trim() || this.generateSessionId();

		return await this.db.transaction().execute(async (trx) => {
			// Fetch app and user states from storage
			const appState = await trx
				.selectFrom("app_states")
				.selectAll()
				.where("app_name", "=", appName)
				.executeTakeFirst();

			const userState = await trx
				.selectFrom("user_states")
				.selectAll()
				.where("app_name", "=", appName)
				.where("user_id", "=", userId)
				.executeTakeFirst();

			let currentAppState = this.parseJsonSafely(appState?.state, {});
			let currentUserState = this.parseJsonSafely(userState?.state, {});

			// Create state tables if not exist
			if (!appState) {
				await trx
					.insertInto("app_states")
					.values({
						app_name: appName,
						state: "{}",
					})
					.execute();
			}

			if (!userState) {
				await trx
					.insertInto("user_states")
					.values({
						app_name: appName,
						user_id: userId,
						state: "{}",
					})
					.execute();
			}

			// Extract state deltas - Fixed property name
			const { appStateDelta, userStateDelta, sessionStateDelta } =
				this.extractStateDelta(state);

			// Apply state delta
			currentAppState = { ...currentAppState, ...appStateDelta };
			currentUserState = { ...currentUserState, ...userStateDelta };

			// Update app and user state if there are deltas
			if (Object.keys(appStateDelta).length > 0) {
				await trx
					.updateTable("app_states")
					.set({
						state: JSON.stringify(currentAppState),
						update_time: sql`CURRENT_TIMESTAMP`,
					})
					.where("app_name", "=", appName)
					.execute();
			}

			if (Object.keys(userStateDelta).length > 0) {
				await trx
					.updateTable("user_states")
					.set({
						state: JSON.stringify(currentUserState),
						update_time: sql`CURRENT_TIMESTAMP`,
					})
					.where("app_name", "=", appName)
					.where("user_id", "=", userId)
					.execute();
			}

			// Store the session - Fixed to use sessionStateDelta
			const result = await trx
				.insertInto("sessions")
				.values({
					id,
					app_name: appName,
					user_id: userId,
					state: JSON.stringify(sessionStateDelta),
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Merge states for response
			const mergedState = this.mergeState(
				currentAppState,
				currentUserState,
				sessionStateDelta,
			);

			return {
				id: result.id,
				appName: result.app_name,
				userId: result.user_id,
				state: mergedState,
				events: [] as Event[], // Fixed type annotation
				lastUpdateTime: this.timestampToUnixSeconds(result.update_time),
			};
		});
	}

	async getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined> {
		await this.ensureInitialized();

		return await this.db.transaction().execute(async (trx) => {
			// Get the storage session entry
			const storageSession = await trx
				.selectFrom("sessions")
				.selectAll()
				.where("app_name", "=", appName)
				.where("user_id", "=", userId)
				.where("id", "=", sessionId)
				.executeTakeFirst();

			if (!storageSession) {
				return undefined;
			}

			// Build event query with filters
			let eventQuery = trx
				.selectFrom("events")
				.selectAll()
				.where("session_id", "=", sessionId)
				.orderBy("timestamp", "desc");

			if (config?.afterTimestamp) {
				eventQuery = eventQuery.where(
					"timestamp",
					">=",
					new Date(config.afterTimestamp * 1000),
				);
			}

			if (config?.numRecentEvents) {
				eventQuery = eventQuery.limit(config.numRecentEvents);
			}

			const storageEvents = await eventQuery.execute();

			// Fetch states from storage
			const appState = await trx
				.selectFrom("app_states")
				.selectAll()
				.where("app_name", "=", appName)
				.executeTakeFirst();

			const userState = await trx
				.selectFrom("user_states")
				.selectAll()
				.where("app_name", "=", appName)
				.where("user_id", "=", userId)
				.executeTakeFirst();

			const currentAppState = this.parseJsonSafely(appState?.state, {});
			const currentUserState = this.parseJsonSafely(userState?.state, {});
			const sessionState = this.parseJsonSafely(storageSession.state, {});

			// Merge states
			const mergedState = this.mergeState(
				currentAppState,
				currentUserState,
				sessionState,
			);

			// Convert storage events to events - Fixed typing
			const events: Event[] = storageEvents
				.reverse()
				.map((storageEvent) => this.storageEventToEvent(storageEvent));

			return {
				id: sessionId,
				appName,
				userId,
				state: mergedState,
				events, // Now properly typed as Event[]
				lastUpdateTime: this.timestampToUnixSeconds(storageSession.update_time),
			};
		});
	}

	async updateSession(session: Session): Promise<void> {
		await this.ensureInitialized();

		await this.db
			.updateTable("sessions")
			.set({
				state: JSON.stringify(session.state),
				update_time: sql`CURRENT_TIMESTAMP`,
			})
			.where("app_name", "=", session.appName)
			.where("user_id", "=", session.userId)
			.where("id", "=", session.id)
			.execute();
	}

	async listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse> {
		await this.ensureInitialized();

		const results = await this.db
			.selectFrom("sessions")
			.selectAll()
			.where("app_name", "=", appName)
			.where("user_id", "=", userId)
			.execute();

		const sessions = results.map((storageSession) => ({
			id: storageSession.id,
			appName: storageSession.app_name,
			userId: storageSession.user_id,
			state: {},
			events: [] as Event[], // Fixed type annotation
			lastUpdateTime: this.timestampToUnixSeconds(storageSession.update_time),
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
			.deleteFrom("sessions")
			.where("app_name", "=", appName)
			.where("user_id", "=", userId)
			.where("id", "=", sessionId)
			.execute();
	}

	async appendEvent(session: Session, event: Event): Promise<Event> {
		await this.ensureInitialized();

		if (event.partial) {
			return event;
		}

		return await this.db.transaction().execute(async (trx) => {
			// Check if timestamp is stale
			const storageSession = await trx
				.selectFrom("sessions")
				.selectAll()
				.where("app_name", "=", session.appName)
				.where("user_id", "=", session.userId)
				.where("id", "=", session.id)
				.executeTakeFirstOrThrow();

			if (
				this.timestampToUnixSeconds(storageSession.update_time) >
				session.lastUpdateTime
			) {
				// Fixed Generated<Date> access
				throw new Error(
					`The last_update_time provided in the session object ${new Date(session.lastUpdateTime * 1000).toISOString()} is earlier than the update_time in the storage_session ${(storageSession.update_time as Date).toISOString()}. Please check if it is a stale session.`,
				);
			}

			// Fetch states from storage
			const appState = await trx
				.selectFrom("app_states")
				.selectAll()
				.where("app_name", "=", session.appName)
				.executeTakeFirst();

			const userState = await trx
				.selectFrom("user_states")
				.selectAll()
				.where("app_name", "=", session.appName)
				.where("user_id", "=", session.userId)
				.executeTakeFirst();

			let currentAppState = this.parseJsonSafely(appState?.state, {});
			let currentUserState = this.parseJsonSafely(userState?.state, {});
			let sessionState = this.parseJsonSafely(storageSession.state, {});

			// Extract state delta from event
			let appStateDelta = {};
			let userStateDelta = {};
			let sessionStateDelta = {};

			if (event.actions?.stateDelta) {
				const deltas = this.extractStateDelta(event.actions.stateDelta);
				appStateDelta = deltas.appStateDelta;
				userStateDelta = deltas.userStateDelta;
				sessionStateDelta = deltas.sessionStateDelta;
			}

			// Merge state and update storage
			if (Object.keys(appStateDelta).length > 0) {
				currentAppState = { ...currentAppState, ...appStateDelta };
				await trx
					.updateTable("app_states")
					.set({
						state: JSON.stringify(currentAppState),
						update_time: sql`CURRENT_TIMESTAMP`,
					})
					.where("app_name", "=", session.appName)
					.execute();
			}

			if (Object.keys(userStateDelta).length > 0) {
				currentUserState = { ...currentUserState, ...userStateDelta };
				await trx
					.updateTable("user_states")
					.set({
						state: JSON.stringify(currentUserState),
						update_time: sql`CURRENT_TIMESTAMP`,
					})
					.where("app_name", "=", session.appName)
					.where("user_id", "=", session.userId)
					.execute();
			}

			if (Object.keys(sessionStateDelta).length > 0) {
				sessionState = { ...sessionState, ...sessionStateDelta };
				await trx
					.updateTable("sessions")
					.set({
						state: JSON.stringify(sessionState),
						update_time: sql`CURRENT_TIMESTAMP`,
					})
					.where("app_name", "=", session.appName)
					.where("user_id", "=", session.userId)
					.where("id", "=", session.id)
					.execute();
			}

			// Store the event
			await trx
				.insertInto("events")
				.values({
					...this.eventToStorageEvent(session, event),
					timestamp: sql`CURRENT_TIMESTAMP`,
				})
				.execute();

			// Get updated session timestamp
			const updatedSession = await trx
				.selectFrom("sessions")
				.select("update_time")
				.where("app_name", "=", session.appName)
				.where("user_id", "=", session.userId)
				.where("id", "=", session.id)
				.executeTakeFirstOrThrow();

			// Update session timestamp
			session.lastUpdateTime = this.timestampToUnixSeconds(
				updatedSession.update_time,
			);

			// Also update the in-memory session
			super.appendEvent(session, event);

			return event;
		});
	}

	/**
	 * Extract state deltas based on prefixes (similar to Python implementation)
	 */
	private extractStateDelta(state: Record<string, any> | undefined): {
		appStateDelta: Record<string, any>;
		userStateDelta: Record<string, any>;
		sessionStateDelta: Record<string, any>;
	} {
		const appStateDelta: Record<string, any> = {};
		const userStateDelta: Record<string, any> = {};
		const sessionStateDelta: Record<string, any> = {};

		if (state) {
			for (const [key, value] of Object.entries(state)) {
				if (key.startsWith(State.APP_PREFIX)) {
					appStateDelta[key.substring(State.APP_PREFIX.length)] = value;
				} else if (key.startsWith(State.USER_PREFIX)) {
					userStateDelta[key.substring(State.USER_PREFIX.length)] = value;
				} else if (!key.startsWith(State.TEMP_PREFIX)) {
					sessionStateDelta[key] = value;
				}
			}
		}

		return { appStateDelta, userStateDelta, sessionStateDelta };
	}

	/**
	 * Merge states for response (similar to Python implementation)
	 */
	private mergeState(
		appState: Record<string, any>,
		userState: Record<string, any>,
		sessionState: Record<string, any>,
	): Record<string, any> {
		const mergedState = { ...sessionState };

		// Add app state with prefix
		for (const [key, value] of Object.entries(appState)) {
			mergedState[`${State.APP_PREFIX}${key}`] = value;
		}

		// Add user state with prefix
		for (const [key, value] of Object.entries(userState)) {
			mergedState[`${State.USER_PREFIX}${key}`] = value;
		}

		return mergedState;
	}

	/**
	 * Convert Event to storage event format
	 */
	private eventToStorageEvent(
		session: Session,
		event: Event,
	): Omit<EventsTable, "timestamp"> {
		return {
			id: event.id,
			app_name: session.appName,
			user_id: session.userId,
			session_id: session.id,
			invocation_id: event.invocationId || "",
			author: event.author || "",
			branch: event.branch || null,
			content: event.content ? JSON.stringify(event.content) : null,
			actions: event.actions ? JSON.stringify(event.actions) : null,
			long_running_tool_ids_json: event.longRunningToolIds
				? JSON.stringify(Array.from(event.longRunningToolIds))
				: null,
			grounding_metadata: event.groundingMetadata
				? JSON.stringify(event.groundingMetadata)
				: null,
			partial: event.partial || null,
			turn_complete: event.turnComplete || null,
			error_code: event.errorCode || null,
			error_message: event.errorMessage || null,
			interrupted: event.interrupted || null,
		};
	}

	/**
	 * Convert storage event to Event format - Fixed to match Event interface
	 */
	private storageEventToEvent(
		storageEvent: Omit<EventsTable, "timestamp"> & {
			timestamp: Date;
		},
	): Event {
		const baseEvent = {
			id: storageEvent.id,
			invocationId: storageEvent.invocation_id,
			author: storageEvent.author,
			branch: storageEvent.branch || undefined,
			timestamp: this.timestampToUnixSeconds(storageEvent.timestamp),
			content: storageEvent.content
				? this.parseJsonSafely(storageEvent.content, null)
				: undefined,
			actions: storageEvent.actions
				? this.parseJsonSafely(storageEvent.actions, null)
				: undefined,
			longRunningToolIds: storageEvent.long_running_tool_ids_json
				? new Set(
						this.parseJsonSafely(storageEvent.long_running_tool_ids_json, []),
					)
				: undefined,
			groundingMetadata: storageEvent.grounding_metadata
				? this.parseJsonSafely(storageEvent.grounding_metadata, null)
				: undefined,
			partial: storageEvent.partial || undefined,
			turnComplete: storageEvent.turn_complete || undefined,
			errorCode: storageEvent.error_code || undefined,
			errorMessage: storageEvent.error_message || undefined,
			interrupted: storageEvent.interrupted || undefined,
		};

		// Add required Event methods - these might need to be implemented based on your Event interface
		return {
			...baseEvent,
			// Add any missing required methods from the Event interface
			isFinalResponse: () => baseEvent.turnComplete === true,
			getFunctionCalls: () => {
				// Extract function calls from actions if they exist
				if (
					baseEvent.actions &&
					typeof baseEvent.actions === "object" &&
					"functionCalls" in baseEvent.actions
				) {
					return (baseEvent.actions.functionCalls as any[]) || [];
				}
				return [];
			},
			getFunctionResponses: () => {
				// Extract function responses from actions if they exist
				if (
					baseEvent.actions &&
					typeof baseEvent.actions === "object" &&
					"functionResponses" in baseEvent.actions
				) {
					return (baseEvent.actions.functionResponses as any[]) || [];
				}
				return [];
			},
			hasTrailingCodeExecutionResult: () => {
				// Check if there are trailing code execution results
				if (
					baseEvent.actions &&
					typeof baseEvent.actions === "object" &&
					"hasTrailingCodeExecutionResult" in baseEvent.actions
				) {
					return (
						(baseEvent.actions.hasTrailingCodeExecutionResult as boolean) ||
						false
					);
				}
				return false;
			},
		} as Event;
	}

	/**
	 * Updates the session state based on the event.
	 * Overrides the base class method to work with plain object state.
	 */
	protected updateSessionState(session: Session, event: Event): void {
		if (!event.actions?.stateDelta) {
			return;
		}

		for (const [key, value] of Object.entries(event.actions.stateDelta)) {
			if (!key.startsWith(State.TEMP_PREFIX)) {
				session.state[key] = value;
			}
		}
	}
}
