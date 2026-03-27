import Image from "next/image";
import Link from "next/link";

/* ──────────────────────────────────────────────
 * Data
 * ────────────────────────────────────────────── */

const CURRENT_YEAR = new Date().getFullYear();

const SOCIAL_LINKS = [
	{
		href: "https://github.com/IQAIcom/adk-ts",
		title: "GitHub",
		icon: (
			<svg
				className="size-6"
				fill="currentColor"
				viewBox="0 0 24 24"
				role="img"
				aria-label="GitHub"
			>
				<title>GitHub</title>
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
			</svg>
		),
	},
	{
		href: "https://www.npmjs.com/package/@iqai/adk",
		title: "NPM",
		icon: (
			<svg
				className="size-6"
				fill="currentColor"
				viewBox="0 0 24 24"
				role="img"
				aria-label="NPM"
			>
				<title>NPM</title>
				<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
			</svg>
		),
	},
	{
		href: "https://X.com/IQAICOM",
		title: "X (Twitter)",
		icon: (
			<svg
				className="size-6"
				fill="currentColor"
				viewBox="0 0 24 24"
				role="img"
				aria-label="X (Twitter)"
			>
				<title>X (Twitter)</title>
				<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
			</svg>
		),
	},
	{
		href: "https://www.youtube.com/@iqtoken",
		title: "YouTube",
		icon: (
			<svg
				className="size-6"
				fill="currentColor"
				viewBox="0 0 24 24"
				role="img"
				aria-label="YouTube"
			>
				<title>YouTube</title>
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
			</svg>
		),
	},
	{
		href: "https://t.me/+Z37x8uf6DLE3ZTQ8",
		title: "Telegram",
		icon: (
			<svg
				className="size-6"
				fill="currentColor"
				viewBox="0 0 24 24"
				role="img"
				aria-label="Telegram"
			>
				<title>Telegram</title>
				<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
			</svg>
		),
	},
];

const DOCUMENTATION_LINKS = [
	{ href: "/docs/framework/get-started", text: "Getting Started" },
	{ href: "/docs/mcp-servers", text: "MCP Servers" },
	{ href: "/docs/framework/guides", text: "Guides" },
	{
		href: "https://iqaicom.github.io/adk-ts/",
		text: "API Reference",
		external: true,
	},
	{ href: "/docs/cli", text: "CLI Reference" },
];

const RESOURCE_LINKS = [
	{ href: "https://blog.iqai.com/", text: "Blog", external: true },
	{ href: "/showcase", text: "Showcase" },
	{
		href: "https://github.com/IQAIcom/adk-ts-samples",
		text: "Sample Projects",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/tree/main/apps/examples",
		text: "Tutorials",
		external: true,
	},
];

const SUPPORT_LINKS = [
	{
		href: "https://github.com/IQAIcom/adk-ts/issues",
		text: "Issues & Support",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md",
		text: "Contributing",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/blob/main/CHANGELOG.md",
		text: "Changelog",
		external: true,
	},
];

const COMMUNITY_LINKS = [
	{
		href: "https://github.com/IQAIcom/adk-ts/discussions",
		text: "Discussions",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/releases",
		text: "Releases",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md",
		text: "License",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/blob/main/CODE_OF_CONDUCT.md",
		text: "Code of Conduct",
		external: true,
	},
	{
		href: "https://github.com/IQAIcom/adk-ts/blob/main/SECURITY.md",
		text: "Security",
		external: true,
	},
];

/* ──────────────────────────────────────────────
 * Reusable class strings
 * ────────────────────────────────────────────── */

const footerLinkClass =
	"text-sm text-neutral-400 font-medium hover:text-white transition-colors";

const socialIconClass = "text-white hover:text-primary transition-colors";

const columnTitleClass =
	"text-sm font-bold uppercase tracking-wider text-[#FFFFFFCC]";

const copyrightTextClass = "text-xs text-neutral-400 font-medium";

/* ──────────────────────────────────────────────
 * Link column component
 * ────────────────────────────────────────────── */

