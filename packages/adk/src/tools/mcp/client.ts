import { Logger } from "@adk/logger";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { McpSamplingHandler } from "./sampling-handler";
import type { McpConfig, SamplingHandler } from "./types";
import { McpError, McpErrorType } from "./types";
import { withRetry } from "./utils";

export class McpClientService {
	private config: McpConfig;
	private client: Client | null = null;
	private transport: Transport | null = null;
	private isClosing = false;
	private mcpSamplingHandler: McpSamplingHandler | null = null;

	protected logger = new Logger({ name: "McpClientService" });

	constructor(config: McpConfig) {
		this.config = config;

		// Initialize sampling handler from config if provided
		if (config.samplingHandler) {
			this.mcpSamplingHandler = new McpSamplingHandler(config.samplingHandler);
		}
	}

	/**
	 * Initializes and returns an MCP client based on configuration.
	 * Will create a new client if one doesn't exist yet.
	 */
	async initialize(): Promise<Client> {
		if (this.isClosing) {
			throw new McpError(
				"Cannot initialize a client that is being closed",
				McpErrorType.RESOURCE_CLOSED_ERROR,
			);
		}

		if (this.client) {
			return this.client;
		}

		try {
			if (!this.transport) {
				this.transport = await this.createTransport();
			}

			const client = new Client(
				{
					name: this.config.name,
					version: "0.0.1",
				},
				{
					capabilities: {
						prompts: {},
						resources: {},
						tools: {},
						sampling: {}, // Enable sampling capability
					},
				},
			);

			// Set up timeout for client connection if provided
			const connectPromise = client.connect(this.transport);

			if (this.config.timeout) {
				// Create a timeout promise
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => {
						reject(
							new McpError(
								`MCP client connection timed out after ${this.config.timeout}ms`,
								McpErrorType.TIMEOUT_ERROR,
							),
						);
					}, this.config.timeout);
				});

