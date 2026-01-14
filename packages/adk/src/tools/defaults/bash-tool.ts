import { exec } from "node:child_process";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export interface BashToolResult {
	exit_code: number | null;
	stdout: string;
	stderr: string;
	blocked?: boolean;
	reason?: string;
}

export interface BashToolConfig {
	enabled: boolean;
	mode: "disabled" | "whitelist" | "sandboxed" | "unrestricted";
	dockerImage?: string;
	allowedCommands?: string[];
	maxTimeout?: number;
	requireConfirmation?: boolean;
	enableLogging?: boolean;
}

export class BashTool extends BaseTool {
	private config: Required<BashToolConfig>;
	private commandLog: Array<{
		timestamp: Date;
		command: string;
		result: string;
	}> = [];

	private static readonly DEFAULT_WHITELIST = [
		"ls",
		"pwd",
		"echo",
		"cat",
		"head",
		"tail",
		"wc",
		"grep",
		"find",
		"date",
		"whoami",
		"hostname",
		"uname",
		"df",
		"du",
		"ps",
		"top",
		"free",
		"uptime",
		"which",
		"whereis",
		"file",
		"stat",
		"env",
		"printenv",
		"diff",
		"sort",
		"uniq",
		"cut",
		"awk",
		"sed",
		"tr",
		"basename",
		"dirname",
		"realpath",
	];

