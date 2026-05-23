"use client";

import {
	Blocks,
	BookOpen,
	Code2,
	Eye,
	SquareTerminal,
	Server,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { SectionWrapper } from "./section-wrapper";

const docLinks = [
	{
		icon: Blocks,
		title: "Framework",
		description:
			"Build intelligent AI agents with our comprehensive TypeScript framework featuring tools, sessions, and runtime management.",
		href: "/docs",
	},
	{
		icon: Server,
		title: "MCP Servers",
		description:
			"Pre-built MCP server integrations for blockchain, social media, and data services to enhance your agents.",
		href: "/docs/mcp-servers",
	},
	{
		icon: Code2,
		title: "API Reference",
		description:
			"Complete API documentation with detailed class references, methods, and examples for all ADK-TS components.",
		href: "https://iqaicom.github.io/adk-ts/",
		external: true,
	},
	{
		icon: SquareTerminal,
		title: "CLI",
		description:
			"Command-line tooling to scaffold projects, run agents, and launch web/API.",
		href: "/docs/framework/cli",
	},
	{
		icon: BookOpen,
		title: "Guides",
		description:
			"Step-by-step tutorials and guides to help you master building AI agents with ADK-TS.",
		href: "/docs/framework/guides",
	},
	{
		icon: Eye,
		title: "Showcase",
		description:
			"Explore real-world applications and see what others have built with ADK-TS.",
		href: "/showcase",
	},
];

export function DocsLinksSection() {
	return (
		<SectionWrapper id="docs-links" className="relative p-0!">
			<nav aria-label="Documentation sections">
				<ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 -mx-px -my-px">
					{docLinks.map((link, index) => (
						<motion.li
							key={link.title}
							className="border border-white/10 -ml-px -mt-px p-4 py-8 md:p-7 md:py-16"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
						>
							<Link
								href={link.href}
								className="group block h-full border border-white/20 rounded-md bg-[#00000033] space-y-3 p-4 md:p-5 hover:border-white/30 hover:-translate-y-1 transition-all duration-300"
								{...(link.external && {
									target: "_blank",
									rel: "noopener noreferrer",
								})}
							>
								<div
									className="py-2.5 px-3 rounded-xl w-fit mb-3"
									style={{
										background:
											"linear-gradient(180deg, #FF1A88 0%, rgba(255, 92, 170, 0.18) 100%)",
										boxShadow:
											"inset 0px -1px 1px 0px rgba(255, 255, 255, 0.35), inset 0px 2px 2px 0px rgba(0, 0, 0, 0.15), 0px 4px 12px 0px rgba(255, 26, 136, 0.25)",
									}}
								>
									<link.icon className="size-5 text-white" aria-hidden="true" />
								</div>
								<div>
									<h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
										{link.title}
									</h3>
									<p className="text-sm text-[#FFFFFF99] font-medium leading-relaxed mb-8">
										{link.description}
									</p>
								</div>
							</Link>
						</motion.li>
					))}
				</ul>
			</nav>
		</SectionWrapper>
	);
}
