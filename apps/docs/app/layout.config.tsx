import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import {
	Book,
	Code,
	Blocks,
	GraduationCap,
	Sparkles,
	FileCode,
	Lightbulb,
} from "lucide-react";

export const baseOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<Image
					src="/adk.png"
					alt="TypeScript"
					width={30}
					height={30}
					style={{ verticalAlign: "middle", marginRight: 2, borderRadius: 8 }}
				/>
				ADK-TS
			</>
		),
	},
	links: [
		{
			text: "Docs",
			url: "/docs",
			icon: <Book className="w-4 h-4" />,
		},
		{
			text: "MCP",
			url: "/docs/mcp-servers",
			icon: <Blocks className="w-4 h-4" />,
		},
		{
			text: "API",
			url: "https://iqaicom.github.io/adk-ts/",
			icon: <Code className="w-4 h-4" />,
			external: true,
		},
		{
			type: "menu",
			text: "Resources",
			items: [
				{
					text: "Guides",
					description: "Step-by-step tutorials and guides",
					url: "/docs/framework/guides",
					icon: <GraduationCap className="w-4 h-4" />,
				},
				{
					text: "Showcase",
					description: "See what others have built",
					url: "/showcase",
					icon: <Sparkles className="w-4 h-4" />,
				},
				{
					text: "Sample Projects",
					description: "Ready-to-use project templates",
					url: "https://github.com/IQAIcom/adk-ts-samples",
					icon: <FileCode className="w-4 h-4" />,
					external: true,
				},
				{
					text: "Tutorials",
					description: "Learn with interactive examples",
					url: "https://github.com/IQAIcom/adk-ts/tree/main/apps/examples",
					icon: <GraduationCap className="w-4 h-4" />,
					external: true,
				},
			],
		},
	],
	githubUrl: "https://github.com/IQAICOM/adk-ts",
};

export const docsOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<Image
					src="/adk.png"
					alt="TypeScript"
					width={30}
					height={30}
					style={{ verticalAlign: "middle", marginRight: 2, borderRadius: 8 }}
				/>
				ADK-TS
			</>
		),
	},
	links: [
		{
			text: "API Reference",
			url: "https://iqaicom.github.io/adk-ts/",
			icon: <Code className="w-4 h-4" />,
			external: true,
		},
		{
			type: "menu",
			text: "Resources",
			icon: <Lightbulb className="w-4 h-4" />,
			items: [
				{
					text: "Guides",
					description: "Step-by-step tutorials and guides",
					url: "/docs/framework/guides",
					icon: <GraduationCap className="w-4 h-4" />,
				},
				{
					text: "Showcase",
					description: "See what others have built",
					url: "/showcase",
					icon: <Sparkles className="w-4 h-4" />,
				},
				{
					text: "Sample Projects",
					description: "Ready-to-use project templates",
					url: "https://github.com/IQAIcom/adk-ts-samples",
					icon: <FileCode className="w-4 h-4" />,
					external: true,
				},
				{
					text: "Tutorials",
					description: "Learn with interactive examples",
					url: "https://github.com/IQAIcom/adk-ts/tree/main/apps/examples",
					icon: <GraduationCap className="w-4 h-4" />,
					external: true,
				},
			],
		},
	],
	githubUrl: "https://github.com/IQAICOM/adk-ts",
};
