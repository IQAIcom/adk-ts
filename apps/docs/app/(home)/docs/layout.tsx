import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "ADK-TS | Guides, API Reference & CLI Documentation",
	description:
		"Comprehensive ADK-TS documentation with get-started guides, API references, CLI tools, and MCP server integrations. Build AI agents in TypeScript step by step.",
	alternates: {
		canonical: "https://adk.iqai.com/docs",
	},
};

export default function DocsIndexLayout({ children }: { children: ReactNode }) {
	return children;
}
