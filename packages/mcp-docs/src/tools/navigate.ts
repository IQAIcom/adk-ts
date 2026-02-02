import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getAvailablePathsFromRemote } from "../docs/remote-loader.js";
import { logger } from "../logger.js";
import { getDocs } from "../docs/store.js";

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
				// Get all loaded docs
				const allDocs = getDocs();

				// Normalize the search path
				const normalizedPath = dirPath.replace(/^\/+|\/+$/g, "");

				// Filter docs that match the path prefix
				const matchingDocs = normalizedPath
					? allDocs.filter((doc) => doc.path.startsWith(normalizedPath))
					: allDocs;

				if (matchingDocs.length === 0) {
					return `Path "${dirPath}" not found or empty.\n\n${await getAvailablePathsFromRemote()}`;
				}

				// Group by immediate subdirectory or file
				const items = new Set<string>();
				const sections = new Set<string>();

				for (const doc of matchingDocs) {
					const relativePath = normalizedPath
						? doc.path.substring(normalizedPath.length).replace(/^\/+/, "")
						: doc.path;

					if (relativePath.includes("/")) {
						// It's in a subdirectory
						const subDir = relativePath.split("/")[0];
						sections.add(`${subDir}/`);
					} else {
						// It's a file in this directory
						items.add(relativePath);
					}
				}

				const lines = [`## Documentation: ${normalizedPath || "Root"}`, ""];

				if (sections.size > 0) {
					lines.push("### Sections:");
					for (const section of Array.from(sections).sort()) {
						lines.push(`- [ ] ${section}`);
					}
					lines.push("");
				}

				if (items.size > 0) {
					lines.push("### Pages:");
					for (const item of Array.from(items).sort()) {
						lines.push(`- [ ] ${item}`);
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
