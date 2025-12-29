import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Book, Code, Sparkles } from "lucide-react";
import Image from "next/image";

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
	githubUrl: "https://github.com/IQAICOM/adk-ts",
	links: [
		{
			text: "Documentation",
			url: "/docs",
			active: "nested-url",
			icon: <Book className="w-4 h-4" />,
		},
		{
			text: "API Reference",
			url: "https://iqaicom.github.io/adk-ts/",
			external: true,
			icon: <Code className="w-4 h-4" />,
		},
		{
			text: "Showcase",
			url: "/showcase",
			active: "nested-url",
			icon: <Sparkles className="w-4 h-4" />,
		},
	],
};
