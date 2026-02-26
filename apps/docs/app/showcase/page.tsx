import type { Metadata } from "next";
import ShowcaseFooter from "./_components/footer";
import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";
import { projects } from "./_schema";

export const metadata: Metadata = {
	title: "Showcase",
	description:
		"Discover projects built with ADK-TS — the TypeScript-native AI agent framework. See how developers are building production-ready AI agents.",
	openGraph: {
		title: "ADK-TS Showcase - Projects Built with ADK-TS",
		description:
			"Discover projects built with ADK-TS — the TypeScript-native AI agent framework. See how developers are building production-ready AI agents.",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "ADK-TS Showcase - Projects Built with ADK-TS",
		description:
			"Discover projects built with ADK-TS — the TypeScript-native AI agent framework. See how developers are building production-ready AI agents.",
	},
};

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
			<ShowcaseFooter />
		</div>
	);
}
