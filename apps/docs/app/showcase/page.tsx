"use client";

import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";

const projects = [
	// Main Track Winners
	{
		track: "Agent Application",
		project: "CodeForge AI",
		link: "https://codeforge-adk.vercel.app/",
		image: "/showcase/project-screenshots/codeforge.jpeg",
		isHackathon: true,
	},
	{
		track: "MCP Expansion",
		project: "OpsPilot",
		link: "https://opspilot-five.vercel.app/",
		image: "/showcase/project-screenshots/ops-pilot.jpeg",
		isHackathon: true,
	},
	{
		track: "Web3/Blockchain",
		project: "ChainInsight",
		link: "https://chain-insight-nine.vercel.app/",
		image: "/showcase/project-screenshots/chain-insight.jpeg",
		isHackathon: true,
	},
	// Bonus Track Winners
	{
		track: "Most Practical Use Case",
		project: "Confluent",
		link: "https://github.com/Davidthecode/confluent",
		isHackathon: true,
	},
	{
		track: "Best Bot Integration",
		project: "BingeBird",
		link: "https://github.com/Rohit-KK15/BingeBird-Bot",
		image: "/showcase/project-screenshots/binge-bird.jpeg",
		isHackathon: true,
	},
	{
		track: "Best Technical Implementation",
		project: "Obrix",
		link: "https://github.com/akbaridria/obrix",
		image: "/showcase/project-screenshots/orbix.jpeg",
		isHackathon: true,
	},
	{
		track: "Best Improvement to ADK-TS",
		project: "Bazaaro",
		link: "https://github.com/phdargen/bazaaro",
		image: "/showcase/project-screenshots/bazaaro.jpeg",
		isHackathon: true,
	},
	{
		track: "Best Collaboration/Team Agent",
		project: "On Chain Analysis Agent",
		link: "https://github.com/jayasaisrikar/on-chain-analysis-agent",
		image: "/showcase/project-screenshots/on-chain-analysis.jpeg",
		isHackathon: true,
	},
	// Noteworthy Projects
	{
		project: "Chain Pilot",
		link: "https://dorahacks.io/buidl/35057",
		isHackathon: true,
	},
	{
		project: "BlockIQ",
		link: "https://dorahacks.io/buidl/35102",
		isHackathon: true,
	},
	{
		project: "ReflectIQ",
		link: "https://dorahacks.io/buidl/34836",
		isHackathon: true,
	},
	{
		project: "KeeperDCA",
		link: "https://dorahacks.io/buidl/34989",
		isHackathon: true,
	},
	{
		project: "Mendel.AI",
		link: "https://dorahacks.io/buidl/34989",
		isHackathon: true,
	},
];

const ShowcasePage = () => {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			<Hero />

			<div className="container mx-auto px-4 py-16 space-y-24">
				<section>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<ProjectCard
								key={project.project}
								title={project.project}
								description={project.track}
								link={project.link}
								image={project.image}
								isHackathon={project.isHackathon}
							/>
						))}
					</div>
				</section>

				{/* Submission Instructions */}
				<section className="text-center py-12 border-t border-border/50">
					<p className="text-muted-foreground">
						Want to showcase your project? Email details to{" "}
						<a
							href="mailto:timonwa@iqai.com"
							className="text-primary hover:underline font-medium"
						>
							timonwa@iqai.com
						</a>
					</p>
				</section>
			</div>
		</div>
	);
};

export default ShowcasePage;
