#!/usr/bin/env node
/**
 * Standalone entry point for running the MCP docs server via npx
 * Usage: npx @iqai/mcp-docs
 */

import { createServer } from "./index.js";
import { logger } from "./logger.js";

async function runStdio() {
	try {
		const server = await createServer();

		// Handle graceful shutdown
		process.on("SIGINT", () => {
			logger.info("Received SIGINT, shutting down...");
			process.exit(0);
		});

		process.on("SIGTERM", () => {
			logger.info("Received SIGTERM, shutting down...");
			process.exit(0);
		});

		// Handle uncaught errors
		process.on("uncaughtException", (error) => {
			logger.error("Uncaught exception", error);
			process.exit(1);
		});

		process.on("unhandledRejection", (reason) => {
			logger.error("Unhandled rejection", reason);
			process.exit(1);
		});

		server.start({
			transportType: "stdio",
		});

		logger.info("ADK-TS Docs MCP Server running on stdio");
	} catch (error) {
		logger.error("Failed to start stdio server", error);
		process.exit(1);
	}
}

runStdio();
