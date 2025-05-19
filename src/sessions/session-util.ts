/**
 * Utility functions for working with sessions
 */

import type { Session } from "./session";

/**
 * Generates a unique session ID
 * @returns A unique session ID
 */
export function generateSessionId(): string {
	return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates a session object
 * @param session The session to validate
 * @throws Error if session is invalid
 */
export function validateSession(session: Session): void {
	if (!session.id) {
		throw new Error("Session must have an id");
	}

	if (!session.userId) {
		throw new Error("Session must have a userId");
	}

	if (!session.createdAt) {
		throw new Error("Session must have a createdAt timestamp");
	}

	if (!session.updatedAt) {
		throw new Error("Session must have an updatedAt timestamp");
	}

	if (!session.state) {
		throw new Error("Session must have a state object");
	}
}

/**
 * Deep clones a session object
 * @param session The session to clone
 * @returns A deep clone of the session
 */
export function cloneSession(session: Session): Session {
	return {
		...session,
		events: [...session.events],
		metadata: { ...session.metadata },
		// State is handled by reference since it has its own methods
	};
}
