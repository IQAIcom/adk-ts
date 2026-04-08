"use client";

import {
	BookOpen,
	ChevronDown,
	Eye,
	GraduationCap,
	LayoutGrid,
	Menu,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState, useEffect } from "react";
import { CURRENT_YEAR } from "./footer.data";

/* ──────────────────────────────────────────────
 * Data
 * ────────────────────────────────────────────── */

const NAV_LINKS = [
	{ text: "Docs", href: "/docs" },
	{ text: "MCP", href: "/docs/mcp-servers" },
	{ text: "API", href: "https://iqaicom.github.io/adk-ts/", external: true },
	{
		text: "Blog",
		href: "https://blog.iqai.com/tag/dev//tag/dev/",
		external: true,
	},
];

type ResourceLinkType = {
	text: string;
	description: string;
	href: string;
	icon: ReactNode;
	external?: boolean;
};

const RESOURCE_LINKS: ResourceLinkType[] = [
	{
		text: "Guides",
		description: "Master the fundamentals with detailed walkthroughs",
		href: "/docs/framework/guides",
		icon: <BookOpen className="size-5 md:size-5.5" />,
	},
	{
		text: "Showcase",
		description: "Explore real-world examples and community projects",
		href: "/showcase",
		icon: <Eye className="size-5 md:size-5.5" />,
	},
	{
		text: "Templates",
		description: "Start building instantly with pre-configured templates",
		href: "https://github.com/IQAIcom/adk-ts-samples",
		icon: <LayoutGrid className="size-5 md:size-5.5" />,
		external: true,
	},
	{
		text: "Tutorials",
		description: "Comprehensive TypeScript ADK implementation examples",
		href: "https://github.com/IQAIcom/adk-ts/tree/main/apps/examples",
		icon: <GraduationCap className="size-5 md:size-5.5" />,
		external: true,
	},
];

/* ──────────────────────────────────────────────
 * Reusable class strings
 * ────────────────────────────────────────────── */

const navLinkClass =
	"text-base font-medium uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors";

const iconBoxClass =
	"rounded-md border border-neutral-700 p-2 bg-white/5 group-hover:bg-white/15 transition-colors";

const actionBtnClass =
	"text-muted-foreground hover:text-primary transition-colors";

/* ──────────────────────────────────────────────
 * Reusable SVG rule components
 * ────────────────────────────────────────────── */

function VerticalRule({ className }: { className?: string }) {
	return (
		<div
			className={`absolute top-0 bottom-0 w-[3px] bg-repeat-y ${className ?? ""}`}
			style={{
				backgroundImage: "url('/landing-page/vertical-rule.svg')",
				backgroundSize: "3px auto",
			}}
		/>
	);
}

function HorizontalRule() {
	return (
		<div
			className="w-full h-[3px] bg-repeat-x"
			style={{
				backgroundImage: "url('/landing-page/horizontal-rule.svg')",
				backgroundSize: "auto 3px",
			}}
		/>
	);
}

/* ──────────────────────────────────────────────
 * GitHub SVG icon
 * ────────────────────────────────────────────── */

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<title>GitHub</title>
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

/* ──────────────────────────────────────────────
 * Navbar
 * ────────────────────────────────────────────── */

