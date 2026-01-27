import { readFileSync } from "node:fs";
import { FastMCP } from "fastmcp";
import { loadDocs } from "./docs/loader.js";
import { setDocs } from "./docs/store.js";
import { registerDocsTool } from "./tools/docs.js";
import { registerSearchTool } from "./tools/search.js";
import { registerMcpServersTool } from "./tools/mcp-servers.js";
import { registerNavigateTool } from "./tools/navigate.js";
import { registerInfoTool } from "./tools/info.js";
import { logger } from "./logger.js";

const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const version = packageJson.version;

export async function createServer(): Promise<FastMCP> {
	const server = new FastMCP({
		name: "ADK-TS Documentation Server",
		version: version,
	});

	// Load documentation
	const docs = await loadDocs();
	setDocs(docs);

	// Register all tools
	registerDocsTool(server);
	registerSearchTool(server);
	registerMcpServersTool(server);
	registerNavigateTool(server);
	registerInfoTool(server);

	return server;
}

async function main() {
	try {
		const server = await createServer();

		server.start({
			transportType: "stdio",
		});

		logger.info("Started ADK-TS Docs MCP Server");
	} catch (error) {
		logger.error("Failed to start MCP server", error);
		process.exit(1);
	}
}

// Run if executed directly
main();

export { FastMCP };
