// Utils module for the Google Agent Development Kit (ADK) in TypeScript
// Exports utility functions for CLI operations

export * from "./envs";
export * from "./logs";

/**
 * Creates an empty state for a session
 *
 * @returns An empty state object
 */
export function createEmptyState(): Record<string, any> {
	return {
		_time: new Date(),
	};
}
