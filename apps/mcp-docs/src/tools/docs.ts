import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { readDocPath } from "../docs/loader.js";
import { logger } from "../logger.js";

const docsInputSchema = z.object({
	path: z
		.string()
		.describe(
			"Path to the documentation file (e.g., 'framework/agents/llm-agents')",
		),
});

type DocsInput = z.infer<typeof docsInputSchema>;

export function registerDocsTool(server: FastMCP) {
	server.addTool({
		name: "adkDocs",
		description: `Read the full content of a specific ADK-TS documentation file or directory.
    
    BEST PRACTICES:
    - Use this after finding a relevant path via adkSearch or adkNavigate.
    - Provide the path with or without the extension (e.g., 'framework/get-started/quickstart').
    - If a directory path is provided, it returns a summary of the section and its sub-pages.
    
    EXAMPLES:
    - 'framework/agents/llm-agents'
    - 'tools/built-in-tools/google-search'
    - 'mcp-servers/telegram'`,
		parameters: docsInputSchema,
		execute: async (args: DocsInput) => {
			const { path: docPath } = args;
			logger.debug("Executing adkDocs tool", { path: docPath });

			try {
				const result = await readDocPath(docPath);

				if (result.found) {
					return result.content;
				}

				return result.suggestion;
			} catch (error) {
				logger.error("Failed to execute adkDocs tool", error);
				throw error;
			}
		},
	});
}
