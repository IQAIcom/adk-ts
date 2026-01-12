import fs from "node:fs/promises";
import path from "node:path";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class ReadTool extends BaseTool {
	constructor() {
		super({
			name: "read_file",
			description: "Read contents of any file in the working directory",
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
						description: "Relative or absolute file path",
					},
				},
				required: ["path"],
			},
		};
	}

	async runAsync(args: { path: string }, _context: ToolContext): Promise<any> {
		try {
			const filePath = path.resolve(process.cwd(), args.path);

			// Check if file exists first to give clear error
			try {
				await fs.access(filePath);
			} catch {
				return {
					success: false,
					error: `File not found: ${args.path}`,
				};
			}

			// Check for binary
			const handle = await fs.open(filePath, "r");
			const buffer = Buffer.alloc(1024);
			const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
			await handle.close();

			let isBinary = false;
			for (let i = 0; i < bytesRead; i++) {
				if (buffer[i] === 0) {
					isBinary = true;
					break;
				}
			}

			if (isBinary) {
				return {
					success: false,
					error: "File appears to be binary and cannot be read as text.",
				};
			}

			const content = await fs.readFile(filePath, "utf8");
			return {
				success: true,
				data: content,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
