import type {
	BaseArtifactService,
	ArtifactContent,
} from "./base-artifact-service";

/**
 * An in-memory implementation of the artifact service.
 */
export class InMemoryArtifactService implements BaseArtifactService {
	// Store: Map<artifactPath, ArtifactContent[] (versions)>
	private artifacts: Map<string, ArtifactContent[]> = new Map();

	private fileHasUserNamespace(filename: string): boolean {
		return filename.startsWith("user:");
	}

	private getArtifactPath(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): string {
		if (this.fileHasUserNamespace(filename)) {
			return `${appName}/${userId}/user/${filename}`;
		}
		return `${appName}/${userId}/${sessionId}/${filename}`;
	}

	async saveArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		artifact: ArtifactContent,
	): Promise<number> {
		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		if (!this.artifacts.has(path)) {
			this.artifacts.set(path, []);
		}
		const versions = this.artifacts.get(path)!; // Should exist due to the check above
		versions.push(artifact);
		return versions.length - 1; // Version is 0-indexed
	}

	async loadArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		version?: number,
	): Promise<ArtifactContent | undefined> {
		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);

		if (!versions || versions.length === 0) {
			return undefined;
		}

		let targetVersionIndex: number;
		if (version === undefined) {
			targetVersionIndex = versions.length - 1; // Latest version
		} else {
			targetVersionIndex = version;
		}

		if (targetVersionIndex < 0 || targetVersionIndex >= versions.length) {
			// Python version returns versions[version] which would error for out of bounds negative.
			// Here, explicitly return undefined for invalid version index.
			return undefined;
		}
		return versions[targetVersionIndex];
	}

	async listArtifactKeys(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<string[]> {
		const sessionPrefix = `${appName}/${userId}/${sessionId}/`;
		const userNamespacePrefix = `${appName}/${userId}/user/`;
		const filenames: string[] = [];

		for (const path of this.artifacts.keys()) {
			if (path.startsWith(sessionPrefix)) {
				const filename = path.substring(sessionPrefix.length);
				filenames.push(filename);
			} else if (path.startsWith(userNamespacePrefix)) {
				const filename = path.substring(userNamespacePrefix.length);
				filenames.push(filename);
			}
		}
		return filenames.sort(); // Python version also sorts
	}

	async deleteArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): Promise<void> {
		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		this.artifacts.delete(path); // Map.delete is a no-op if key doesn't exist, matching Python's pop(path, None)
	}

	async listVersions(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): Promise<number[]> {
		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);

		if (!versions) {
			return [];
		}
		return Array.from({ length: versions.length }, (_, i) => i); // Returns 0-indexed version numbers
	}

	/**
	 * Clears all artifacts from the service. Useful for testing.
	 */
	public clear(): void {
		this.artifacts.clear();
	}
}
