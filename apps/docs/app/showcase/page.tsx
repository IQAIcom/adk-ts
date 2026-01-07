import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";
import { projects } from "./_schema";

export default function ShowcasePage() {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			<Hero />

			{/* Projects Grid */}
			<section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

			{/* Call to Action */}
			<section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
				<div className="bg-card/50 border border-border rounded-xl p-8 sm:p-12 text-center">
					<h2 className="text-3xl sm:text-4xl font-bold mb-4">
						Share Your Project
					</h2>
					<p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
						Built something amazing with ADK-TS? We'd love to feature your
						project! Open a PR or reach out to our community.
					</p>
					<a
						href="https://github.com/IQAIcom/adk-ts"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						Contribute on GitHub
					</a>
				</div>
			</section>
		</div>
	);
}
