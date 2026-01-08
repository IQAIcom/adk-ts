import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";
import { projects } from "./_schema";

export default function ShowcasePage() {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			<Hero />

			{/* Projects Grid */}
			<section className="container mx-auto px-4 py-8 md:py-12">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{projects.map((project) => (
						<ProjectCard
							key={project.title}
							title={project.title}
							description={project.description}
							link={project.link}
							tags={project.tags}
							image={project.image}
						/>
					))}
				</div>
			</section>

			{/* Flush Footer CTA */}
			<section className="w-full bg-card/20 border-t border-border mt-16">
				<div className="relative overflow-hidden">
					{/* Glow Effect */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

					<div className="relative z-10 container mx-auto px-4 py-16 text-center">
						<div className="space-y-6 max-w-3xl mx-auto">
							<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-br from-foreground to-foreground/70">
								Ready to Share Your Agent?
							</h2>
							<p className="text-muted-foreground text-lg">
								Join the developers building the future of AI with ADK-TS. Share
								your project in our GitHub Discussions under 'Show & Tell'.
							</p>
							<div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
								<a
									href="https://github.com/IQAIcom/adk-ts/discussions/404"
									target="_blank"
									rel="noopener noreferrer"
									className="group inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg hover:shadow-primary/25"
								>
									Share Project
									<svg
										className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Arrow Right Icon</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 7l5 5m0 0l-5 5m5-5H6"
										/>
									</svg>
								</a>
								<a
									href="https://github.com/IQAIcom/adk-ts/discussions"
									target="_blank"
									rel="noopener noreferrer"
									className="group inline-flex items-center justify-center rounded-lg border border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-lg"
								>
									View Discussions
									<svg
										className="ml-2 h-4 w-4 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-1"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>ChevronRight Icon</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
