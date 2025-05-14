import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpConfig } from "./types";
import { McpError, McpErrorType } from "./types";
import { withRetry } from "./utils";

export class McpClientService {
	private config: McpConfig;
	private client: Client | null = null;
	private transport: Transport | null = null;
	private isClosing = false;

	constructor(config: McpConfig) {
		this.config = config;
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

			if (this.config.debug) {
				console.log("✅ MCP client connected successfully");
			}

			this.client = client;
			return client;
		} catch (error) {
			// Clean up resources on initialization failure
			await this.cleanupResources();

			// Convert to McpError if it's not already
			if (!(error instanceof McpError)) {
				console.error("Failed to initialize MCP client:", error);
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
				if (this.config.debug) {
					console.log(
						"🚀 Initializing MCP client in SSE mode",
						this.config.transport.serverUrl,
					);
				}

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
			if (this.config.debug) {
				console.log(
					"🚀 Initializing MCP client in STDIO mode",
					this.config.transport.command,
				);
			}

			return new StdioClientTransport({
				command: this.config.transport.command,
				args: this.config.transport.args,
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
		if (this.config.debug) {
			console.log("🔄 Reinitializing MCP client after closed connection");
		}

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
					if (typeof (this.client as any).close === "function") {
						await (this.client as any).close();
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

			if (this.config.debug) {
				console.log("🧹 Cleaned up MCP client resources");
			}
		} catch (error) {
			console.error("Error cleaning up MCP resources:", error);
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
		if (this.config.debug) {
			console.log("🔚 Closing MCP client service");
		}
		await this.cleanupResources();
	}

	/**
	 * Checks if the client is currently connected
	 */
	isConnected(): boolean {
		return !!this.client && !this.isClosing;
	}
}
