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
		enabled?: boolean;
		maxAge?: number;
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
