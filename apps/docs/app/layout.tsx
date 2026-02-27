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
		template: "ADK-TS | %s",
	},
	description:
		"ADK-TS is the TypeScript-native AI agent framework. Build production-ready AI agents with multi-LLM support, tool integration, and multi-agent orchestration.",
	keywords: [
		"TypeScript AI agents",
		"TypeScript agent framework",
		"build AI agents TypeScript",
		"AI agent orchestration TypeScript",
		"ADK-TS",
		"multi-agent systems",
		"LLM framework TypeScript",
		"open-source AI agent framework",
		"multi-LLM TypeScript",
	],
	metadataBase: new URL("https://adk.iqai.com"),
	authors: [{ name: "IQ AI", url: "https://iqai.com" }],
	creator: "IQ AI",
	publisher: "IQ AI",
	category: "technology",
	icons: {
		icon: "/adk.png",
		shortcut: "/adk.png",
		apple: "/adk.png",
	},
	openGraph: {
		type: "website",
		siteName: "ADK-TS",
		title: "ADK-TS - The TypeScript-Native AI Agent Framework",
		description:
			"ADK-TS is the TypeScript-native AI agent framework. Build production-ready AI agents with multi-LLM support, tool integration, and multi-agent orchestration.",
		url: "https://adk.iqai.com",
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
		site: "@iqaicom",
		creator: "@iqaicom",
		title: "ADK-TS - The TypeScript-Native AI Agent Framework",
		description:
			"ADK-TS is the TypeScript-native AI agent framework. Build production-ready AI agents with multi-LLM support, tool integration, and multi-agent orchestration.",
		images: ["/og-image.png"],
	},
	alternates: {
		canonical: "https://adk.iqai.com",
	},
};

const jsonLd = [
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "ADK-TS",
		url: "https://adk.iqai.com",
		description:
			"The TypeScript-native AI agent framework for building production-ready AI agents.",
		publisher: {
			"@type": "Organization",
			name: "IQ AI",
			url: "https://iqai.com",
		},
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: "https://adk.iqai.com/docs?search={search_term_string}",
			},
			"query-input": "required name=search_term_string",
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "ADK-TS",
		alternateName: "ADK-TS - The TypeScript-Native AI Agent Framework",
		description:
			"An open-source TypeScript framework for building production-ready AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible multi-agent orchestration.",
		url: "https://adk.iqai.com",
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Node.js >=22",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		author: {
			"@type": "Organization",
			name: "IQ AI",
			url: "https://iqai.com",
			sameAs: [
				"https://github.com/IQAIcom",
				"https://x.com/iqaicom",
				"https://www.npmjs.com/package/@iqai/adk",
			],
		},
		codeRepository: "https://github.com/IQAIcom/adk-ts",
		programmingLanguage: "TypeScript",
		license: "https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md",
	},
];

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex flex-col min-h-screen">
				<RootProvider>{children}</RootProvider>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: required for JSON-LD structured data
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }}
					type="application/ld+json"
				/>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: required for JSON-LD structured data
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }}
					type="application/ld+json"
				/>
			</body>
		</html>
	);
}
