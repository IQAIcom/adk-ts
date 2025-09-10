import * as fs from "node:fs";
import * as path from "node:path";
import { Logger } from "@adk/logger";
import Docker from "dockerode";
import type { InvocationContext } from "../agents/invocation-context";
import {
	BaseCodeExecutor,
	type BaseCodeExecutorConfig,
} from "./base-code-executor";
import type {
	CodeExecutionInput,
	CodeExecutionResult,
} from "./code-execution-utils";

const DEFAULT_IMAGE_TAG = "adk-code-executor:latest";

/**
 * Configuration for ContainerCodeExecutor
 */
export interface ContainerCodeExecutorConfig extends BaseCodeExecutorConfig {
	/**
	 * Optional. The base URL of the user hosted Docker client.
	 */
	baseUrl?: string;

	/**
	 * The tag of the predefined image or custom image to run on the container.
	 * Either dockerPath or image must be set.
	 */
	image?: string;

	/**
	 * The path to the directory containing the Dockerfile.
	 * If set, build the image from the dockerfile path instead of using the predefined image.
	 * Either dockerPath or image must be set.
	 */
	dockerPath?: string;

	/**
	 * Timeout for code execution in milliseconds.
	 * Default: 30000 (30 seconds)
	 */
	executionTimeout?: number;
}

/**
 * A code executor that uses a custom container to execute code.
 *
 * This executor provides secure code execution by running Python code in isolated Docker containers.
 * It cannot be stateful and does not support data file optimization for security reasons.
 */
export class ContainerCodeExecutor extends BaseCodeExecutor {
	private readonly baseUrl?: string;
	private readonly image: string;
	private readonly dockerPath?: string;
	private readonly executionTimeout: number;
	private client?: Docker;
	private container?: Docker.Container;
	private isInitialized = false;
	protected logger = new Logger({ name: "ContainerCodeExecutor" });

	constructor(config: ContainerCodeExecutorConfig = {}) {
		// Validate configuration
		if (!config.image && !config.dockerPath) {
			throw new Error(
				"Either image or dockerPath must be set for ContainerCodeExecutor.",
			);
		}

		if (config.stateful) {
			throw new Error("Cannot set `stateful=true` in ContainerCodeExecutor.");
		}

		if (config.optimizeDataFile) {
			throw new Error(
				"Cannot set `optimizeDataFile=true` in ContainerCodeExecutor.",
			);
		}

		// Force these values to false for security
		const secureConfig = {
			...config,
			stateful: false,
			optimizeDataFile: false,
		};

		super(secureConfig);

		this.baseUrl = config.baseUrl;
		this.image = config.image || DEFAULT_IMAGE_TAG;
		this.dockerPath = config.dockerPath
			? path.resolve(config.dockerPath)
			: undefined;
		this.executionTimeout = config.executionTimeout ?? 30000;

		// Initialize Docker client
		this.client = this.baseUrl
			? new Docker({ host: this.baseUrl })
			: new Docker();

		// Setup cleanup on process exit
		this.setupCleanup();
	}

	async executeCode(
		invocationContext: InvocationContext,
		codeExecutionInput: CodeExecutionInput,
	): Promise<CodeExecutionResult> {
		await this.ensureInitialized();

		if (!this.container) {
			throw new Error("Container is not initialized");
		}

		this.logger.debug("Executing code in container", {
			containerId: this.container.id,
			codeLength: codeExecutionInput.code.length,
		});

		try {
			// Execute the Python code in the container
			const exec = await this.container.exec({
				Cmd: ["python3", "-c", codeExecutionInput.code],
				AttachStdout: true,
				AttachStderr: true,
			});

			const stream = await exec.start({ Detach: true });

			// Collect stdout and stderr with timeout
			const result = await Promise.race([
				this.collectOutput(stream, exec),
				this.createTimeoutPromise(),
			]);

			this.logger.debug("Code execution completed", {
				exitCode: result.exitCode,
				stdoutLength: result.stdout.length,
				stderrLength: result.stderr.length,
			});

			return {
				stdout: result.stdout,
				stderr: result.stderr,
				outputFiles: [], // Container executor doesn't support output files yet
			};
		} catch (error) {
			this.logger.error("Error executing code in container", error);

			if (error instanceof Error && error.message.includes("timeout")) {
				return {
					stdout: "",
					stderr: `Code execution timed out after ${this.executionTimeout}ms`,
					outputFiles: [],
				};
			}

			return {
				stdout: "",
				stderr: `Container execution error: ${error instanceof Error ? error.message : String(error)}`,
				outputFiles: [],
			};
		}
	}

