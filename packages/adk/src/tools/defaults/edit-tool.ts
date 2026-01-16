import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export interface EditToolResult {
	success: boolean;
	data?: string;
	error?: string;
}

export class EditTool extends BaseTool {
	constructor() {
		super({
			name: "edit_file",
			description: "Make precise edits to existing files using search/replace",
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
						description: "File to edit",
					},
					old_str: {
						type: Type.STRING,
						description: "Exact text to find",
					},
					new_str: {
						type: Type.STRING,
						description: "Replacement text",
					},
				},
				required: ["path", "old_str", "new_str"],
			},
		};
	}

	async runAsync(
		args: { path: string; old_str: string; new_str: string },
		_context: ToolContext,
	): Promise<EditToolResult> {
		try {
			const filePath = path.resolve(process.cwd(), args.path);

			// Check if file exists
			try {
				await fs.access(filePath);
			} catch {
				return {
					success: false,
					error: `File not found: ${args.path}`,
				};
			}

			const content = await fs.readFile(filePath, "utf8");

			// Validate search string exists and is unique
			const parts = content.split(args.old_str);
			if (parts.length === 1) {
				return {
					success: false,
					error: `Search string not found in file: ${args.path}`,
				};
			}
			if (parts.length > 2) {
				return {
					success: false,
					error: `Search string found ${parts.length - 1} times in file. Please provide a more unique search string.`,
				};
			}

			const newContent = content.replace(args.old_str, args.new_str);
			await fs.writeFile(filePath, newContent, "utf8");

			const preview = `<<<<<< OLD\n${args.old_str}\n======\n${args.new_str}\n>>>>>> NEW`;
			return {
				success: true,
				data: `File edited successfully.\n${preview}`,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