				// Race the connection against the timeout
				await Promise.race([connectPromise, timeoutPromise]);
			} else {
				// No timeout, just wait for connection
				await connectPromise;
			}

			await this.setupSamplingHandler(client);

			this.logger.debug("✅ MCP client connected successfully");

			this.client = client;
			return client;
		} catch (error) {
			// Clean up resources on initialization failure
			await this.cleanupResources();

			// Convert to McpError if it's not already
			if (!(error instanceof McpError)) {
				this.logger.error("Failed to initialize MCP client:", error);
				throw new McpError(
					`Failed to initialize MCP client: ${error instanceof Error ? error.message : String(error)}`,
					McpErrorType.CONNECTION_ERROR,
					error instanceof Error ? error : undefined,
				);
			}
			throw error;
		}
	}

	/**
	 * Creates a transport based on the configuration.
	 */
	private async createTransport(): Promise<Transport> {
		try {
			// Configure transport based on mode
			if (this.config.transport.mode === "sse") {
				this.logger.debug(
					"🚀 Initializing MCP client in SSE mode",
					this.config.transport.serverUrl,
				);

				const headers = {
					...(this.config.transport.headers || {}),
					...(this.config.headers || {}),
				};

				return new SSEClientTransport(
					new URL(this.config.transport.serverUrl),
					{
						requestInit: {
							headers,
							...(this.config.timeout ? { timeout: this.config.timeout } : {}),
						},
					},
				);
			}

			// STDIO mode
			this.logger.debug(
				"🚀 Initializing MCP client in STDIO mode",
				this.config.transport.command,
			);

			return new StdioClientTransport({
				command: this.config.transport.command,
				args: this.config.transport.args,
				env: this.config.transport.env,
			});
		} catch (error) {
			throw new McpError(
				`Failed to create transport: ${error instanceof Error ? error.message : String(error)}`,
				McpErrorType.CONNECTION_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Re-initializes the MCP client when a session is closed.
	 * Used by the retry mechanism.
	 */
	async reinitialize(): Promise<void> {
		this.logger.debug("🔄 Reinitializing MCP client after closed connection");

		await this.cleanupResources();

		this.client = null;
		this.transport = null;

		await this.initialize();
	}

	/**
	 * Cleans up resources associated with this client service.
	 * Similar to Python's AsyncExitStack.aclose() functionality.
	 */
	private async cleanupResources(): Promise<void> {
		try {
			this.isClosing = true;

			// Close client if it exists
			if (this.client) {
				try {
					if (typeof this.client.close === "function") {
						await this.client.close();
					}
				} catch (err) {
					// Ignore
				}
			}

			if (
				this.transport &&
				typeof (this.transport as any).close === "function"
			) {
				await (this.transport as any).close();
			}

			this.logger.debug("🧹 Cleaned up MCP client resources");
		} catch (error) {
			this.logger.error("Error cleaning up MCP resources:", error);
		} finally {
			this.client = null;
			this.transport = null;
			this.isClosing = false;
		}
	}

	/**
	 * Call an MCP tool with retry capability if the session is closed.
	 */
	async callTool(name: string, args: Record<string, any>): Promise<any> {
		try {
			const wrappedCall = withRetry(
				async function (this: McpClientService): Promise<any> {
					const client = await this.initialize();
					return client.callTool({
						name,
						arguments: args,
					});
				},
				this,
				async (instance) => await instance.reinitialize(),
				this.config.retryOptions?.maxRetries || 2,
			);

			return await wrappedCall();
		} catch (error) {
			// Convert to McpError if it's not already
			if (!(error instanceof McpError)) {
				throw new McpError(
					`Error calling tool "${name}": ${error instanceof Error ? error.message : String(error)}`,
					McpErrorType.TOOL_EXECUTION_ERROR,
					error instanceof Error ? error : undefined,
				);
			}
			throw error;
		}
	}

	/**
	 * Closes and cleans up all resources.
	 * Should be called when the service is no longer needed.
	 * Similar to Python's close() method.
	 */
	async close(): Promise<void> {
		this.logger.debug("🔚 Closing MCP client service");
		await this.cleanupResources();
	}

	/**
	 * Checks if the client is currently connected
	 */
	isConnected(): boolean {
		return !!this.client && !this.isClosing;
	}

	private async setupSamplingHandler(client: Client): Promise<void> {
		if (!this.mcpSamplingHandler) {
			this.logger.debug(
				"⚠️ No sampling handler provided - sampling requests will be rejected",
			);
			return;
		}

		try {
			// Use the official MCP SDK schema for sampling requests
			client.setRequestHandler(
				CreateMessageRequestSchema,
				async (request: any) => {
					try {
						this.logger.debug("Received sampling request:", request);

						const response =
							await this.mcpSamplingHandler!.handleSamplingRequest(request);

						this.logger.debug("✅ Sampling request completed successfully");

						return response;
					} catch (error) {
						this.logger.error("❌ Error handling sampling request:", error);

						if (error instanceof McpError) {
							throw error;
						}

						throw new McpError(
							`Sampling request failed: ${error instanceof Error ? error.message : String(error)}`,
							McpErrorType.SAMPLING_ERROR,
							error instanceof Error ? error : undefined,
						);
					}
				},
			);

			this.logger.debug("🎯 Sampling handler registered successfully");
		} catch (error) {
			this.logger.error("Failed to setup sampling handler:", error);
			this.logger.debug(
				"⚠️ Sampling handler registration failed, continuing without sampling support",
			);
		}
	}

	/**
	 * Set a new ADK sampling handler
	 */
	setSamplingHandler(handler: SamplingHandler): void {
		this.mcpSamplingHandler = new McpSamplingHandler(handler);

		if (this.client) {
			this.setupSamplingHandler(this.client).catch((error) => {
				this.logger.error("Failed to update ADK sampling handler:", error);
			});
		}
	}

	/**
	 * Remove the sampling handler
	 */
	removeSamplingHandler(): void {
		this.mcpSamplingHandler = null;

		if (this.client) {
			try {
				this.client.removeRequestHandler?.("sampling/createMessage");
			} catch (error) {
				this.logger.error("Failed to remove sampling handler:", error);
			}
		}
	}
}
