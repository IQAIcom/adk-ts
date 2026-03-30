import Image from "next/image";
import Link from "next/link";
import {
	COMMUNITY_LINKS,
	CURRENT_YEAR,
	DOCUMENTATION_LINKS,
	RESOURCE_LINKS,
	SOCIAL_LINKS,
	SUPPORT_LINKS,
} from "./footer.data";

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
