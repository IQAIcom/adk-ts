import type { Part } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

interface ArtifactOperationResult {
	success: boolean;
	data?: any;
	error?: string;
	version?: number;
}

/**
 * Tool for performing artifact operations (save, load, list, delete)
 */
export class ArtifactsTool extends BaseTool {
	constructor() {
		super({
			name: "artifacts",
			description:
				"Manage user files and data using the artifact storage system",
		});
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					operation: {
						type: "string",
						description: "The artifact operation to perform",
						enum: ["save", "load", "list", "delete", "versions"],
					},
					filename: {
						type: "string",
						description:
							"Name of the file. Use 'user:' prefix for cross-session persistence (e.g., 'user:config.json')",
					},
					content: {
						type: "string",
						description: "Content to save (for save operation)",
					},
					mimeType: {
						type: "string",
						description: "MIME type of the content",
						default: "text/plain",
					},
					version: {
						type: "number",
						description:
							"Specific version to load (optional, defaults to latest)",
					},
				},
				required: ["operation"],
			},
		};
	}

	/**
	 * Execute the artifact operation
	 */
	async runAsync(
		args: {
			operation: "save" | "load" | "list" | "delete" | "versions";
			filename?: string;
			content?: string;
			mimeType?: string;
			version?: number;
		},
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		try {
			// Check if artifact service is available
			if (!context.artifactService) {
				return {
					success: false,
					error: "Artifact service not available",
				};
			}

			if (!context.userId || !context.appName) {
				return {
					success: false,
					error: "User ID and app name required for artifact operations",
				};
			}

			switch (args.operation) {
				case "save":
					return await this.saveArtifact(args, context);

				case "load":
					return await this.loadArtifact(args, context);

				case "list":
					return await this.listArtifacts(context);

				case "delete":
					return await this.deleteArtifact(args, context);

				case "versions":
					return await this.listVersions(args, context);

				default:
					throw new Error(`Unsupported operation: ${args.operation}`);
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Save an artifact
	 */
	private async saveArtifact(
		args: { filename?: string; content?: string; mimeType?: string },
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		if (!args.filename || !args.content) {
			return {
				success: false,
				error: "Filename and content are required for save operation",
			};
		}

		const artifact: Part = {
			inlineData: {
				data: Buffer.from(args.content).toString("base64"),
				mimeType: args.mimeType || "text/plain",
			},
		};

		try {
			const version = await context.saveArtifact(args.filename, artifact);

			return {
				success: true,
				data: `Saved "${args.filename}" successfully`,
				version,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to save artifact: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Load an artifact
	 */
	private async loadArtifact(
		args: { filename?: string; version?: number },
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		if (!args.filename) {
			return {
				success: false,
				error: "Filename is required for load operation",
			};
		}

		try {
			const artifact = await context.loadArtifact(args.filename, args.version);

			if (!artifact) {
				return {
					success: false,
					error: `Artifact "${args.filename}" not found`,
				};
			}

			const content = Buffer.from(
				artifact.inlineData.data,
				"base64",
			).toString();

			return {
				success: true,
				data: {
					filename: args.filename,
					content: content,
					mimeType: artifact.inlineData.mimeType,
					version: args.version || "latest",
				},
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to load artifact: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * List all artifacts
	 */
	private async listArtifacts(
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		try {
			const artifacts = await context.listArtifacts();

			return {
				success: true,
				data: {
					files: artifacts,
					count: artifacts.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to list artifacts: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Delete an artifact
	 */
	private async deleteArtifact(
		args: { filename?: string },
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		if (!args.filename) {
			return {
				success: false,
				error: "Filename is required for delete operation",
			};
		}

		try {
			await context.deleteArtifact(args.filename);

			return {
				success: true,
				data: `Deleted "${args.filename}" successfully`,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to delete artifact: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * List versions of an artifact
	 */
	private async listVersions(
		args: { filename?: string },
		context: ToolContext,
	): Promise<ArtifactOperationResult> {
		if (!args.filename) {
			return {
				success: false,
				error: "Filename is required for versions operation",
			};
		}

		try {
			const versions = await context.listArtifactVersions(args.filename);

			return {
				success: true,
				data: {
					filename: args.filename,
					versions: versions,
					count: versions.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to list versions: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
}
