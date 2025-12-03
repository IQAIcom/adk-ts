export interface Project {
	title: string;
	description: string;
	link: string;
	image?: string;
	tags: string[];
}

export const projects: Project[] = [
	{
		title: "CodeForge AI",
		description: "AI-powered code generation and review assistant",
		link: "https://codeforge-adk.vercel.app/",
		image: "/showcase/project-screenshots/codeforge.jpeg",
		tags: ["Hackathon", "Agent Application"],
	},
	{
		title: "OpsPilot",
		description: "Intelligent operations management and automation platform",
		link: "https://opspilot-five.vercel.app/",
		image: "/showcase/project-screenshots/ops-pilot.jpeg",
		tags: ["Hackathon", "MCP Expansion"],
	},
	{
		title: "ChainInsight",
		description: "Blockchain analytics and insights platform",
		link: "https://chain-insight-nine.vercel.app/",
		image: "/showcase/project-screenshots/chain-insight.jpeg",
		tags: ["Hackathon", "Web3"],
	},
	{
		title: "Confluent",
		description: "Practical AI solution for real-world use cases",
		link: "https://github.com/Davidthecode/confluent",
		tags: ["Hackathon", "Agent Application"],
	},
	{
		title: "BingeBird",
		description: "Smart bot integration for enhanced user experiences",
		link: "https://github.com/Rohit-KK15/BingeBird-Bot",
		image: "/showcase/project-screenshots/binge-bird.jpeg",
		tags: ["Hackathon", "Bot Integration"],
	},
	{
		title: "Obrix",
		description:
			"Advanced technical implementation showcasing ADK-TS capabilities",
		link: "https://github.com/akbaridria/obrix",
		image: "/showcase/project-screenshots/orbix.jpeg",
		tags: ["Hackathon", "Agent Application"],
	},
	{
		title: "Bazaaro",
		description: "Innovative improvements and extensions to ADK-TS framework",
		link: "https://github.com/phdargen/bazaaro",
		image: "/showcase/project-screenshots/bazaaro.jpeg",
		tags: ["Hackathon", "Agent Application"],
	},
	{
		title: "On Chain Analysis Agent",
		description: "Collaborative team agent for blockchain data analysis",
		link: "https://github.com/jayasaisrikar/on-chain-analysis-agent",
		image: "/showcase/project-screenshots/on-chain-analysis.jpeg",
		tags: ["Hackathon", "Agent Application"],
	},
];
