"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Building2,
	Server,
	Terminal,
	Code,
	GraduationCap,
	Sparkles,
	Copy,
	Check,
} from "lucide-react";
import Link, { type LinkProps } from "next/link";
import { useState } from "react";

const featureItems = [
	{
		href: "/docs/framework/get-started",
		icon: Building2,
		title: "Framework",
		description:
			"Build intelligent AI agents with our comprehensive TypeScript framework featuring tools, sessions, and runtime management.",
	},
	{
		href: "/docs/mcp-servers",
		icon: Server,
		title: "MCP Servers",
		description:
			"Pre-built MCP server integrations for blockchain, social media, and data services to enhance your agents.",
	},
	{
		href: "https://iqaicom.github.io/adk-ts/",
		icon: Code,
		title: "API Reference",
		description:
			"Complete API documentation with detailed class references, methods, and examples for all ADK components.",
		external: true,
	},
	{
		href: "/docs/cli",
		icon: Terminal,
		title: "CLI",
		description:
			"Command-line tooling to scaffold projects, run agents, and launch web/API.",
	},
	{
		href: "/docs/framework/guides",
		icon: GraduationCap,
		title: "Guides",
		description:
			"Step-by-step tutorials and guides to help you master building AI agents with ADK.",
	},
	{
		href: "/showcase",
		icon: Sparkles,
		title: "Showcase",
		description:
			"Explore real-world applications and see what others have built with ADK.",
	},
];

export default function DocsPage(): React.ReactElement {
	return (
		<main className="container flex flex-col items-center py-16 text-center z-2">
			<div className="absolute inset-0 z-[-1] overflow-hidden duration-1000 animate-in fade-in [perspective:2000px]">
				<div
					className="absolute bottom-[20%] left-1/2 size-[1200px] origin-bottom bg-fd-primary/30 opacity-30"
					style={{
						transform: "rotateX(75deg) translate(-50%, 400px)",
						backgroundImage:
							"radial-gradient(50% 50% at center,transparent,var(--color-fd-background)), repeating-linear-gradient(to right,var(--color-fd-primary),var(--color-fd-primary) 1px,transparent 2px,transparent 100px), repeating-linear-gradient(to bottom,var(--color-fd-primary),var(--color-fd-primary) 2px,transparent 3px,transparent 100px)",
					}}
				/>
			</div>
			<h1 className="mb-4 text-4xl font-semibold md:text-5xl">ADK TS</h1>
			<p className="text-fd-muted-foreground">
				Build powerful AI agents with our comprehensive framework and MCP server
				integrations.
			</p>
			<div className="mt-8 flex justify-center">
				<Link
					href="/docs/framework/get-started"
					className={cn(buttonVariants(), "px-6")}
				>
					Get Started
				</Link>
				<Link
					href="/docs/framework/get-started/quickstart"
					className={cn(buttonVariants({ variant: "outline" }), "ml-4 px-6")}
				>
					Quickstart Guide
				</Link>
			</div>
			<CodeSnippet />
			<div className="mt-16 grid grid-cols-1 gap-6 text-left md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
				{featureItems.map((item) => (
					<Item key={item.href} href={item.href} external={item.external}>
						<Icon>
							<item.icon className="size-full" />
						</Icon>
						<h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
						<p className="text-sm text-fd-muted-foreground">
							{item.description}
						</p>
					</Item>
				))}
			</div>
		</main>
	);
}

function CodeSnippet(): React.ReactElement {
	const [copied, setCopied] = useState(false);
	const code = "npx create-adk-project my-agent";

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="mt-6 flex items-center justify-center">
			<div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-fd-border bg-fd-card/50 backdrop-blur-sm shadow-sm">
				<code className="text-sm font-mono px-3 py-1 rounded">{code}</code>
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center justify-center w-8 h-8 rounded-md border border-fd-border bg-fd-background hover:bg-fd-accent hover:border-fd-primary/30 transition-all duration-200 group"
					aria-label="Copy code"
				>
					{copied ? (
						<Check className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
					) : (
						<Copy className="w-4 h-4 text-fd-muted-foreground group-hover:text-fd-foreground group-hover:scale-110 transition-all" />
					)}
				</button>
			</div>
		</div>
	);
}

function Icon({ children }: { children: React.ReactNode }): React.ReactElement {
	return (
		<div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
			{children}
		</div>
	);
}

function Item(
	props: LinkProps & { children: React.ReactNode; external?: boolean },
): React.ReactElement {
	const linkProps = props.external
		? { target: "_blank", rel: "noopener noreferrer" }
		: {};

	return (
		<Link
			{...props}
			{...linkProps}
			className="group relative rounded-xl border border-fd-border bg-fd-card p-6 transition-all duration-200 hover:shadow-lg hover:border-fd-primary/30 hover:-translate-y-1"
		>
			<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-fd-primary/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
			<div className="relative">{props.children}</div>
		</Link>
	);
}
