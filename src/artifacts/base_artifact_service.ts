// Base artifact service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base artifact service functionality from the Python SDK

// BaseArtifactService class mirroring the Python implementation
export abstract class BaseArtifactService {
	/**
	 * Saves an artifact to the artifact service storage.
	 *
	 * @param appName The application name
	 * @param userId The user ID
	 * @param sessionId The session ID
	 * @param filename The filename of the artifact
	 * @param artifact The artifact to save
	 * @returns The revision ID (first version is 0, incremented by 1 after each save)
	 */
	abstract saveArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		artifact: unknown,
	): number;

	/**
	 * Gets an artifact from the artifact service storage.
	 *
	 * @param appName The application name
	 * @param userId The user ID
	 * @param sessionId The session ID
	 * @param filename The filename of the artifact
	 * @param version Optional version of the artifact (if undefined, latest version is returned)
	 * @returns The artifact or null if not found
	 */
	abstract loadArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		version?: number,
	): unknown | null;

	/**
	 * Lists all the artifact filenames within a session.
	 *
	 * @param appName The application name
	 * @param userId The user ID
	 * @param sessionId The session ID
	 * @returns A list of all artifact filenames within a session
	 */
	abstract listArtifactKeys(
		appName: string,
		userId: string,
		sessionId: string,
	): string[];

	/**
	 * Deletes an artifact.
	 *
	 * @param appName The application name
	 * @param userId The user ID
	 * @param sessionId The session ID
	 * @param filename The filename of the artifact
	 */
	abstract deleteArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): void;

	/**
	 * Lists all versions of an artifact.
	 *
	 * @param appName The application name
	 * @param userId The user ID
	 * @param sessionId The session ID
	 * @param filename The filename of the artifact
	 * @returns A list of all available versions of the artifact
	 */
	abstract listVersions(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): number[];
}