	private static readonly DANGEROUS_PATTERNS = [
		/rm\s+-rf\s+\/(?!\w)/, // rm -rf / (but allow /tmp, /var, etc.)
		/:\(\)\{.*\|:.*&\};:/, // fork bomb
		/>\s*\/dev\/sd[a-z]/, // writing to disk devices
		/mkfs/, // filesystem formatting
		/dd\s+if=/, // disk operations
		/wget.*\|\s*sh/, // download and execute
		/curl.*\|\s*bash/, // download and execute
		/eval\s+['"`]/, // eval with strings
		/base64.*\|\s*sh/, // decode and execute
		/nc\s+-.*e/, // netcat reverse shell
		/\/proc\/.*\/mem/, // memory access
		/iptables/, // firewall manipulation
		/chmod\s+777/, // overly permissive
		/chown\s+root/, // ownership changes
		/sudo/, // privilege escalation
		/su\s+/, // user switching
	];

	// Special characters that enable command chaining/injection
	private static readonly DANGEROUS_CHARS = /[;&|`$()<>]/;

	constructor(config: Partial<BashToolConfig> = {}) {
		super({
			name: "bash",
			description: "Execute terminal commands with security restrictions",
		});

		// Merge config with defaults
		this.config = {
			enabled: false,
			mode: "disabled",
			dockerImage: "alpine:latest",
			allowedCommands: BashTool.DEFAULT_WHITELIST,
			maxTimeout: 30000,
			requireConfirmation: false,
			enableLogging: true,
			...config,
		};

		// Validate configuration
		if (!this.config.enabled) {
			throw new Error(
				"BashTool is DISABLED by default due to critical security risks.\n" +
					"Only enable in trusted, sandboxed environments.\n" +
					"To enable, pass: new BashTool({ enabled: true, mode: 'whitelist' })\n\n" +
					"Available modes:\n" +
					"  - 'whitelist': Only allow pre-approved safe commands\n" +
					"  - 'sandboxed': Run commands in isolated Docker containers\n" +
					"  - 'unrestricted': DANGEROUS - No restrictions (dev only)\n\n" +
					"See documentation for security implications.",
			);
		}

		if (this.config.mode === "unrestricted") {
			console.warn(
				"⚠️  WARNING: BashTool running in UNRESTRICTED mode!\n" +
					"   This allows arbitrary code execution on the host.\n" +
					"   Only use in isolated development environments.\n",
			);
		}
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: `${this.description} (Mode: ${this.config.mode})`,
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
	): Promise<BashToolResult> {
		const { command } = args;

		// Log command if enabled
		if (this.config.enableLogging) {
			this.logCommand(command);
		}

		// Security validation
		const validationResult = this.validateCommand(command);
		if (!validationResult.safe) {
			return {
				exit_code: -1,
				stdout: "",
				stderr: validationResult.reason || "Command blocked by security policy",
				blocked: true,
				reason: validationResult.reason,
			};
		}

		// Execute based on mode
		switch (this.config.mode) {
			case "sandboxed":
				return await this.executeSandboxed(command);
			case "whitelist":
			case "unrestricted":
				return await this.executeDirect(command);
			default:
				return {
					exit_code: -1,
					stdout: "",
					stderr: "BashTool is disabled",
					blocked: true,
				};
		}
	}

	private validateCommand(command: string): { safe: boolean; reason?: string } {
		const trimmed = command.trim();

		// Check for empty command
		if (!trimmed) {
			return { safe: false, reason: "Empty command" };
		}

		// Always block dangerous patterns regardless of mode
		for (const pattern of BashTool.DANGEROUS_PATTERNS) {
			if (pattern.test(trimmed)) {
				return {
					safe: false,
					reason: `Dangerous pattern detected: ${pattern.source}`,
				};
			}
		}

		if (this.config.mode === "whitelist") {
			return this.validateWhitelist(trimmed);
		}

		return { safe: true };
	}

	private validateWhitelist(command: string): {
		safe: boolean;
		reason?: string;
	} {
		// Extract base command (first word)
		const baseCommand = command.split(/\s+/)[0];

		// Check if command is in whitelist
		if (!this.config.allowedCommands!.includes(baseCommand)) {
			return {
				safe: false,
				reason: `Command '${baseCommand}' not in whitelist. Allowed: ${this.config.allowedCommands!.join(", ")}`,
			};
		}

		// Block dangerous shell characters in whitelist mode
		if (BashTool.DANGEROUS_CHARS.test(command)) {
			return {
				safe: false,
				reason:
					"Special shell characters (;&|`$()<>) not permitted in whitelist mode",
			};
		}

		// Block path traversal attempts
		if (command.includes("..")) {
			return {
				safe: false,
				reason: "Path traversal (..) not permitted",
			};
		}

		return { safe: true };
	}

	private async executeDirect(command: string): Promise<BashToolResult> {
		return new Promise((resolve) => {
			exec(
				command,
				{
					timeout: this.config.maxTimeout,
					cwd: process.cwd(),
					env: { ...process.env, PATH: process.env.PATH }, // Minimal env
				},
				(error, stdout, stderr) => {
					if (error) {
						if (error.signal === "SIGTERM") {
							resolve({
								exit_code: null,
								stdout,
								stderr: `${stderr}\nCommand timed out after ${this.config.maxTimeout}ms`,
							});
						} else {
							resolve({
								exit_code: error.code ?? -1,
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

	private async executeSandboxed(command: string): Promise<BashToolResult> {
		// Escape single quotes in command
		const sanitizedCommand = command.replace(/'/g, "'\\''");

		// Build Docker command with security restrictions
		const dockerCommand = [
			"docker run",
			"--rm", // Remove container after execution
			"--network none", // No network access
			"--read-only", // Read-only root filesystem
			"--tmpfs /tmp:rw,noexec,nosuid,size=100m", // Writable /tmp but no execution
			"--cap-drop ALL", // Drop all capabilities
			"--security-opt no-new-privileges", // Prevent privilege escalation
			"--memory 256m", // Memory limit
			"--cpus 0.5", // CPU limit
			"--pids-limit 100", // Process limit
			"-w /workspace", // Working directory
			this.config.dockerImage,
			`sh -c '${sanitizedCommand}'`,
		].join(" ");

		return new Promise((resolve) => {
			exec(
				dockerCommand,
				{ timeout: this.config.maxTimeout },
				(error, stdout, stderr) => {
					if (error) {
						// Check if Docker is not available
						if (
							stderr.includes("docker: not found") ||
							stderr.includes("Cannot connect to Docker")
						) {
							resolve({
								exit_code: -1,
								stdout: "",
								stderr:
									"Docker not available. Install Docker or use 'whitelist' mode instead.",
								blocked: true,
							});
							return;
						}

						if (error.signal === "SIGTERM") {
							resolve({
								exit_code: null,
								stdout,
								stderr: `${stderr}\nCommand timed out after ${this.config.maxTimeout}ms`,
							});
						} else {
							resolve({
								exit_code: error.code ?? -1,
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

	private logCommand(command: string): void {
		this.commandLog.push({
			timestamp: new Date(),
			command,
			result: "pending",
		});

		// Keep only last 100 commands
		if (this.commandLog.length > 100) {
			this.commandLog.shift();
		}
	}

	// Public method to get command history
	public getCommandHistory(): typeof this.commandLog {
		return [...this.commandLog];
	}

	// Public method to clear command history
	public clearCommandHistory(): void {
		this.commandLog = [];
	}
}
