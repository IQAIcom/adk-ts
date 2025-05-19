// Define a type for the artifact data, similar to google.genai.types.Part but simplified for TS
// In Python, types.Part can hold inline_data (mime_type, data: bytes), text, functionCall, etc.
// For an artifact service, we are primarily concerned with file-like data.
export interface ArtifactContent {
	mimeType: string;
	data: Uint8Array; // Representing binary data, can also be Buffer in Node.js environments
	// Alternatively, could be a string if artifacts are always text, but Uint8Array is more general.
	// Or could be our EventPart if we expect to store complex parts as artifacts.
	// For now, keeping it simple like a file blob.
}

/**
 * Abstract base class for artifact services.
 */
export interface BaseArtifactService {
	/**
	 * Saves an artifact to the artifact service storage.
	 *
	 * @param appName The app name.
	 * @param userId The user ID.
	 * @param sessionId The session ID.
	 * @param filename The filename of the artifact.
	 * @param artifact The artifact content to save.
	 * @returns A promise that resolves to the revision ID (version number).
	 * The first version is 0, incremented on each save.
	 */
	saveArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		artifact: ArtifactContent, // Changed from types.Part to a more specific ArtifactContent
	): Promise<number>;

	/**
	 * Gets an artifact from the artifact service storage.
	 *
	 * @param appName The app name.
	 * @param userId The user ID.
	 * @param sessionId The session ID.
	 * @param filename The filename of the artifact.
	 * @param version The version of the artifact. If undefined, the latest version will be returned.
	 * @returns A promise that resolves to the artifact content or undefined if not found.
	 */
	loadArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		version?: number,
	): Promise<ArtifactContent | undefined>;

	/**
	 * Lists all the artifact filenames within a session.
	 *
	 * @param appName The name of the application.
	 * @param userId The ID of the user.
	 * @param sessionId The ID of the session.
	 * @returns A promise that resolves to a list of all artifact filenames.
	 */
	listArtifactKeys(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<string[]>;

	/**
	 * Deletes an artifact.
	 *
	 * @param appName The name of the application.
	 * @param userId The ID of the user.
	 * @param sessionId The ID of the session.
	 * @param filename The name of the artifact file.
	 * @returns A promise that resolves when the artifact is deleted.
	 */
	deleteArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): Promise<void>;

	/**
	 * Lists all versions of an artifact.
	 *
	 * @param appName The name of the application.
	 * @param userId The ID of the user.
	 * @param sessionId The ID of the session.
	 * @param filename The name of the artifact file.
	 * @returns A promise that resolves to a list of all available versions (revision IDs) of the artifact.
	 */
	listVersions(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): Promise<number[]>;
}
