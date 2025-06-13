import type { Part } from "@google/genai";

export interface BaseArtifactService {
	saveArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		artifact: Part;
	}): Promise<number>;

	loadArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
		version?: number;
	}): Promise<Part | null>;

	listArtifactKeys(args: {
		appName: string;
		userId: string;
		sessionId: string;
	}): Promise<string[]>;

	deleteArtifact(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<void>;

	listVersions(args: {
		appName: string;
		userId: string;
		sessionId: string;
		filename: string;
	}): Promise<number[]>;
}
