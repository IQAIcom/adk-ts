import { format } from "node:util";
import { InMemoryArtifactService } from "@iqai/adk";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { USER_ID_PREFIX } from "../../common/constants";
import { SessionsService } from "../sessions/sessions.service";

export interface ArtifactKey {
	filename: string;
}

export interface ArtifactVersion {
	version: number;
	timestamp: number;
}

export interface Artifact {
	filename: string;
	mimeType: string;
	contents: string | Uint8Array;
	version: number;
	timestamp: number;
}

@Injectable()
export class ArtifactsService {
	private logger: Logger;

	constructor(
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
		@Inject(InMemoryArtifactService)
		private readonly artifactService: InMemoryArtifactService,
	) {
		this.logger = new Logger("artifacts-service");
	}

	/**
	 * List all artifacts for a session
	 */
	async listArtifacts(
		agentPath: string,
		sessionId: string,
	): Promise<{ artifacts: ArtifactKey[] } | { error: string }> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			this.logger.log(format("Listing artifacts for session: %s", sessionId));

			const artifactKeys = await this.artifactService.listArtifactKeys({
				appName: loaded.appName,
				userId: this.getUserIdFromAgentPath(agentPath),
				sessionId,
			});

			return {
				artifacts: artifactKeys.map((filename) => ({
					filename,
				})),
			};
		} catch (error) {
			this.logger.error("Error listing artifacts: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * Get an artifact (latest version)
	 */
	async getArtifact(
		agentPath: string,
		sessionId: string,
		artifactName: string,
	): Promise<Artifact | { error: string }> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			this.logger.log(
				format("Getting artifact: %s for session: %s", artifactName, sessionId),
			);

			const artifact = await this.artifactService.loadArtifact({
				appName: loaded.appName,
				userId: this.getUserIdFromAgentPath(agentPath),
				sessionId,
				filename: artifactName,
			});

			if (!artifact) {
				return { error: `Artifact not found: ${artifactName}` };
			}

			// Extract content from Part object
			const contents = artifact.text || artifact.inlineData?.data || "";
			const mimeType = artifact.inlineData?.mimeType || "text/plain";

			return {
				filename: artifactName,
				mimeType,
				contents,
				version: 0, // Version will be determined from listVersions if needed
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error("Error getting artifact: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * Get a specific version of an artifact
	 */
	async getArtifactVersion(
		agentPath: string,
		sessionId: string,
		artifactName: string,
		version: number,
	): Promise<Artifact | { error: string }> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			this.logger.log(
				format(
					"Getting artifact version: %s v%d for session: %s",
					artifactName,
					version,
					sessionId,
				),
			);

			const artifact = await this.artifactService.loadArtifact({
				appName: loaded.appName,
				userId: this.getUserIdFromAgentPath(agentPath),
				sessionId,
				filename: artifactName,
				version,
			});

			if (!artifact) {
				return {
					error: `Artifact version not found: ${artifactName} v${version}`,
				};
			}

			// Extract content from Part object
			const contents = artifact.text || artifact.inlineData?.data || "";
			const mimeType = artifact.inlineData?.mimeType || "text/plain";

			return {
				filename: artifactName,
				mimeType,
				contents,
				version,
				timestamp: Date.now(),
			};
		} catch (error) {
			this.logger.error("Error getting artifact version: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * List all versions of an artifact
	 */
	async listArtifactVersions(
		agentPath: string,
		sessionId: string,
		artifactName: string,
	): Promise<{ versions: ArtifactVersion[] } | { error: string }> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			this.logger.log(
				format(
					"Listing artifact versions: %s for session: %s",
					artifactName,
					sessionId,
				),
			);

			const versions = await this.artifactService.listVersions({
				appName: loaded.appName,
				userId: this.getUserIdFromAgentPath(agentPath),
				sessionId,
				filename: artifactName,
			});

			return {
				versions: versions.map((version) => ({
					version,
					timestamp: Date.now(), // In-memory service doesn't track timestamps per version
				})),
			};
		} catch (error) {
			this.logger.error("Error listing artifact versions: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * Delete an artifact and all its versions
	 */
	async deleteArtifact(
		agentPath: string,
		sessionId: string,
		artifactName: string,
	): Promise<{ success: boolean } | { error: string }> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			this.logger.log(
				format(
					"Deleting artifact: %s for session: %s",
					artifactName,
					sessionId,
				),
			);

			await this.artifactService.deleteArtifact({
				appName: loaded.appName,
				userId: this.getUserIdFromAgentPath(agentPath),
				sessionId,
				filename: artifactName,
			});

			return { success: true };
		} catch (error) {
			this.logger.error("Error deleting artifact: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * Helper method to construct userId from agent path
	 */
	private getUserIdFromAgentPath(agentPath: string): string {
		return `${USER_ID_PREFIX}${agentPath}`;
	}
}
