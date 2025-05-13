export type McpConfig = {
	// Basic configuration
	name: string;
	description: string;
	transport: McpTransportType;

	// Optional configurations
	timeout?: number; // Request timeout in milliseconds
	retryOptions?: {
		maxRetries?: number; // Maximum number of retries for failed requests
		initialDelay?: number; // Initial delay before retry in milliseconds
		maxDelay?: number; // Maximum delay between retries in milliseconds
	};
	headers?: Record<string, string>;
	cacheConfig?: {
		enabled?: boolean; // Whether to cache tools (default: true)
		maxAge?: number; // Maximum age of cached tools in milliseconds
		maxSize?: number; // Maximum number of tools to cache
	};
	debug?: boolean;
};

export type McpTransportType =
	| {
			mode: "stdio";
			command: string;
			args: string[];
	  }
	| {
			mode: "sse";
			serverUrl: string;
			headers?: HeadersInit;
	  };

/**
 * Error types specific to the MCP client
 */
export enum McpErrorType {
	CONNECTION_ERROR = "connection_error",
	TOOL_EXECUTION_ERROR = "tool_execution_error",
	RESOURCE_CLOSED_ERROR = "resource_closed_error",
	TIMEOUT_ERROR = "timeout_error",
	INVALID_SCHEMA_ERROR = "invalid_schema_error",
}

/**
 * Custom error class for MCP-related errors
 */
export class McpError extends Error {
	type: McpErrorType;
	originalError?: Error;

	constructor(message: string, type: McpErrorType, originalError?: Error) {
		super(message);
		this.name = "McpError";
		this.type = type;
		this.originalError = originalError;
	}
}
