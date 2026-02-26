import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/app/layout.config";

export const metadata: Metadata = {
	title: {
		absolute: "ADK-TS - The TypeScript-Native AI Agent Framework",
	},
	description:
		"Build production-ready AI agents in TypeScript. ADK-TS provides multi-LLM support, advanced tool integration, memory systems, and flexible multi-agent orchestration.",
	alternates: {
		canonical: "https://adk.iqai.com",
	},
};

export default function Layout({ children }: { children: ReactNode }) {
	return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
