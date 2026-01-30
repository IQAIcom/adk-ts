import { readFileSync } from "node:fs";
import { FastMCP } from "fastmcp";
import { loadDocsFromRemote } from "./docs/remote-loader.js";
import { setDocs } from "./docs/store.js";
import { logger } from "./logger.js";
import { registerDocsTool } from "./tools/docs.js";
import { registerInfoTool } from "./tools/info.js";
import { registerMcpServersTool } from "./tools/mcp-servers.js";
import { registerNavigateTool } from "./tools/navigate.js";
import { registerSearchTool } from "./tools/search.js";

const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const version = packageJson.version;

export async function createServer(): Promise<FastMCP> {
	const server = new FastMCP({
		name: "ADK-TS Documentation Server",
		version: version,
	});

	// Register all tools first
	registerDocsTool(server);
	registerSearchTool(server);
	registerMcpServersTool(server);
	registerNavigateTool(server);
	registerInfoTool(server);

	// Load documentation from remote site (blocking)
	try {
		logger.info("Loading documentation...");
		const docs = await loadDocsFromRemote();
		setDocs(docs);
		logger.info(`Documentation initialized: ${docs.length} sections available`);
	} catch (error) {
		logger.error("Failed to load documentation during startup", error);
		// Set empty docs so tools still work
		setDocs([]);
	}

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
