import {
	type Bucket,
	Storage,
	type StorageOptions,
} from "@google-cloud/storage";
import type { Part } from "@google/genai";
import type { BaseArtifactService } from "./base-artifact-service";

export class GcsArtifactService implements BaseArtifactService {
	private readonly bucketName: string;
	private readonly storageClient: Storage;
	private readonly bucket: Bucket;

	constructor(bucketName: string, options?: StorageOptions) {
		this.bucketName = bucketName;
		this.storageClient = new Storage(options);
		this.bucket = this.storageClient.bucket(this.bucketName);
	}

	private fileHasUserNamespace(filename: string): boolean {
		return filename.startsWith("user:");
	}

	private getBlobName(
		appName: string,
		userId: string,
		sessionId: string,
		filename: string,
		version: number | string,
	): string {
		if (this.fileHasUserNamespace(filename)) {
			return `${appName}/${userId}/user/${filename}/${version}`;
		}
		return `${appName}/${userId}/${sessionId}/${filename}/${version}`;
	}

	async saveArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		artifact: Part;
	}): Promise<number> {
		const { appName, userId, sessionId, filename, artifact } = args;

		const versions = await this.listVersions({
			appName,
			userId,
			sessionId,
			filename,
		});

		const version = versions.length === 0 ? 0 : Math.max(...versions) + 1;

		const blobName = this.getBlobName(
			appName,
			userId,
			sessionId,
			filename,
			version,
		);

		const blob = this.bucket.file(blobName);

		await blob.save(artifact.inlineData.data, {
			contentType: artifact.inlineData.mimeType,
			preconditionOpts: { ifGenerationMatch: 0 },
		});

		return version;
	}

	async loadArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		version?: number;
	}): Promise<Part | null> {
		let { version } = args;
		const { appName, userId, sessionId, filename } = args;

		if (version === undefined || version === null) {
			const versions = await this.listVersions({
				appName,
				userId,
				sessionId,
				filename,
			});
			if (versions.length === 0) {
				return null;
			}
			version = Math.max(...versions);
		}

		const blobName = this.getBlobName(
			appName,
			userId,
			sessionId,
			filename,
			version,
		);
		const blob = this.bucket.file(blobName);

		try {
			const [metadata] = await blob.getMetadata();
			const [artifactBuffer] = await blob.download();
			if (!artifactBuffer) {
				return null;
			}

			const part: Part = {
				inlineData: {
					data: artifactBuffer.toString(),
					mimeType: metadata.contentType || "application/octet-stream",
				},
			};
			return part;
		} catch (error: unknown) {
			if ((error as any)?.code === 404) {
				return null;
			}
			throw error;
		}
	}
	async listArtifactKeys(args: {
		appName: string;
		userId: string;
		sessionId: string;
	}): Promise<string[]> {
		const { appName, userId, sessionId } = args;
		const filenames = new Set<string>();

		const processBlobs = (blobNames: string[]) => {
			for (const name of blobNames) {
				const parts = name.split("/");
				if (parts.length === 5) {
					const filename = parts[3];
					filenames.add(filename);
				}
			}
		};

		const sessionPrefix = `${appName}/${userId}/${sessionId}/`;
		const [sessionBlobs] = await this.storageClient
			.bucket(this.bucketName)
			.getFiles({ prefix: sessionPrefix });
		processBlobs(sessionBlobs.map((b) => b.name));

		const userNamespacePrefix = `${appName}/${userId}/user/`;
		const [userNamespaceBlobs] = await this.storageClient
			.bucket(this.bucketName)
			.getFiles({ prefix: userNamespacePrefix });
		processBlobs(userNamespaceBlobs.map((b) => b.name));

		return Array.from(filenames).sort();
	}

	async deleteArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<void> {
		const { appName, userId, sessionId, filename } = args;
		const versions = await this.listVersions({
			appName,
			userId,
			sessionId,
			filename,
		});

		const deletePromises = versions.map((version) => {
			const blobName = this.getBlobName(
				appName,
				userId,
				sessionId,
				filename,
				version,
			);
			return this.bucket.file(blobName).delete();
		});

		await Promise.all(deletePromises);
	}

	async listVersions(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<number[]> {
		const { appName, userId, sessionId, filename } = args;
		const prefix = this.getBlobName(appName, userId, sessionId, filename, "");

		const [blobs] = await this.bucket.getFiles({ prefix });
		const versions: number[] = [];

		for (const blob of blobs) {
			const parts = blob.name.split("/");
			if (parts.length === 5) {
				const versionStr = parts[4];
				const versionNum = Number.parseInt(versionStr, 10);
				if (!Number.isNaN(versionNum)) {
					versions.push(versionNum);
				}
			}
		}

		return versions.sort((a, b) => a - b);
	}
}
