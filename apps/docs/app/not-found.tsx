import Link from "next/link";
import LibrarianScene from "@/components/librarian-scene";

export default function NotFound() {
	return (
		<main className="flex flex-col flex-1 items-center justify-center px-6 py-24 bg-gradient-to-b from-background via-card/40 to-muted/40">
			<div className="flex max-w-4xl flex-col items-center gap-8 text-center">
				<LibrarianScene />
			</div>
			<div className="flex max-w-xl flex-col items-center gap-6 text-center">
				<h1 className="text-4xl font-semibold tracking-tight">
					Page not found
				</h1>
				<p className="max-w-xl text-base leading-relaxed text-muted-foreground">
					Our librarian searched every shelf but couldn't find that page. The
					resource you're looking for might have been moved or doesn't exist.
				</p>

				<PopularSections />
			</div>
		</main>
	);
}

const PopularSections = () => {
	const popularSections = [
		{
			title: "Home",
			description: "Go back to the home page",
			href: "/",
		},
		{
			title: "Getting Started",
			description: "Quick setup guide and first steps",
			href: "/docs/framework/get-started",
		},
		{
			title: "MCP Servers",
			description: "Connect Claude to external tools and data sources",
			href: "/docs/mcp-servers",
		},
		{
			title: "CLI",
			description: "Command-line interface for Claude integration",
			href: "/docs/cli",
		},
		{
			title: "Agent Builder",
			description: "Fluent API for creating multi-agent workflows",
			href: "/docs/framework/agents/agent-builder",
		},
		{
			title: "Guides & Tutorials",
			description: "In-depth guides for common use cases",
			href: "/docs/framework/guides/agent-instructions",
		},
	];
	return (
		<div className="w-full max-w-2xl rounded-xl border border-border/70 bg-card/70 p-6 text-left backdrop-blur">
			<p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
				Popular sections
			</p>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{popularSections.map((section) => (
					<Link
						href={section.href}
						key={section.title}
						className="group flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-card/80 px-4 py-3 text-left transition-all hover:border-border hover:bg-accent/40"
					>
						<div className="flex w-full items-center justify-between">
							<span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
								{section.title}
							</span>
							<svg
								className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M14 5l7 7m0 0l-7 7m7-7H3"
								/>
							</svg>
						</div>
						<span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
							{section.description}
						</span>
					</Link>
				))}
			</div>
		</div>
	);
};
