import { readFileSync } from "node:fs";
import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getDocs } from "../docs/store.js";
import { logger } from "../logger.js";

const infoInputSchema = z.object({});

const packageJson = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);

export function registerInfoTool(server: FastMCP) {
	server.addTool({
		name: "adkInfo",
		description: "Get general information about the ADK-TS framework.",
		parameters: infoInputSchema,
		execute: async () => {
			logger.debug("Executing adkInfo tool");

			// Get MCP servers dynamically from loaded docs
			const allDocs = getDocs();
			const mcpServerDocs = allDocs.filter((doc) =>
				doc.path.startsWith("mcp-servers/"),
			);
			const mcpServers = mcpServerDocs.map((doc) =>
				doc.path.replace("mcp-servers/", ""),
			);

			return JSON.stringify(
				{
					name: "ADK-TS (Agent Development Kit for TypeScript)",
					version: packageJson.version,
					description:
						"A comprehensive framework for building AI agents with multi-LLM support, memory, and tools.",
					homepage: "https://adk.iqai.com",
					docs: "https://adk.iqai.com/docs",
					github: "https://github.com/IQAIcom/adk-ts",
					totalDocs: allDocs.length,
					mcpServers: mcpServers.length > 0 ? mcpServers : ["Loading..."],
				},
				null,
				2,
			);
		},
	});
}
