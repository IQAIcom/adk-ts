// In-memory artifact service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the in-memory artifact service functionality from the Python SDK

import { BaseArtifactService } from "./base_artifact_service";

// InMemoryArtifactService class mirroring the Python implementation
export class InMemoryArtifactService extends BaseArtifactService {
	private artifacts: Map<string, unknown[]> = new Map();

	private fileHasUserNamespace(filename: string): boolean {
		return filename.startsWith("user:");
	}

	private artifactPath(
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

	saveArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		artifact: unknown,
	): number {
		const path = this.artifactPath(appName, userId, sessionId, filename);
		let versions = this.artifacts.get(path);
		if (!versions) {
			versions = [];
			this.artifacts.set(path, versions);
		}
		versions.push(artifact);
		return versions.length - 1;
	}

	loadArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		version?: number,
	): unknown | null {
		const path = this.artifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);
		if (!versions || versions.length === 0) {
			return null;
		}
		if (version === undefined) {
			return versions[versions.length - 1];
		}
		if (version < 0 || version >= versions.length) {
			return null;
		}
		return versions[version];
	}

	listArtifactKeys(
		appName: string,
		userId: string,
		sessionId: string,
	): string[] {
		const sessionPrefix = `${appName}/${userId}/${sessionId}/`;
		const usernamespacePrefix = `${appName}/${userId}/user/`;
		const filenames: string[] = [];

		for (const path of this.artifacts.keys()) {
			if (path.startsWith(sessionPrefix)) {
				const filename = path.slice(sessionPrefix.length);
				filenames.push(filename);
			} else if (path.startsWith(usernamespacePrefix)) {
				const filename = path.slice(usernamespacePrefix.length);
				filenames.push(filename);
			}
		}

		return filenames.sort();
	}

	deleteArtifact(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): void {
		const path = this.artifactPath(appName, userId, sessionId, filename);
		this.artifacts.delete(path);
	}

	listVersions(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
	): number[] {
		const path = this.artifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);
		if (!versions) {
			return [];
		}
		return Array.from({ length: versions.length }, (_, i) => i);
	}
}
