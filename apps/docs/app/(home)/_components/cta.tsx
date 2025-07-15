import Link from "next/link";

export function CTA() {
	return (
		<section className="bg-gradient-to-r from-primary/5 via-chart-1/5 to-chart-2/5 px-4 py-16">
			<div className="mx-auto max-w-4xl space-y-8 text-center">
				<div className="space-y-4">
					<h2 className="font-bold text-3xl text-foreground md:text-4xl">
						Ready to Build Your First Agent?
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
						Join developers building the future of AI with TypeScript. Get
						started with our comprehensive documentation and examples.
					</p>
				</div>

				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Link
						className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 font-medium text-lg text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90"
						href="/docs/get-started/installation"
					>
						Start Building
						<svg
							className="ml-2 h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M13 7l5 5m0 0l-5 5m5-5H6"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</Link>

					<Link
						className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-8 py-3 font-medium text-foreground text-lg transition-all hover:bg-accent hover:text-accent-foreground"
						href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
						rel="noopener noreferrer"
						target="_blank"
					>
						View Examples
						<svg
							className="ml-2 h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</Link>
				</div>
			</div>
		</section>
	);
}
