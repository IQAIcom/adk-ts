import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export interface WriteToolResult {
	success: boolean;
	data?: string;
	error?: string;
}

export class WriteTool extends BaseTool {
	constructor() {
		super({
			name: "write_file",
			description: "Create new files with specified content",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					path: {
						type: Type.STRING,
						description: "Target file path",
					},
					content: {
						type: Type.STRING,
						description: "Content to write",
					},
				},
				required: ["path", "content"],
			},
		};
	}

	async runAsync(
		args: { path: string; content: string },
		_context: ToolContext,
	): Promise<WriteToolResult> {
		try {
			const filePath = path.resolve(process.cwd(), args.path);

			// Prevent accidental overwrites
			try {
				await fs.access(filePath);
				return {
					success: false,
					error: `File already exists: ${args.path}. Use edit_file to modify existing files.`,
				};
			} catch {
				// File does not exist, proceed
			}

			// Create parent directories if needed
			const dir = path.dirname(filePath);
			await fs.mkdir(dir, { recursive: true });

			await fs.writeFile(filePath, args.content, "utf8");
			return {
				success: true,
				data: `File created successfully: ${args.path}`,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
