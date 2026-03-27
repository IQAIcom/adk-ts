import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: {
		absolute: "ADK-TS - The TypeScript-Native AI Agent Framework",
	},
	description:
		"An open-source framework for building production-ready AI agents in TypeScript. Type-safe, multi-LLM, with built-in tools, sessions, and agent orchestration.",
	alternates: {
		canonical: "https://adk.iqai.com",
	},
};

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
