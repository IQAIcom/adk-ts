"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Book,
	Code,
	FileCode,
	Blocks,
	Sparkles,
	GraduationCap,
	Lightbulb,
	ChevronDown,
	ExternalLink,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavLinkProps {
	href: string;
	external?: boolean;
	children: React.ReactNode;
	className?: string;
}

const NavLink = ({ href, external, children, className }: NavLinkProps) => {
	const pathname = usePathname();
	const isActive = pathname?.startsWith(href);

	return (
		<Link
			href={href}
			className={cn(
				"flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
				isActive
					? "text-foreground bg-accent"
					: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
				className,
			)}
			{...(external && { target: "_blank", rel: "noopener noreferrer" })}
		>
			{children}
		</Link>
	);
};

export function NavbarLinks() {
	return (
		<div className="flex items-center gap-1">
			{/* Docs */}
			<NavLink href="/docs">
				<Book className="w-4 h-4" />
				<span>Docs</span>
			</NavLink>

			{/* MCP Servers */}
			<NavLink href="/docs/mcp-servers">
				<Blocks className="w-4 h-4" />
				<span>MCP</span>
			</NavLink>

			{/* Resources Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors outline-none">
					<Lightbulb className="w-4 h-4" />
					<span>Resources</span>
					<ChevronDown className="w-3 h-3" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					<DropdownMenuItem asChild>
						<Link
							href="https://iqaicom.github.io/adk-ts/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 cursor-pointer"
						>
							<Code className="w-4 h-4" />
							<span>API Reference</span>
							<ExternalLink className="w-3 h-3 ml-auto opacity-60" />
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link
							href="/showcase"
							className="flex items-center gap-2 cursor-pointer"
						>
							<Sparkles className="w-4 h-4" />
							<span>Showcase</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild>
						<Link
							href="https://github.com/IQAIcom/adk-ts-samples"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 cursor-pointer"
						>
							<FileCode className="w-4 h-4" />
							<span>Sample Projects</span>
							<ExternalLink className="w-3 h-3 ml-auto opacity-60" />
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link
							href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 cursor-pointer"
						>
							<GraduationCap className="w-4 h-4" />
							<span>Tutorials</span>
							<ExternalLink className="w-3 h-3 ml-auto opacity-60" />
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Guides */}
			<NavLink href="/docs/framework/guides">
				<GraduationCap className="w-4 h-4" />
				<span>Guides</span>
			</NavLink>
		</div>
	);
}
