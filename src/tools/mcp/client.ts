import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpConfig } from "./types";

export class McpClientService {
	private config: McpConfig;

	constructor(config: McpConfig) {
		this.config = config;
	}

	/**
	 * Initializes and returns an MCP client based on configuration.
	 */
	async initialize(): Promise<Client> {
		try {
			let transport: Transport;

			// Configure transport based on mode
			if (this.config.transport.mode === "sse") {
				if (this.config.debug) {
					console.log(
						"🚀 Initializing MCP client in SSE mode",
						this.config.transport.serverUrl,
					);
				}

				// Merge headers from transport config and general config
				const headers = {
					...(this.config.transport.headers || {}),
					...(this.config.headers || {}),
				};

				transport = new SSEClientTransport(
					new URL(this.config.transport.serverUrl),
					{
						requestInit: {
							headers,
							// Add timeout to fetch if provided
							...(this.config.timeout ? { timeout: this.config.timeout } : {}),
						},
					},
				);
			} else {
				// STDIO mode
				if (this.config.debug) {
					console.log(
						"🚀 Initializing MCP client in STDIO mode",
						this.config.transport.command,
					);
				}

				transport = new StdioClientTransport({
					command: this.config.transport.command,
					args: this.config.transport.args,
					// StdioClientTransport might not support timeout directly
					// We'll handle it in the client logic if needed
				});
			}

			// Initialize client with version from config or default
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
			const connectPromise = client.connect(transport);

			if (this.config.timeout) {
				// Create a timeout promise
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => {
						reject(
							new Error(
								`MCP client connection timed out after ${this.config.timeout}ms`,
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

			return client;
		} catch (error) {
			console.error("Failed to initialize MCP client:", error);
			throw error;
		}
	}
}