export function Navbar() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [resourcesOpen, setResourcesOpen] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);

	// Close resources dropdown on outside click
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (navRef.current && !navRef.current.contains(e.target as Node)) {
				setResourcesOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<>
			{/* Backdrop overlay — outside nav so it covers the full page */}
			{resourcesOpen && (
				<button
					type="button"
					className="hidden md:block fixed inset-0 z-40 bg-black/25 w-full h-full cursor-default"
					onClick={() => setResourcesOpen(false)}
					aria-label="Close resources menu"
				/>
			)}
			<nav
				ref={navRef}
				className="sticky top-0 z-50 border-b landing-border-gradient py-3 lg:py-4"
				style={{ background: "#D9D9D908", backdropFilter: "blur(36px)" }}
			>
				{/* ── Desktop & mobile top bar ── */}
				<div className="mx-auto max-w-7xl">
					<div className="mx-3  md:mx-10 lg:mx-12 flex items-center justify-between">
						{/* Brand logo */}
						<Link href="/" className="flex items-center gap-2 font-semibold">
							<Image
								src="/adk.png"
								alt="ADK-TS"
								width={30}
								height={30}
								className="rounded-lg"
							/>
							<span>ADK-TS</span>
						</Link>

						{/* Navigation pill — contains links (desktop) + actions (all sizes) */}
						<div className="flex items-center gap-10 rounded-md border border-neutral-700 p-2 bg-white/5 transition-colors px-5 py-2">
							{/* Primary nav links — desktop only */}
							{NAV_LINKS.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className={`hidden md:block ${navLinkClass}`}
									{...(link.external && {
										target: "_blank",
										rel: "noopener noreferrer",
									})}
								>
									{link.text}
								</Link>
							))}

							{/* Resources dropdown trigger — desktop only */}
							<button
								type="button"
								onClick={() => setResourcesOpen(!resourcesOpen)}
								className={`hidden md:inline-flex items-center gap-1 ${navLinkClass}`}
							>
								Resources
								<ChevronDown
									className={`h-3 w-3 transition-transform ${resourcesOpen ? "rotate-180" : ""}`}
								/>
							</button>

							{/* Action buttons — all sizes */}
							<div className="flex items-center gap-4">
								<button
									type="button"
									className={actionBtnClass}
									aria-label="Search"
								>
									<Search className="size-6" />
								</button>

								<Link
									href="https://github.com/IQAICOM/adk-ts"
									target="_blank"
									rel="noopener noreferrer"
									className={actionBtnClass}
									aria-label="GitHub"
								>
									<GitHubIcon className="size-6" />
								</Link>

								{/* Mobile menu toggle */}
								<button
									type="button"
									className={`md:hidden ml-1 ${actionBtnClass}`}
									onClick={() => setMobileOpen(!mobileOpen)}
									aria-label="Toggle menu"
								>
									{mobileOpen ? (
										<X className="size-6" />
									) : (
										<Menu className="size-6" />
									)}
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* ── Desktop resources dropdown — full-bleed overlay ── */}
				{resourcesOpen && (
					<div
						className="hidden md:block absolute left-1/2 -translate-x-1/2 w-screen z-40"
						style={{
							background: "var(--color-neutral-950, #0A0A0A)",
							boxShadow: "0px 38px 50px 10px #00000040",
						}}
					>
						{/* Top row (first 2 resources) */}
						<div className="mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x relative">
							<VerticalRule className="left-0" />
							<VerticalRule className="left-1/2 -translate-x-1/2" />
							<VerticalRule className="right-0" />
							<div className="grid grid-cols-2">
								{RESOURCE_LINKS.slice(0, 2).map((link) => (
									<DesktopResourceLinkType
										key={link.href}
										link={link}
										onClick={() => setResourcesOpen(false)}
									/>
								))}
							</div>
						</div>

						{/* Full-bleed horizontal divider */}
						<HorizontalRule />

						{/* Bottom row (last 2 resources) */}
						<div className="mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x relative">
							<VerticalRule className="left-0" />
							<VerticalRule className="left-1/2 -translate-x-1/2" />
							<VerticalRule className="right-0" />
							<div className="grid grid-cols-2">
								{RESOURCE_LINKS.slice(2, 4).map((link) => (
									<DesktopResourceLinkType
										key={link.href}
										link={link}
										onClick={() => setResourcesOpen(false)}
									/>
								))}
							</div>
						</div>
					</div>
				)}

				{/* ── Mobile menu — full-screen overlay ── */}
				{mobileOpen && (
					<div className="md:hidden fixed top-0 left-0 w-screen h-screen z-100 flex flex-col bg-black">
						{/* Mobile header — logo + close button */}
						<header className="flex items-center justify-between px-6 py-3 border-b landing-border-gradient bg-[#d9d9d913]">
							<Link
								href="/"
								className="flex items-center gap-2 font-semibold"
								onClick={() => setMobileOpen(false)}
							>
								<Image
									src="/adk.png"
									alt="ADK-TS"
									width={30}
									height={30}
									className="rounded-lg"
								/>
								<span>ADK-TS</span>
							</Link>
							<button
								type="button"
								className="rounded-md border border-neutral-700 p-2 bg-white/5 hover:bg-white/10 transition-colors"
								onClick={() => setMobileOpen(false)}
								aria-label="Close menu"
							>
								<X className="size-5" />
							</button>
						</header>

						{/* Mobile nav body — scrollable with vertical SVG rules */}
						<div className="flex-1 overflow-y-auto mx-6 md:mx-10">
							<div className="relative min-h-full">
								<VerticalRule className="left-0" />
								<VerticalRule className="right-0" />

								<div className="mx-3 sm:mx-6">
									{/* Primary nav links */}
									{NAV_LINKS.map((link) => (
										<div key={link.href}>
											<Link
												href={link.href}
												className="block py-4 text-sm sm:text-lg font-medium text-foreground hover:bg-white/5 transition-colors"
												onClick={() => setMobileOpen(false)}
												{...(link.external && {
													target: "_blank",
													rel: "noopener noreferrer",
												})}
											>
												{link.text}
											</Link>
											<HorizontalRule />
										</div>
									))}

									{/* Resources accordion */}
									<div>
										<button
											type="button"
											onClick={() => setResourcesOpen(!resourcesOpen)}
											className="flex w-full text-sm sm:text-lg items-center justify-between py-4 font-medium text-foreground hover:bg-white/5 transition-colors"
										>
											Resources
											<ChevronDown
												className={`h-4 w-4 transition-transform ${resourcesOpen ? "rotate-180" : ""}`}
											/>
										</button>
										<HorizontalRule />

										{/* Expanded resource links */}
										{resourcesOpen && (
											<div>
												{RESOURCE_LINKS.map((link) => (
													<div key={link.href}>
														<MobileResourceLinkType
															link={link}
															onClick={() => setMobileOpen(false)}
														/>
														<HorizontalRule />
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Mobile footer — copyright, newsletter, IQ branding */}
						<footer className="border-y landing-border py-5 relative">
							<VerticalRule className="left-6 md:left-10" />
							<VerticalRule className="right-6 md:right-10" />
							<div className="mx-9 sm:mx-12 md:mx-16 flex flex-col items-center sm:flex-row sm:justify-between gap-4">
								<p className="text-xs text-neutral-400 text-center sm:text-left">
									&copy; {CURRENT_YEAR} ADK-TS. Released under the MIT License.
								</p>
								<div className="flex items-center gap-y-4 gap-x-6 flex-col sm:flex-row">
									<Link
										href="https://www.getdrip.com/forms/505929689/submissions/new"
										className="landing-newsletter-btn"
										target="_blank"
										rel="noopener noreferrer"
									>
										Newsletter
									</Link>
									<span className="text-xs font-medium tracking-wide text-neutral-400">
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
						</footer>
					</div>
				)}
			</nav>
		</>
	);
}

/* ──────────────────────────────────────────────
 * Desktop resource link (used in dropdown grid)
 * ────────────────────────────────────────────── */

function DesktopResourceLinkType({
	link,
	onClick,
}: {
	link: ResourceLinkType;
	onClick: () => void;
}) {
	return (
		<Link
			href={link.href}
			className="group px-6 md:px-8 lg:px-16 py-6 hover:bg-white/5 transition-colors"
			onClick={onClick}
			{...(link.external && {
				target: "_blank",
				rel: "noopener noreferrer",
			})}
		>
			<div className="flex items-start gap-4">
				<span className={iconBoxClass}>{link.icon}</span>
				<div className="grid gap-3">
					<div className="text-lg font-medium text-foreground">{link.text}</div>
					<div className="text-sm text-muted-foreground">
						{link.description}
					</div>
				</div>
			</div>
		</Link>
	);
}

/* ──────────────────────────────────────────────
 * Mobile resource link (used in accordion)
 * ────────────────────────────────────────────── */

function MobileResourceLinkType({
	link,
	onClick,
}: {
	link: ResourceLinkType;
	onClick: () => void;
}) {
	return (
		<Link
			href={link.href}
			className="group flex items-start gap-3 py-7 hover:bg-white/5 transition-colors"
			onClick={onClick}
			{...(link.external && {
				target: "_blank",
				rel: "noopener noreferrer",
			})}
		>
			<span className={iconBoxClass}>{link.icon}</span>
			<div className="grid gap-3">
				<div className="text-sm sm:text-lg font-medium text-foreground">
					{link.text}
				</div>
				<div className="text-xs sm:text-sm text-muted-foreground">
					{link.description}
				</div>
			</div>
		</Link>
	);
}
