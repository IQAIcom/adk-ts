import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { readFileSync } from "node:fs";
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

			return JSON.stringify(
				{
					name: "ADK-TS (Agent Development Kit for TypeScript)",
					version: packageJson.version,
					description:
						"A comprehensive framework for building AI agents with multi-LLM support, memory, and tools.",
					homepage: "https://adk.iqai.com",
					docs: "https://adk.iqai.com/docs",
					github: "https://github.com/IQAIcom/adk-ts",
					mcpServers: [
						"near",
						"twitter",
						"telegram",
						"coingecko",
						"discord",
						"abi",
						"atp",
						"bamm",
						"odos",
						"polymarket",
						"upbit",
					],
				},
				null,
				2,
			);
		},
	});
}
