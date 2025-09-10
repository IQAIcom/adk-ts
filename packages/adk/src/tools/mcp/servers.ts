import { McpToolset } from "./index";
import type { McpConfig, SamplingHandler } from "./types";

/**
 * Simplified MCP Server Wrappers
 *
 * This module provides simplified wrapper functions for IQAI MCP servers and popular third-party MCP servers.
 * Instead of manually configuring McpToolset with verbose configuration objects, you can use these
 * convenience functions with flexible configuration objects.
 *
 * @example
 * ```typescript
 * // Old verbose way:
 * const toolset = new McpToolset({
 *   name: "Near Intents Swaps MCP Client",
 *   description: "Client for Near Intents Swaps",
 *   debug: env.DEBUG,
 *   retryOptions: { maxRetries: 2, initialDelay: 200 },
 *   transport: {
 *     mode: "stdio",
 *     command: "npx",
 *     args: ["-y", "@iqai/mcp-near"],
 *     env: {
 *       ACCOUNT_ID: env.ACCOUNT_ID,
 *       ACCOUNT_KEY: env.ACCOUNT_KEY,
 *       NEAR_NETWORK_ID: "testnet",
 *       PATH: env.PATH
 *     },
 *   },
 * });
 *
 * // New simplified way:
 * const toolset = McpNearAgent({
 *   env: {
 *     ACCOUNT_ID: env.ACCOUNT_ID,
 *     ACCOUNT_KEY: env.ACCOUNT_KEY,
 *     NEAR_NETWORK_ID: "testnet",
 *     PATH: env.PATH
 *   }
 * });
 *
 * // Usage with LLM Agent:
 * const nearTools = await toolset.getTools();
 * const agent = new LlmAgent({
 *   name: "near_assistant",
 *   model: "gemini-2.5-flash",
 *   tools: nearTools,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Multiple MCP servers:
 * const atpTools = await McpAtp({
 *   env: {
 *     ATP_WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
 *     ATP_API_KEY: env.ATP_API_KEY
 *   }
 * }).getTools();
 *
 * const fraxlendTools = await McpFraxlend({
 *   env: {
 *     WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY
 *   }
 * }).getTools();
 *
 * const agent = new LlmAgent({
 *   name: "defi_assistant",
 *   model: "gemini-2.5-flash",
 *   tools: [...atpTools, ...fraxlendTools],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using MCP servers with sampling handlers:
 * import { createSamplingHandler, LlmResponse } from "@iqai/adk";
 *
 * const samplingHandler = createSamplingHandler(async (request) => {
 *   // Handle MCP sampling requests
 *   return new LlmResponse({
 *     content: {
 *       role: "model",
 *       parts: [{ text: "Response from sampling handler" }],
 *     },
 *   });
 * });
 *
 * const nearTools = await McpNearAgent({
 *   env: {
 *     ACCOUNT_ID: env.ACCOUNT_ID,
 *     ACCOUNT_KEY: env.ACCOUNT_KEY,
 *     NEAR_NETWORK_ID: "testnet",
 *     PATH: env.PATH
 *   },
 *   samplingHandler
 * }).getTools();
 *
 * const agent = new LlmAgent({
 *   name: "near_assistant",
 *   model: "gemini-2.5-flash",
 *   tools: nearTools,
 * });
 * ```
 */

/**
 * Base configuration interface for MCP servers
 */
export interface McpServerConfig {
	/** Environment variables to pass to the MCP server */
	env?: Record<string, any>;
	/** Enable debug logging */
	debug?: boolean;
	/** Custom description for the MCP server */
	description?: string;
	/** Retry configuration */
	retryOptions?: {
		maxRetries?: number;
		initialDelay?: number;
	};
	/** Sampling handler for processing MCP sampling requests */
	samplingHandler?: SamplingHandler;
}

/**
 * Creates a base MCP configuration from server config
 */
function createMcpConfig(
	name: string,
	packageName: string,
	config: McpServerConfig = {},
): McpConfig {
	const {
		debug,
		description,
		retryOptions,
		env: envVars = {},
		samplingHandler,
	} = config;

	// Convert all environment values to strings
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(envVars)) {
		if (value !== undefined) {
			env[key] = String(value);
		}
	}

	// Always include PATH if not provided
	if (!env.PATH) {
		env.PATH = process.env.PATH || "";
	}

	return {
		name,
		description: description || `Client for ${name}`,
		debug: debug || false,
		retryOptions: retryOptions || { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", packageName],
			env,
		},
		samplingHandler,
	};
}

/**
 * MCP ABI - Smart contract ABI interactions for Ethereum-compatible blockchains
 *
 * Required env vars: CONTRACT_ABI, CONTRACT_ADDRESS
 * Optional env vars: CONTRACT_NAME, CHAIN_ID, RPC_URL, WALLET_PRIVATE_KEY
 */