function LinkColumn({
	title,
	links,
	className,
}: {
	title: string;
	links: { href: string; text: string; external?: boolean }[];
	className?: string;
}) {
	return (
		<div
			className={`flex flex-col items-start gap-y-6 p-6 lg:py-16 lg:px-16 ${className ?? ""}`}
		>
			<h3 className={columnTitleClass}>{title}</h3>
			<ul className="grid gap-y-3">
				{links.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href}
							className={footerLinkClass}
							{...(link.external && {
								target: "_blank",
								rel: "noopener noreferrer",
							})}
						>
							{link.text}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

/* ──────────────────────────────────────────────
 * Footer
 * ────────────────────────────────────────────── */

export function Footer() {
	return (
		<footer>
			<div className="landing-glow">
				{/* ── Links section — 3-col grid on lg, stacked on sm/md ── */}
				<div
					className="grid grid-cols-2 lg:grid-cols-3 landing-grid-bg"
					style={{
						backgroundImage: "url('/landing-page/footer-grid-large.svg')",
					}}
				>
					{/* Brand info — spans 2 cols on sm/md, 1 col + 2 rows on lg */}
					<div className="col-span-2 lg:col-span-1 lg:row-span-2 border-t border-b lg:border-b-0 lg:border-r landing-border p-6 sm:p-8 lg:p-10">
						<div className="space-y-4 max-w-xs">
							<Image
								src="/adk.png"
								alt="ADK TypeScript"
								width={140}
								height={140}
								className="rounded-xl"
							/>
							<div className="grid gap-2">
								<h2 className="text-2xl font-bold text-foreground">ADK-TS</h2>
								<p className="text-base font-medium text-muted-foreground max-w-70">
									Production-ready framework for building intelligent AI agents
									with TypeScript and multi-LLM support.
								</p>
							</div>
							<div className="flex flex-wrap gap-4">
								{SOCIAL_LINKS.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										className={socialIconClass}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={link.title}
									>
										{link.icon}
									</Link>
								))}
							</div>
						</div>
					</div>

					{/* Link columns — borders connect to parent edges */}
					<LinkColumn
						title="Documentation"
						links={DOCUMENTATION_LINKS}
						className="border-t border-r landing-border"
					/>
					<LinkColumn
						title="Resources"
						links={RESOURCE_LINKS}
						className="border-t landing-border"
					/>
					<LinkColumn
						title="Support"
						links={SUPPORT_LINKS}
						className="border-t border-r border-b landing-border"
					/>
					<LinkColumn
						title="Community"
						links={COMMUNITY_LINKS}
						className="border-t border-b landing-border"
					/>
				</div>

				{/* ── Footer image section — grid bg + gradient + overlay image ── */}
				<div
					className="relative overflow-hidden py-24 md:py-20 lg:py-10 landing-grid-bg"
					style={{
						backgroundImage: "url('/landing-page/footer-grid-small.svg')",
					}}
				>
					{/* Left-to-right black-to-transparent gradient */}
					<div
						className="absolute inset-0"
						style={{
							background:
								"linear-gradient(90deg, #000000 0%, rgba(0, 0, 0, 0) 100%)",
						}}
					/>
					{/* Centered glow gradient */}
					<Image
						src="/landing-page/footer-name-gradient.svg"
						alt=""
						width={825}
						height={642}
						className="absolute inset-0 w-full h-full object-cover max-w-3xl mx-auto"
					/>
					{/* Foreground image */}
					<div className="relative flex items-center justify-center py-16 sm:py-20 lg:py-24">
						<Image
							src="/landing-page/footer-name-image.png"
							alt="ADK-TS"
							width={1087}
							height={250}
							className="w-full h-auto px-6 sm:px-8 lg:px-10"
						/>
					</div>
				</div>
			</div>

			{/* ── Copyright bar ── */}
			<div className="border-t landing-border px-6 md:px-8 lg:px-12 py-5 lg:py-8">
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
					<p className={`${copyrightTextClass} text-center sm:text-left`}>
						&copy; {CURRENT_YEAR} ADK-TS. Released under the MIT License.
					</p>
					<div className="flex items-center gap-6 flex-col sm:flex-row">
						<Link
							href="https://www.getdrip.com/forms/505929689/submissions/new"
							className="landing-newsletter-btn"
							target="_blank"
							rel="noopener noreferrer"
						>
							Newsletter
						</Link>
						<span className={copyrightTextClass}>
							Powered by{" "}
							<Link
								href="https://iqai.com"
								className="text-primary hover:text-primary/80 font-medium transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								IQ
							</Link>
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
