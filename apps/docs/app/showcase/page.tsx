"use client";

import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";
import { projects } from "./_schema";

const ShowcasePage = () => {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			<Hero />

			<div className="container mx-auto px-4 py-16 space-y-24">
				<section>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<ProjectCard
								key={project.title}
								title={project.title}
								description={project.description}
								link={project.link}
								image={project.image}
								tags={project.tags}
							/>
						))}
					</div>
				</section>

				{/* Submission Instructions */}
				<section className="text-center py-12 border-t border-border/50">
					<p className="text-muted-foreground">
						Want to showcase your project? Share it in our GitHub Discussions
						under{" "}
						<a
							href="https://github.com/IQAIcom/adk-ts/discussions/404"
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline font-medium"
						>
							&apos;Show & Tell&apos;
						</a>
						!
					</p>
				</section>
			</div>
		</div>
	);
};

export default ShowcasePage;
