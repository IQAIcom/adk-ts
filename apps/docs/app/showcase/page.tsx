import type { Metadata } from "next";
import ShowcaseFooter from "./_components/footer";
import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";
import { projects } from "./_schema";

export const metadata: Metadata = {
	title: "Showcase - AI Agent Projects and Examples",
	description:
		"Discover AI agent projects built with ADK-TS. Browse community examples, real-world implementations, and starter templates for TypeScript AI agent development.",
	alternates: {
		canonical: "https://adk.iqai.com/showcase",
	},
	openGraph: {
		title: "Showcase - AI Agent Projects and Examples",
		description:
			"Discover AI agent projects built with ADK-TS. Browse community examples, real-world implementations, and starter templates for TypeScript AI agent development.",
		type: "website",
		url: "https://adk.iqai.com/showcase",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Showcase - AI Agent Projects and Examples",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Showcase - AI Agent Projects and Examples",
		description:
			"Discover AI agent projects built with ADK-TS. Browse community examples, real-world implementations, and starter templates for TypeScript AI agent development.",
		images: ["/og-image.png"],
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
