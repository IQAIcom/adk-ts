export interface Project {
	title: string;
	description: string;
	link: string;
	image?: string;
	tags: string[];
}

export const projects: Project[] = [
	{
		title: "Rogue",
		description:
			"Rogue ends crypto analysis paralysis by continuously scanning markets, " +
			"combining on-chain data, social sentiment and advanced technical analysis " +
			"to produce high-conviction signals and automate execution, monitoring, " +
			"and risk-managed trade lifecycle.",
		link: "https://rogue-adk.vercel.app",
		image: "/showcase/project-screenshots/Rogue.jpeg",
		tags: ["Hackathon", "Web3", "Agent Application"],
	},
	{
		title: "Athena: The AI Freedom Shield",
		description:
			"Athena is a stealth AI disguised as a calculator that helps victims secretly save money, plan safe exits with AI, and securely store evidence on-chain—empowering escape and financial independence through decentralized protection.",
		link: "https://athenea-landing.vercel.app",
		image: "/showcase/project-screenshots/athena.jpeg",
		tags: ["Hackathon", "Web3", "Agent Application"],
	},
	{
		title: "Crypto Insight AI",
		description:
			"Crypto investors face fragmented data & complex analysis. CryptoInsight AI solves this via a unified platform offering real-time market intelligence, automated portfolio analysis, natural language chat, and Web3 support through specialized AI agents.",
		link: "https://cryptoinsightai.vercel.app",
		image: "/showcase/project-screenshots/crypto-insight-ai.jpeg",
		tags: ["Hackathon", "Web3", "Agent Application"],
	},
	{
		title: "ResearchOS",
		description:
			"ResearchOS is an autonomous research copilot which uses AI agents to search, analyze, and summarize papers across sources, solving research overload and eliminating the months-long manual effort of discovering and synthesizing academic work.",
		link: "https://research-os-web-tan.vercel.app",
		image: "/showcase/project-screenshots/ResearchOS.jpeg",
		tags: ["Hackathon", "Agent Application"],
	},
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
