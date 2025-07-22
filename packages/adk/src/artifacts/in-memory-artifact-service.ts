import type { Part } from "@google/genai";
import type { BaseArtifactService } from "./base-artifact-service";

export class InMemoryArtifactService implements BaseArtifactService {
	private readonly artifacts: Map<string, Part[]> = new Map();

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

	async saveArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		artifact: Part;
	}): Promise<number> {
		const { appName, userId, sessionId, filename, artifact } = args;

		const path = this.getArtifactPath(appName, userId, sessionId, filename);

		if (!this.artifacts.has(path)) {
			this.artifacts.set(path, []);
		}

		const versions = this.artifacts.get(path)!;
		const version = versions.length;
		versions.push(artifact);

		return version;
	}

	async loadArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		version?: number;
	}): Promise<Part | null> {
		const { appName, userId, sessionId, filename, version } = args;

		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);

		if (!versions || versions.length === 0) {
			return null;
		}

		let targetVersion = version;
		if (targetVersion === undefined || targetVersion === null) {
			targetVersion = versions.length - 1;
		}

		if (targetVersion < 0) {
			targetVersion = versions.length + targetVersion;
		}

		if (targetVersion < 0 || targetVersion >= versions.length) {
			return null;
		}

		return versions[targetVersion];
	}

	async listArtifactKeys(args: {
		appName: string;
		userId: string;
		sessionId: string;
	}): Promise<string[]> {
		const { appName, userId, sessionId } = args;

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

		return filenames.sort();
	}

	async deleteArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<void> {
		const { appName, userId, sessionId, filename } = args;

		const path = this.getArtifactPath(appName, userId, sessionId, filename);

		if (!this.artifacts.has(path)) {
			return;
		}

		this.artifacts.delete(path);
	}

	async listVersions(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<number[]> {
		const { appName, userId, sessionId, filename } = args;

		const path = this.getArtifactPath(appName, userId, sessionId, filename);
		const versions = this.artifacts.get(path);

		if (!versions || versions.length === 0) {
			return [];
		}

		return Array.from({ length: versions.length }, (_, i) => i);
	}
}