export function McpAbi(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig("ABI MCP Client", "@iqai/mcp-abi", config);
	return new McpToolset(mcpConfig);
}

/**
 * MCP ATP - Interact with the IQ AI Agent Tokenization Platform
 *
 * Required env vars: ATP_WALLET_PRIVATE_KEY, ATP_API_KEY
 */
export function McpAtp(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig("ATP MCP Client", "@iqai/mcp-atp", config);
	return new McpToolset(mcpConfig);
}

/**
 * MCP BAMM - Borrow Automated Market Maker operations on Fraxtal
 *
 * Required env vars: WALLET_PRIVATE_KEY
 */
export function McpBamm(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"BAMM MCP Client",
		"@iqai/mcp-bamm",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP FRAXLEND - Interact with the Fraxlend lending platform
 *
 * Required env vars: WALLET_PRIVATE_KEY
 */
export function McpFraxlend(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Fraxlend MCP Client",
		"@iqai/mcp-fraxlend",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP IQWiki - Access and manage IQ.wiki data and user activities
 *
 * No required env vars
 */
export function McpIqWiki(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"IQWiki MCP Client",
		"@iqai/mcp-iqwiki",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP NEAR Agent - NEAR Protocol blockchain integration with AI-driven event processing
 *
 * Required env vars: ACCOUNT_ID, ACCOUNT_KEY
 * Optional env vars: NEAR_NETWORK_ID, NEAR_NODE_URL, NEAR_GAS_LIMIT
 */
export function McpNearAgent(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"NEAR Agent MCP Client",
		"@iqai/mcp-near-agent",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP Near Intents Swaps - NEAR Protocol intent swaps functionality
 *
 * Required env vars: ACCOUNT_ID, ACCOUNT_KEY
 * Optional env vars: NEAR_NETWORK_ID, NEAR_NODE_URL, NEAR_GAS_LIMIT
 */
export function McpNearIntents(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Near Intents Swaps MCP Client",
		"@iqai/mcp-near-intents",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP ODOS - Interact with decentralized exchanges through ODOS aggregation
 *
 * Required env vars: WALLET_PRIVATE_KEY
 */
export function McpOdos(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"ODOS MCP Client",
		"@iqai/mcp-odos",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP Telegram - Interact with Telegram bots and channels
 *
 * Required env vars: TELEGRAM_BOT_TOKEN
 */
export function McpTelegram(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Telegram MCP Client",
		"@iqai/mcp-telegram",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP Discord - Interact with Discord via MCP protocol
 *
 * Required env vars: DISCORD_TOKEN
 * Optional env vars: PATH
 */
export function McpDiscord(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Discord MCP Client",
		"@iqai/mcp-discord",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP CoinGecko - Access cryptocurrency market data and analytics
 *
 * Optional env vars: COINGECKO_PRO_API_KEY, COINGECKO_DEMO_API_KEY, COINGECKO_ENVIRONMENT
 */
export function McpCoinGecko(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"CoinGecko MCP Client",
		"@coingecko/coingecko-mcp",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP Upbit - Interact with the Upbit cryptocurrency exchange
 *
 * Public tools require no auth.
 * Private trading tools require:
 *  - UPBIT_ACCESS_KEY
 *  - UPBIT_SECRET_KEY
 *  - UPBIT_ENABLE_TRADING=true
 */
export function McpUpbit(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Upbit MCP Client",
		"@iqai/mcp-upbit",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * Popular third-party MCP servers
 * These can be added as we expand support for community MCP servers
 */

/**
 * MCP Filesystem - File system operations (third-party)
 *
 * Optional env vars: ALLOWED_DIRECTORIES (comma-separated list)
 */
export function McpFilesystem(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Filesystem MCP Client",
		"@modelcontextprotocol/server-filesystem",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * MCP Memory - Memory and note-taking capabilities (third-party)
 *
 * No required env vars
 */
export function McpMemory(config: McpServerConfig = {}): McpToolset {
	const mcpConfig = createMcpConfig(
		"Memory MCP Client",
		"@modelcontextprotocol/server-memory",
		config,
	);
	return new McpToolset(mcpConfig);
}

/**
 * Generic MCP server function for any package
 *
 * @param packageName The npm package name of the MCP server
 * @param config Configuration object with environment variables and optional sampling handler
 * @param name Optional custom name for the client
 */
export function McpGeneric(
	packageName: string,
	config: McpServerConfig = {},
	name?: string,
): McpToolset {
	const clientName = name || `${packageName} Client`;
	const mcpConfig = createMcpConfig(clientName, packageName, config);
	return new McpToolset(mcpConfig);
}
