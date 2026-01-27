import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { listDocsDirectory, getAvailablePaths } from "../docs/loader.js";
import { logger } from "../logger.js";

const navigateInputSchema = z.object({
	path: z
		.string()
		.optional()
		.default("")
		.describe("Directory path to explore (e.g., 'framework')"),
});

type NavigateInput = z.infer<typeof navigateInputSchema>;

export function registerNavigateTool(server: FastMCP) {
	server.addTool({
		name: "adkNavigate",
		description: `Explore the hierarchical structure of ADK-TS documentation.
    
    Use this to:
    - Discover available sections and pages.
    - Understand the logical organization of the documentation.
    - Find the exact paths needed for the adkDocs tool.
    
    Leaving the path empty or using "" will show the top-level documentation sections.`,
		parameters: navigateInputSchema,
		execute: async (args: NavigateInput) => {
			const { path: dirPath } = args;
			logger.debug("Executing adkNavigate tool", { path: dirPath });

			try {
				const result = await listDocsDirectory(dirPath);

				if (result.dirs.length === 0 && result.files.length === 0) {
					return `Path "${dirPath}" not found or empty.\n\n${await getAvailablePaths()}`;
				}

				const lines = [
					`## Documentation: ${(result.meta?.title ?? dirPath) || "Root"}`,
				];
				if (result.meta?.icon) lines[0] = `${result.meta.icon} ${lines[0]}`;

				lines.push("");

				if (result.dirs.length > 0) {
					lines.push("### Sections:");
					for (const d of result.dirs) {
						lines.push(`- [ ] ${d}`);
					}
					lines.push("");
				}

				if (result.files.length > 0) {
					lines.push("### Pages:");
					for (const f of result.files) {
						lines.push(`- [ ] ${f}`);
					}
				}

				return lines.join("\n");
			} catch (error) {
				logger.error("Failed to execute adkNavigate tool", error);
				throw error;
			}
		},
	});
}
