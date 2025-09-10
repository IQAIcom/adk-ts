#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import { weatherTool } from "./tools/weather.js";

/**
 * Initializes and starts the Weather MCP (Model Context Protocol) Server.
 *
 * This function sets up a FastMCP server that provides weather-related tools
 * through the MCP protocol. The server communicates via stdio transport,
 * making it suitable for integration with MCP clients and AI agents.
 */
async function main() {
	console.log("Initializing Weather MCP Server...");

	const server = new FastMCP({
		name: "Weather MCP Server",
		version: "0.0.1",
	});

	server.addTool(weatherTool);

	try {
		await server.start({
			transportType: "stdio",
		});
		console.log("✅ Weather MCP Server started successfully over stdio.");
		console.log("   You can now connect to it using an MCP client.");
		console.log("   Try the GET_WEATHER tool with a city name!");
	} catch (error) {
		console.error("❌ Failed to start Weather MCP Server:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(
		"❌ An unexpected error occurred in the Weather MCP Server:",
		error,
	);
	process.exit(1);
});