	/**
	 * Collects output from the Docker exec stream
	 */
	private async collectOutput(
		stream: NodeJS.ReadableStream,
		exec: Docker.Exec,
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		return new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";

			stream.on("data", (chunk: Buffer) => {
				// Docker demux format: first byte indicates stream type
				const streamType = chunk[0];
				const data = chunk.slice(8).toString(); // Skip 8-byte header

				if (streamType === 1) {
					// stdout
					stdout += data;
				} else if (streamType === 2) {
					// stderr
					stderr += data;
				}
			});

			stream.on("end", async () => {
				try {
					const inspectResult = await exec.inspect();
					resolve({
						stdout: stdout.trim(),
						stderr: stderr.trim(),
						exitCode: inspectResult.ExitCode || 0,
					});
				} catch (error) {
					reject(error);
				}
			});

			stream.on("error", (error: Error) => {
				reject(error);
			});
		});
	}

	/**
	 * Creates a timeout promise for execution timeout
	 */
	private createTimeoutPromise(): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(
						`Code execution timed out after ${this.executionTimeout}ms`,
					),
				);
			}, this.executionTimeout);
		});
	}

	/**
	 * Ensures the container is initialized and ready for code execution
	 */
	private async ensureInitialized(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		await this.initContainer();
		this.isInitialized = true;
	}

	/**
	 * Builds the Docker image from the provided Dockerfile path
	 */
	private async buildDockerImage(): Promise<void> {
		if (!this.dockerPath) {
			throw new Error("Docker path is not set.");
		}

		if (!fs.existsSync(this.dockerPath)) {
			throw new Error(`Invalid Docker path: ${this.dockerPath}`);
		}

		if (!this.client) {
			throw new Error("Docker client is not initialized.");
		}

		this.logger.debug("Building Docker image...", {
			path: this.dockerPath,
			tag: this.image,
		});

		try {
			const stream = await this.client.buildImage(
				{
					context: this.dockerPath,
					src: ["Dockerfile"],
				},
				{
					t: this.image,
					rm: true,
				},
			);

			// Wait for build to complete
			await new Promise<void>((resolve, reject) => {
				this.client!.modem.followProgress(
					stream,
					(err: Error | null) => {
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					},
					(event: any) => {
						if (event.stream) {
							this.logger.debug("Build output:", event.stream.trim());
						}
					},
				);
			});

			this.logger.debug("Docker image built successfully", { tag: this.image });
		} catch (error) {
			this.logger.error("Failed to build Docker image", error);
			throw error;
		}
	}

	/**
	 * Verifies that the container has Python 3 installed
	 */
	private async verifyPythonInstallation(): Promise<void> {
		if (!this.container) {
			throw new Error("Container is not initialized");
		}

		try {
			const exec = await this.container.exec({
				Cmd: ["which", "python3"],
				AttachStdout: true,
				AttachStderr: true,
			});

			const stream = await exec.start({});
			await new Promise<void>((resolve, reject) => {
				stream.on("end", async () => {
					try {
						const inspectResult = await exec.inspect();
						if (inspectResult.ExitCode !== 0) {
							reject(new Error("python3 is not installed in the container."));
						} else {
							resolve();
						}
					} catch (error) {
						reject(error);
					}
				});

				stream.on("error", reject);
			});

			this.logger.debug("Python 3 installation verified");
		} catch (error) {
			this.logger.error("Python verification failed", error);
			throw new Error("python3 is not installed in the container.");
		}
	}

	/**
	 * Initializes the Docker container
	 */
	private async initContainer(): Promise<void> {
		if (!this.client) {
			throw new Error("Docker client is not initialized.");
		}

		// Build image if docker path is provided
		if (this.dockerPath) {
			await this.buildDockerImage();
		}

		this.logger.debug("Starting container for ContainerCodeExecutor...", {
			image: this.image,
		});

		try {
			// Create and start the container
			this.container = await this.client.createContainer({
				Image: this.image,
				Tty: true,
				OpenStdin: true,
				StdinOnce: false,
				AttachStdout: true,
				AttachStderr: true,
			});

			await this.container.start();

			this.logger.debug("Container started successfully", {
				containerId: this.container.id,
			});

			// Verify Python installation
			await this.verifyPythonInstallation();
		} catch (error) {
			this.logger.error("Failed to initialize container", error);
			await this.cleanupContainer(); // Clean up on failure
			throw error;
		}
	}

	/**
	 * Sets up cleanup handlers for graceful shutdown
	 */
	private setupCleanup(): void {
		const cleanup = () => {
			// Use synchronous cleanup for process exit
			this.cleanupContainer().catch((error) => {
				this.logger.error("Error during cleanup", error);
			});
		};

		// Handle various exit scenarios
		process.on("exit", cleanup);
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("uncaughtException", cleanup);
	}

	/**
	 * Cleans up the container on exit
	 */
	private async cleanupContainer(): Promise<void> {
		if (!this.container) {
			return;
		}

		try {
			this.logger.debug("Cleaning up container...", {
				containerId: this.container.id,
			});

			// Stop the container with a timeout
			await this.container.stop({ t: 10 });

			// Remove the container
			await this.container.remove();

			this.logger.debug("Container stopped and removed successfully", {
				containerId: this.container.id,
			});
		} catch (error) {
			this.logger.error("Error during container cleanup", error);
		} finally {
			this.container = undefined;
			this.isInitialized = false;
		}
	}

	/**
	 * Public method to manually cleanup resources
	 */
	async dispose(): Promise<void> {
		await this.cleanupContainer();
	}
}
