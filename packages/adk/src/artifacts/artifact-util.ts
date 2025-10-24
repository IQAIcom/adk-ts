import type { Part } from "@google/genai";

export interface ParsedArtifactUri {
	appName: string;
	userId: string;
	sessionId?: string;
	filename: string;
	version: number;
}

const SESSION_SCOPED_ARTIFACT_URI_RE =
	/^artifact:\/\/apps\/([^/]+)\/users\/([^/]+)\/sessions\/([^/]+)\/artifacts\/([^/]+)\/versions\/(\d+)$/;
const USER_SCOPED_ARTIFACT_URI_RE =
	/^artifact:\/\/apps\/([^/]+)\/users\/([^/]+)\/artifacts\/([^/]+)\/versions\/(\d+)$/;

export function parseArtifactUri(uri: string): ParsedArtifactUri | null {
	if (!uri || !uri.startsWith("artifact://")) {
		return null;
	}

	let match = SESSION_SCOPED_ARTIFACT_URI_RE.exec(uri);
	if (match) {
		return {
			appName: match[1],
			userId: match[2],
			sessionId: match[3],
			filename: match[4],
			version: Number.parseInt(match[5], 10),
		};
	}

	match = USER_SCOPED_ARTIFACT_URI_RE.exec(uri);
	if (match) {
		return {
			appName: match[1],
			userId: match[2],
			sessionId: undefined,
			filename: match[3],
			version: Number.parseInt(match[4], 10),
		};
	}

	return null;
}

export function getArtifactUri(args: {
	appName: string;
	userId: string;
	filename: string;
	version: number;
	sessionId?: string;
}): string {
	const { appName, userId, filename, version, sessionId } = args;

	if (sessionId) {
		return `artifact://apps/${appName}/users/${userId}/sessions/${sessionId}/artifacts/${filename}/versions/${version}`;
	}
	return `artifact://apps/${appName}/users/${userId}/artifacts/${filename}/versions/${version}`;
}

export function isArtifactRef(artifact: Part): boolean {
	return Boolean(
		artifact.fileData?.fileUri &&
			artifact.fileData.fileUri.startsWith("artifact://"),
	);
}
