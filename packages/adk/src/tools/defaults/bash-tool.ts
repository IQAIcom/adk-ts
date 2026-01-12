import { exec } from "node:child_process";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class BashTool extends BaseTool {
	constructor() {
		super({
			name: "bash",
			description: "Execute terminal commands in the working directory",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					command: {
						type: Type.STRING,
						description: "Shell command to execute",
					},
				},
				required: ["command"],
			},
		};
	}

	async runAsync(
		args: { command: string },
		_context: ToolContext,
	): Promise<any> {
		const { command } = args;

		// Warn about destructive commands (simple heuristic)
		if (
			command.includes("rm -rf /") ||
			command.includes(":(){:|:&};:") ||
			command.trim() === "rm -rf *"
		) {
			return {
				exit_code: -1,
				stdout: "",
				stderr: "Potentially destructive command detected. Operation blocked.",
			};
		}

		return new Promise((resolve) => {
			const timeout = 30000; // 30s
			exec(
				command,
				{ timeout, cwd: process.cwd() },
				(error, stdout, stderr) => {
					if (error) {
						// Check if it was a timeout
						if (error.signal === "SIGTERM") {
							resolve({
								exit_code: null,
								stdout,
								stderr: `${stderr}\nCommand timed out after 30s`,
							});
						} else {
							resolve({
								exit_code: error.code,
								stdout,
								stderr,
							});
						}
					} else {
						resolve({
							exit_code: 0,
							stdout,
							stderr,
						});
					}
				},
			);
		});
	}
}
