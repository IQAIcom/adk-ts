import "@/app/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "ADK-TS - The TypeScript-Native AI Agent Framework",
		template: "%s | ADK-TS",
	},
	description:
		"ADK-TS is the TypeScript-native AI agent framework for building production-ready AI agents. Multi-LLM support, advanced tool integration, memory systems, and flexible multi-agent orchestration.",
	keywords: [
		"TypeScript AI agents",
		"TypeScript agent framework",
		"build AI agents TypeScript",
		"AI agent orchestration TypeScript",
		"ADK-TS",
		"multi-agent systems",
		"LLM framework TypeScript",
	],
	metadataBase: new URL("https://adk.iqai.com"),
	icons: {
		icon: "/adk.png",
		shortcut: "/adk.png",
		apple: "/adk.png",
	},
	openGraph: {
		type: "website",
		title: "ADK-TS - The TypeScript-Native AI Agent Framework",
		description:
			"ADK-TS is the TypeScript-native AI agent framework for building production-ready AI agents. Multi-LLM support, advanced tool integration, memory systems, and flexible multi-agent orchestration.",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "ADK-TS - The TypeScript-Native AI Agent Framework",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "ADK-TS - The TypeScript-Native AI Agent Framework",
		description:
			"ADK-TS is the TypeScript-native AI agent framework for building production-ready AI agents. Multi-LLM support, advanced tool integration, memory systems, and flexible multi-agent orchestration.",
		images: ["/og-image.png"],
	},
};

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex flex-col min-h-screen">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
