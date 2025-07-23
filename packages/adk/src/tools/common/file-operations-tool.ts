import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

interface FileOperationResult {
	success: boolean;
	data?: any;
	error?: string;
}

/**
 * Tool for performing file system operations
 */
export class FileOperationsTool extends BaseTool {
	private basePath: string;

	constructor(options?: { basePath?: string }) {
		super({
			name: "file_operations",
			description:
				"Perform file system operations like reading, writing, and managing files",
		});

		// Default to current working directory if no base path is provided
		this.basePath = options?.basePath || process.cwd();
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					operation: {
						type: Type.STRING,
						description: "The file operation to perform",
						enum: [
							"read",
							"write",
							"append",
							"delete",
							"exists",
							"list",
							"mkdir",
						],
					},
					filepath: {
						type: Type.STRING,
						description:
							"Path to the file or directory (relative to the base path)",
					},
					content: {
						type: Type.STRING,
						description:
							"Content to write to the file (for write and append operations)",
					},
					encoding: {
						type: Type.STRING,
						description: "File encoding to use",
						default: "utf8",
					},
				},
				required: ["operation", "filepath"],
			},
		};
	}

	/**
	 * Execute the file operation
	 */
	async runAsync(
		args: {
			operation:
				| "read"
				| "write"
				| "append"
				| "delete"
				| "exists"
				| "list"
				| "mkdir";
			filepath: string;
			content?: string;
			encoding?: BufferEncoding;
		},
		_context: ToolContext,
	): Promise<FileOperationResult> {
		try {
			// Resolve the full file path, ensuring it's within the base path
			const resolvedPath = this.resolvePath(args.filepath);

			// Validate the path is within the base path (for security)
			this.validatePath(resolvedPath);

			// Determine encoding
			const encoding = args.encoding || "utf8";

			switch (args.operation) {
				case "read":
					return await this.readFile(resolvedPath, encoding);

				case "write":
					return await this.writeFile(
						resolvedPath,
						args.content || "",
						encoding,
					);

				case "append":
					return await this.appendFile(
						resolvedPath,
						args.content || "",
						encoding,
					);

				case "delete":
					return await this.deleteFile(resolvedPath);

				case "exists":
					return await this.fileExists(resolvedPath);

				case "list":
					return await this.listDirectory(resolvedPath);

				case "mkdir":
					return await this.makeDirectory(resolvedPath);

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
	 * Resolve a file path relative to the base path
	 */
	private resolvePath(filepath: string): string {
		// If the path is absolute, use it directly; otherwise, resolve it relative to base path
		return path.isAbsolute(filepath)
			? filepath
			: path.resolve(this.basePath, filepath);
	}

	/**
	 * Validate that a path is within the base path for security
	 */
	private validatePath(filepath: string): void {
		const normalizedPath = path.normalize(filepath);
		const normalizedBasePath = path.normalize(this.basePath);

		// Check if the path is outside the base path
		if (!normalizedPath.startsWith(normalizedBasePath)) {
			throw new Error(
				`Access denied: Can't access paths outside the base directory`,
			);
		}
	}

	/**
	 * Read a file
	 */
	private async readFile(
		filepath: string,
		encoding: BufferEncoding,
	): Promise<FileOperationResult> {
		try {
			const content = await fs.readFile(filepath, { encoding });
			return {
				success: true,
				data: content,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Write to a file
	 */
	private async writeFile(
		filepath: string,
		content: string,
		encoding: BufferEncoding,
	): Promise<FileOperationResult> {
		try {
			// Ensure the directory exists
			const dir = path.dirname(filepath);
			await fs.mkdir(dir, { recursive: true });

			await fs.writeFile(filepath, content, { encoding });
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to write to file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Append to a file
	 */
	private async appendFile(
		filepath: string,
		content: string,
		encoding: BufferEncoding,
	): Promise<FileOperationResult> {
		try {
			// Ensure the directory exists
			const dir = path.dirname(filepath);
			await fs.mkdir(dir, { recursive: true });

			await fs.appendFile(filepath, content, { encoding });
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to append to file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Delete a file
	 */
	private async deleteFile(filepath: string): Promise<FileOperationResult> {
		try {
			await fs.unlink(filepath);
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Check if a file exists
	 */
	private async fileExists(filepath: string): Promise<FileOperationResult> {
		try {
			await fs.access(filepath);
			return {
				success: true,
				data: true,
			};
		} catch {
			return {
				success: true,
				data: false,
			};
		}
	}

	/**
	 * List directory contents
	 */
	private async listDirectory(dirpath: string): Promise<FileOperationResult> {
		try {
			const entries = await fs.readdir(dirpath, { withFileTypes: true });

			const results = await Promise.all(
				entries.map(async (entry) => {
					const entryPath = path.join(dirpath, entry.name);
					const stats = await fs.stat(entryPath);

					return {
						name: entry.name,
						path: entryPath,
						isFile: entry.isFile(),
						isDirectory: entry.isDirectory(),
						size: stats.size,
						created: stats.birthtime,
						modified: stats.mtime,
					};
				}),
			);

			return {
				success: true,
				data: results,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Create a directory
	 */
	private async makeDirectory(dirpath: string): Promise<FileOperationResult> {
		try {
			await fs.mkdir(dirpath, { recursive: true });
			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
}
