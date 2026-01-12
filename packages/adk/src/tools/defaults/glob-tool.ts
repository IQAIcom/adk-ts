import { glob } from "node:fs/promises";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class GlobTool extends BaseTool {
	constructor() {
		super({
			name: "glob",
			description: "Find files matching patterns (e.g., *.py , src/**/*.ts )",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					pattern: {
						type: Type.STRING,
						description: 'Glob pattern (e.g., "*.json")',
					},
				},
				required: ["pattern"],
			},
		};
	}

	async runAsync(
		args: { pattern: string },
		_context: ToolContext,
	): Promise<any> {
		try {
			const matches: string[] = [];

			// Use Node's built-in glob (Node 22+)
			const iterator = glob(args.pattern, {
				cwd: process.cwd(),
				exclude: (file) => {
					// Exclude node_modules and .git
					return file.includes("node_modules") || file.includes(".git");
				},
			});

			for await (const entry of iterator) {
				matches.push(entry);
			}

			return {
				success: true,
				data: matches,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
