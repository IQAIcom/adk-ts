interface Project {
	track: string;
	project: string;
	link: string;
	image?: string;
	isHackathon: boolean;
}

export const projects: Project[] = [
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
];
