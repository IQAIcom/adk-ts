"use client";

import { Hero } from "./_components/hero";
import { ProjectCard } from "./_components/project-card";

const mainTrackWinners = [
	{
		track: "Agent Application",
		project: "CodeForge AI",
		developer: "@ThinhDinh1706",
		link: "https://dorahacks.io/buidl/34932",
		image: "/showcase/project-screenshots/codeforge.jpeg",
		developerLink: "https://x.com/ThinhDinh1706",
	},
	{
		track: "MCP Expansion",
		project: "OpsPilot",
		developer: "@SoniH30s",
		link: "https://dorahacks.io/buidl/34929",
		image: "/showcase/project-screenshots/ops-pilot.jpeg",
		developerLink: "https://x.com/SoniH30s",
	},
	{
		track: "Web3/Blockchain",
		project: "ChainInsight",
		developer: "@shreshth013",
		link: "https://dorahacks.io/buidl/35098",
		image: "/showcase/project-screenshots/chain-insight.jpeg",
		developerLink: "https://x.com/shreshth013",
	},
];

const bonusTrackWinners = [
	{
		track: "Most Practical Use Case",
		project: "Confluent",
		developer: "@DavidAjibola_",
		link: "https://dorahacks.io/buidl/35006",
		developerLink: "https://x.com/DavidAjibola_",
	},
	{
		track: "Best Bot Integration",
		project: "BingeBird",
		developer: "@rohit_kk",
		link: "https://dorahacks.io/buidl/35011",
		developerLink: "https://www.instagram.com/_rohit_kk_/",
	},
	{
		track: "Best Technical Implementation",
		project: "Obrix",
		developer: "@heydone24",
		link: "https://dorahacks.io/buidl/34987",
		developerLink: "https://x.com/heydone24",
	},
	{
		track: "Best Improvement to ADK-TS",
		project: "Bazaaro",
		developer: "@DukeOphir",
		link: "https://dorahacks.io/buidl/35067",
		developerLink: "https://x.com/DukeOphir",
	},
	{
		track: "Best Collaboration/Team Agent",
		project: "On Chain Analysis Agent",
		developer: "@Jayasaisrikar",
		link: "https://dorahacks.io/buidl/35000",
		developerLink: "https://x.com/jayasaisrikar",
	},
];

const noteworthyProjects = [
	{
		project: "Chain Pilot",
		developer: "@Chain_Oracle",
		link: "https://dorahacks.io/buidl/35057",
		developerLink: "https://x.com/chain_oracle",
	},
	{
		project: "BlockIQ",
		developer: "@shahmusk12",
		link: "https://dorahacks.io/buidl/35102",
		developerLink: "https://x.com/shahmusk12",
	},
	{
		project: "ReflectIQ",
		developer: "@riteshkrkarn & @Khushim1109",
		link: "https://dorahacks.io/buidl/34836",
	},
	{
		project: "KeeperDCA",
		developer: "@localhost_ayush",
		link: "https://dorahacks.io/buidl/34989",
		developerLink: "https://x.com/localhost_ayush",
	},
	{
		project: "Mendel.AI",
		developer: "@alienworl1",
		link: "https://dorahacks.io/buidl/34989",
		developerLink: "https://x.com/alienworl1",
	},
];

const ShowcasePage = () => {
	return (
		<div className="flex flex-col min-h-screen w-full bg-background">
			<Hero />

			<div className="container mx-auto px-4 py-16 space-y-24">
				{/* Main Track Winners */}
				<section>
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold tracking-tight mb-4">
							Main Track Winners
						</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Outstanding projects that demonstrated exceptional innovation and
							technical excellence.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{mainTrackWinners.map((project) => (
							<ProjectCard
								key={project.developer}
								title={project.project}
								description={project.track}
								developer={project.developer}
								link={project.link}
								category="Main Track"
								image={project.image}
								developerLink={project.developerLink}
							/>
						))}
					</div>
				</section>

				{/* Bonus Track Winners */}
				<section>
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold tracking-tight mb-4">
							Bonus Track Winners
						</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Projects that excelled in specific categories and specialized
							implementations.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{bonusTrackWinners.map((project) => (
							<ProjectCard
								key={project.developer}
								title={project.project}
								description={project.track}
								developer={project.developer}
								link={project.link}
								category="Bonus Track"
								developerLink={project.developerLink}
							/>
						))}
					</div>
				</section>

				{/* Noteworthy Projects */}
				<section>
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold tracking-tight mb-4">
							Noteworthy Projects
						</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Impressive contributions that showcase the versatility of the
							ADK-TS framework.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{noteworthyProjects.map((project) => (
							<ProjectCard
								key={project.developer}
								title={project.project}
								developer={project.developer}
								link={project.link}
								category="Honorable Mention"
								developerLink={project.developerLink}
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
