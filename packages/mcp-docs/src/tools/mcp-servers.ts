import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getDocs } from "../docs/store.js";
import { logger } from "../logger.js";

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

// Get MCP server docs from loaded documentation
function getMcpServerDocs() {
	const allDocs = getDocs();
	return allDocs.filter((doc) => doc.path.startsWith("mcp-servers/"));
}

export function registerMcpServersTool(server: FastMCP) {
	server.addTool({
		name: "adkMcpServers",
		description: `List and get details about available MCP server integrations for ADK-TS.

Use list=true to get all servers, or specify server name for full documentation.`,
		parameters: mcpServersInputSchema,
		execute: async (args: McpServersInput) => {
			logger.debug("Executing adkMcpServers tool", args);

			try {
				const servers = getMcpServerDocs();

				if (servers.length === 0) {
					return "No MCP server documentation available yet. Documentation is loading in the background.";
				}

				// List mode
				if (args.list || !args.server) {
					const list = servers
						.map((s) => {
							const name = s.path.replace("mcp-servers/", "");
							const desc = s.description || "No description available";
							return `- **${name}**: ${desc.slice(0, 80)}${desc.length > 80 ? "..." : ""}`;
						})
						.join("\n");
					return `# Available MCP Servers (${servers.length})\n\n${list}\n\nUse \`server: "<name>"\` to get full documentation for a specific server.`;
				}

				// Get specific server
				const serverName = args.server.toLowerCase().replace("mcp-", "");
				const found = servers.find((s) => {
					const name = s.path.replace("mcp-servers/", "").toLowerCase();
					return name === serverName || name.includes(serverName);
				});

				if (!found) {
					const availableServers = servers
						.map((s) => s.path.replace("mcp-servers/", ""))
						.join(", ");

					const suggestions = servers
						.filter((s) => {
							const name = s.path.replace("mcp-servers/", "").toLowerCase();
							return (
								name.includes(serverName) ||
								serverName.includes(name.slice(0, 3))
							);
						})
						.map((s) => s.path.replace("mcp-servers/", ""))
						.slice(0, 5);

					return `MCP server "${args.server}" not found.\n\nAvailable servers: ${availableServers}${suggestions.length ? `\n\nDid you mean: ${suggestions.join(", ")}?` : ""}`;
				}

				// Return full documentation
				return `# ${found.title}\n\n${found.description || ""}\n\n${found.content}`;
			} catch (error) {
				logger.error("Failed to execute adkMcpServers tool", error);
				throw error;
			}
		},
	});
}
