import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Documentation",
	description:
		"Explore ADK-TS documentation — guides, API references, MCP server integrations, CLI tooling, and everything you need to build TypeScript AI agents.",
	alternates: {
		canonical: "https://adk.iqai.com/docs",
	},
};

export default function DocsIndexLayout({ children }: { children: ReactNode }) {
	return children;
}
