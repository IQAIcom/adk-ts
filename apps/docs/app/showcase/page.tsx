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

			{/* Minimal Footer CTA - Matching ADK Brand */}
			<section className="container mx-auto px-4 py-16 pb-24">
				<div className="relative overflow-hidden rounded-2xl border border-border bg-card/20 p-8 sm:p-12 text-center">
					{/* Glow Effect */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

					<div className="relative z-10 space-y-6">
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
							Ready to Share Your Agent?
						</h2>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Join the developers building the future of AI with ADK-TS. Share
							your project in our GitHub Discussions under 'Show & Tell'.
						</p>
						<div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
							<a
								href="https://github.com/IQAIcom/adk-ts/discussions/404"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_15px_-5px_rgba(236,72,153,0.5)]"
							>
								Share Project
							</a>
							<a
								href="https://github.com/IQAIcom/adk-ts/discussions"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center justify-center rounded-md border border-border bg-background px-8 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
							>
								View Discussions
							</a>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
