import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface McpServer {
	slug: string;
	name: string;
	package: string;
	skip?: boolean;
	skipReason?: string;
}

interface McpToolData {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

interface McpServerResult {
	name: string;
	package: string;
	tools: McpToolData[];
	error: string | null;
}

const DUMMY_ENV: Record<string, string> = {
	PATH: process.env.PATH || "",
	WALLET_PRIVATE_KEY:
		"0x0000000000000000000000000000000000000000000000000000000000000001",
	ATP_WALLET_PRIVATE_KEY:
		"0x0000000000000000000000000000000000000000000000000000000000000001",
	ATP_API_KEY: "dummy",
	TELEGRAM_BOT_TOKEN: "000000000:AAFdummytokenvalue",
	DISCORD_TOKEN: "dummy_discord_token",
	ACCOUNT_ID: "dummy.testnet",
	ACCOUNT_KEY:
		"ed25519:5fGF5mfbLNTPGLCCz1NQXV6QXMJ9GkSbEMDdkNMpDqP6bKqxqvNBQtbZ1234567890abcdef",
	NEAR_NETWORK_ID: "testnet",
	FUNDER_ADDRESS: "0x0000000000000000000000000000000000000001",
	POLYMARKET_PRIVATE_KEY:
		"0x0000000000000000000000000000000000000000000000000000000000000001",
	DEBANK_API_KEY: "dummy_debank_api_key",
	DEFILLAMA_API_KEY: "dummy_defillama_api_key",
	KALSHI_API_KEY: "dummy_kalshi_api_key",
	KALSHI_PRIVATE_KEY_PEM:
		"-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu\nKUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEm\no3qGy0t6z09AIJtH+5OeRV1be+N4cDYJKffGzDa88vQENZiRm0GRq6a+HPGQMd2k\nTQIhAKMSvzIBnni7ot/OSie2TmJLY4SwTQAevXysE2RbFDYdAiEBvHCS1mknvGuV\nIU3IYO/vtXz9Cwvq6gR4SMbQOBW5p0UCIHewg9cLG/u8Rx85cxCZfXcq5/v0gWq3\nAAAAAAAAAAAA\n-----END RSA PRIVATE KEY-----",
	OPINION_API_KEY: "dummy_opinion_api_key",
};

const MCP_SERVERS: McpServer[] = [
	{
		slug: "abi",
		name: "ABI MCP Client",
		package: "@iqai/mcp-abi",
		skip: true,
		skipReason:
			"Tools are dynamically generated from a user-provided contract ABI",
	},
	{ slug: "atp", name: "ATP MCP Client", package: "@iqai/mcp-atp" },
	{ slug: "bamm", name: "BAMM MCP Client", package: "@iqai/mcp-bamm" },
	{
		slug: "fraxlend",
		name: "Fraxlend MCP Client",
		package: "@iqai/mcp-fraxlend",
	},
	{ slug: "iqwiki", name: "IQWiki MCP Client", package: "@iqai/mcp-iqwiki" },
	{
		slug: "near-agent",
		name: "NEAR Agent MCP Client",
		package: "@iqai/mcp-near-agent",
	},
	{
		slug: "near-intents",
		name: "Near Intents Swaps MCP Client",
		package: "@iqai/mcp-near-intents",
	},
	{ slug: "odos", name: "ODOS MCP Client", package: "@iqai/mcp-odos" },
	{
		slug: "telegram",
		name: "Telegram MCP Client",
		package: "@iqai/mcp-telegram",
	},
	{
		slug: "discord",
		name: "Discord MCP Client",
		package: "@iqai/mcp-discord",
	},
	{
		slug: "coingecko",
		name: "CoinGecko MCP Client",
		package: "https://mcp.api.coingecko.com/mcp",
		skip: true,
		skipReason:
			"Remote MCP endpoint requires browser-based authorization via mcp-remote",
	},
	{
		slug: "coingecko-pro",
		name: "CoinGecko Pro MCP Client",
		package: "https://mcp.pro-api.coingecko.com/mcp",
		skip: true,
		skipReason:
			"Remote MCP endpoint requires CoinGecko Pro API key authorization",
	},
	{ slug: "upbit", name: "Upbit MCP Client", package: "@iqai/mcp-upbit" },
	{
		slug: "polymarket",
		name: "Polymarket MCP Client",
		package: "@iqai/mcp-polymarket",
	},
	{
		slug: "debank",
		name: "DeBank MCP Client",
		package: "@iqai/mcp-debank",
	},
	{
		slug: "defillama",
		name: "DefiLlama MCP Client",
		package: "@iqai/defillama-mcp",
	},
	{
		slug: "kalshi",
		name: "Kalshi MCP Client",
		package: "@iqai/mcp-kalshi",
	},
	{
		slug: "limitless",
		name: "Limitless MCP Client",
		package: "@iqai/mcp-limitless",
	},
	{
		slug: "opinion",
		name: "Opinion MCP Client",
		package: "@iqai/mcp-opinion",
	},
];

const TIMEOUT_MS = 60_000;

function isUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

async function fetchToolsForServer(
	server: McpServer,
): Promise<McpServerResult> {
	if (server.skip) {
		return {
			name: server.name,
			package: server.package,
			tools: [],
			error: server.skipReason || "Skipped",
		};
	}

	const args = isUrl(server.package)
		? ["-y", "mcp-remote@latest", server.package]
		: ["-y", server.package];

	const transport = new StdioClientTransport({
		command: "npx",
		args,
		env: DUMMY_ENV,
	});

	const client = new Client(
		{ name: `docs-fetcher-${server.slug}`, version: "0.0.1" },
		{ capabilities: {} },
	);

	try {
		await Promise.race([
			client.connect(transport),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Connection timeout")), TIMEOUT_MS),
			),
		]);

		const result = await Promise.race([
			client.listTools(),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("listTools timeout")), TIMEOUT_MS),
			),
		]);

		const tools: McpToolData[] = (result.tools || []).map((tool) => ({
			name: tool.name,
			description: tool.description || "",
			inputSchema: tool.inputSchema || { type: "object", properties: {} },
		}));

		return {
			name: server.name,
			package: server.package,
			tools,
			error: null,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  Failed: ${message}`);
		return {
			name: server.name,
			package: server.package,
			tools: [],
			error: message,
		};
	} finally {
		try {
			await client.close();
		} catch {}
		try {
			await transport.close();
		} catch {}
	}
}

async function main() {
	const servers: Record<string, McpServerResult> = {};

	for (const server of MCP_SERVERS) {
		console.log(`Fetching tools for ${server.slug}...`);
		const result = await fetchToolsForServer(server);
		servers[server.slug] = result;
		console.log(
			`  -> ${result.tools.length} tools${result.error ? ` (${result.error})` : ""}`,
		);
	}

	const output = {
		generatedAt: new Date().toISOString(),
		servers,
	};

	const outputPath = path.join(__dirname, "../data/mcp-tools.json");
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
	console.log(`\nWrote tool data to ${outputPath}`);
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
