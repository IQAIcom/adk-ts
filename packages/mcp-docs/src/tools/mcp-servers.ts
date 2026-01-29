import fs from "node:fs/promises";
import path from "node:path";
import type { FastMCP } from "fastmcp";
import matter from "gray-matter";
import { z } from "zod";
import { logger } from "../logger.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const pkgRoot = path.resolve(__dirname, "../../");
const MCP_SERVERS_DIR = path.resolve(
	pkgRoot,
	"../../apps/docs/content/docs/mcp-servers",
);

const mcpServersInputSchema = z.object({
	server: z
		.string()
		.optional()
		.describe(
			"Specific MCP server name to get details for (e.g., 'telegram', 'coingecko', 'near-agent')",
		),
	list: z
		.boolean()
		.optional()
		.default(false)
		.describe("If true, list all available MCP servers"),
});

type McpServersInput = z.infer<typeof mcpServersInputSchema>;

interface McpServerDoc {
	name: string;
	title: string;
	description: string;
	path: string;
	content: string;
}

// Load MCP server info from docs
async function loadMcpServers(): Promise<McpServerDoc[]> {
	const servers: McpServerDoc[] = [];

	try {
		const files = await fs.readdir(MCP_SERVERS_DIR);

		for (const file of files.filter(
			(f) => f.endsWith(".mdx") && f !== "index.mdx",
		)) {
			try {
				const filePath = path.join(MCP_SERVERS_DIR, file);
				const raw = await fs.readFile(filePath, "utf-8");
				const { data: frontmatter, content } = matter(raw);

				const name = file.replace(".mdx", "");
				servers.push({
					name,
					title: frontmatter.title ?? name,
					description: frontmatter.description ?? "",
					path: `mcp-servers/${file}`,
					content: stripMdxComponents(content),
				});
			} catch {
				// Skip invalid files
			}
		}
	} catch (error) {
		logger.error("Failed to load MCP servers", error);
	}

	return servers;
}

// Strip MDX components from content
function stripMdxComponents(content: string): string {
	return content
		.replace(/^import\s+.*$/gm, "")
		.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, "")
		.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, "")
		.replace(/<\/?[A-Z][a-zA-Z]*[^>]*>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// Cache for loaded servers
let serversCache: McpServerDoc[] | null = null;

async function getCachedServers(): Promise<McpServerDoc[]> {
	if (!serversCache) {
		serversCache = await loadMcpServers();
	}
	return serversCache;
}

export function registerMcpServersTool(server: FastMCP) {
	server.addTool({
		name: "adkMcpServers",
		description: `List and get details about available MCP server integrations for ADK-TS.
    
Available servers include:
- abi: Smart contract ABI interactions
- atp: IQ AI Agent Tokenization Platform
- bamm: Borrow Automated Market Maker on Fraxtal
- coingecko: Free cryptocurrency market data
- coingecko-pro: Premium crypto market data
- discord: Discord bot messaging
- fraxlend: Fraxlend lending platform
- iqwiki: IQ.wiki data access
- near-agent: NEAR Protocol blockchain
- near-intents: NEAR cross-chain swaps
- odos: DEX aggregation
- polymarket: Prediction markets
- telegram: Telegram bot messaging
- upbit: Upbit exchange

Use list=true to get all servers, or specify server name for full documentation.`,
		parameters: mcpServersInputSchema,
		execute: async (args: McpServersInput) => {
			logger.debug("Executing adkMcpServers tool", args);

			try {
				const servers = await getCachedServers();

				if (servers.length === 0) {
					return "No MCP server documentation available. Check docs/mcp-servers directory.";
				}

				// List mode
				if (args.list || !args.server) {
					const list = servers
						.map(
							(s) =>
								`- **${s.name}**: ${s.description.slice(0, 80)}${s.description.length > 80 ? "..." : ""}`,
						)
						.join("\n");
					return `# Available MCP Servers\n\n${list}\n\nUse \`server: "<name>"\` to get full documentation for a specific server.`;
				}

				// Get specific server
				const serverName = args.server.toLowerCase().replace("mcp-", "");
				const found = servers.find(
					(s) =>
						s.name.toLowerCase() === serverName ||
						s.name.toLowerCase().includes(serverName),
				);

				if (!found) {
					const suggestions = servers
						.filter(
							(s) =>
								s.name.includes(serverName) ||
								serverName.includes(s.name.slice(0, 3)),
						)
						.map((s) => s.name)
						.slice(0, 5);

					return `MCP server "${args.server}" not found.\n\nAvailable servers: ${servers.map((s) => s.name).join(", ")}${suggestions.length ? `\n\nDid you mean: ${suggestions.join(", ")}?` : ""}`;
				}

				// Return full documentation
				return `# ${found.title}\n\n${found.description}\n\n${found.content}`;
			} catch (error) {
				logger.error("Failed to execute adkMcpServers tool", error);
				throw error;
			}
		},
	});
}
