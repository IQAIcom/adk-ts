"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import Link from "next/link";

interface MCPHighlight {
	name: string;
	mcpName: string;
	description: string;
	features: string[];
}

interface CategoryContent {
	id: string;
	label: string;
	description: string;
	highlights: MCPHighlight[];
}

const categories: CategoryContent[] = [
	{
		id: "defi",
		label: "DeFi & Blockchain",
		description:
			"Connect agents to DeFi protocols, DEXs, and on-chain data across 200+ chains",
		highlights: [
			{
				name: "DeFi Llama",
				mcpName: "McpDefillama",
				description:
					"Access comprehensive DeFi protocol data including TVL, yield rates, and historical metrics",
				features: [
					"Real-time TVL tracking",
					"Protocol revenue analytics",
					"200+ chains supported",
				],
			},
			{
				name: "DeBank",
				mcpName: "McpDebank",
				description:
					"Track wallet portfolios, DeFi positions, and NFT holdings across multiple chains",
				features: [
					"Multi-chain portfolio tracking",
					"DeFi position analysis",
					"NFT valuation",
				],
			},
			{
				name: "Odos",
				mcpName: "McpOdos",
				description:
					"Smart order routing across DEXs for optimal swap paths and best execution",
				features: [
					"Multi-hop optimization",
					"20+ chains",
					"100+ DEX integrations",
				],
			},
		],
	},
	{
		id: "prediction",
		label: "Prediction Markets",
		description:
			"Build agents that interact with prediction and betting markets for market intelligence",
		highlights: [
			{
				name: "Polymarket",
				mcpName: "McpPolymarket",
				description:
					"Access decentralized prediction markets built on Polygon for odds, bets, and outcomes",
				features: [
					"Real-time market odds",
					"Order placement",
					"Historical resolution data",
				],
			},
			{
				name: "Kalshi",
				mcpName: "McpKalshi",
				description:
					"CFTC-regulated event contracts marketplace for US-based prediction markets",
				features: [
					"Regulated trading",
					"Economic & political events",
					"Settlement tracking",
				],
			},
			{
				name: "Limitless",
				mcpName: "McpLimitless",
				description:
					"Aggregated prediction data from multiple sources for comprehensive intelligence",
				features: [
					"Cross-platform aggregation",
					"Consensus calculations",
					"Real-time comparison",
				],
			},
		],
	},
	{
		id: "communication",
		label: "Communication",
		description:
			"Enable agents to interact through popular messaging and community platforms",
		highlights: [
			{
				name: "Telegram",
				mcpName: "McpTelegram",
				description:
					"Build Telegram bots powered by ADK-TS agents with full messaging capabilities",
				features: [
					"Bot messaging",
					"Command handling",
					"Group management",
					"Media uploads",
				],
			},
			{
				name: "Discord",
				mcpName: "McpDiscord",
				description:
					"Create Discord bots with agent capabilities for server and community management",
				features: [
					"Slash commands",
					"Role management",
					"Voice integration",
					"Embeds & reactions",
				],
			},
		],
	},
	{
		id: "ai-knowledge",
		label: "AI & Knowledge",
		description:
			"Specialized MCPs for agent orchestration, knowledge bases, and utilities",
		highlights: [
			{
				name: "NEAR Agent",
				mcpName: "McpNearAgent",
				description:
					"Build and deploy AI agents on NEAR blockchain with intent-based interactions",
				features: [
					"On-chain agent execution",
					"Intent routing",
					"Smart contract calls",
				],
			},
			{
				name: "IQ Wiki",
				mcpName: "McpIqWiki",
				description:
					"Access decentralized knowledge base for blockchain and crypto information",
				features: [
					"Structured knowledge retrieval",
					"Semantic search",
					"Fact verification",
				],
			},
			{
				name: "Filesystem & Memory",
				mcpName: "McpFilesystem / McpMemory",
				description:
					"Essential utilities for file operations and persistent memory management",
				features: [
					"File read/write/search",
					"Session persistence",
					"Context retention",
				],
			},
		],
	},
];

const MCPServersSection = () => {
	const [activeTab, setActiveTab] = useState("defi");
	const activeCategory =
		categories.find((cat) => cat.id === activeTab) || categories[0];

	return (
		<SectionWrapper id="mcp-servers">
			{/* Section Header */}
			<div className="landing-section-header">
				<span className="landing-badge">Model Context Protocol (MCP)</span>
				<h2>Pre-Built MCP Servers</h2>
				<p>
					Production-ready MCP servers built by IQ AI for DeFi, market data,
					messaging, prediction markets, and more. Use them with ADK-TS, other
					agent frameworks, or any MCP-compatible runtime.
				</p>
			</div>

			<div>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}
				>
					<div className="flex items-start justify-between gap-8 mb-12">
						{/* Explore All MCPs button */}
						<Link
							href="/docs/mcp-servers"
							className="group inline-flex items-center gap-3 px-6 py-3 border-2 border-primary bg-primary/10 hover:bg-primary/20 transition-all duration-300 whitespace-nowrap shrink-0"
						>
							<span className="font-mono text-sm text-primary">
								Browse All MCP Servers
							</span>
							<ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
						</Link>

						{/* Overview Stats */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
							<div className="p-6 border border-white/10 bg-black/40">
								<div className="text-4xl font-semibold mb-2">20+</div>
								<div className="text-sm text-white/40">MCP Servers</div>
							</div>
							<div className="p-6 border border-white/10 bg-black/40">
								<div className="text-4xl font-semibold mb-2">4</div>
								<div className="text-sm text-white/40">Categories</div>
							</div>
							<div className="p-6 border border-white/10 bg-black/40">
								<div className="text-4xl font-semibold mb-2">100%</div>
								<div className="text-sm text-white/40">TypeScript First</div>
							</div>
							<div className="p-6 border border-white/10 bg-black/40">
								<div className="text-4xl font-semibold mb-2">MIT</div>
								<div className="text-sm text-white/40">MIT Licensed</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Horizontal Tabs */}
			<div className="mb-0">
				<div className="flex gap-0 overflow-x-auto">
					{categories.map((category, index) => (
						<button
							type="button"
							key={category.id}
							onClick={() => setActiveTab(category.id)}
							className={`px-6 py-3 text-sm whitespace-nowrap border transition-all duration-300 ${
								activeTab === category.id
									? "border-primary border-b-transparent bg-primary/20 text-primary relative z-10 shadow-[0_0_20px_rgba(255,26,136,0.3)]"
									: "border-white/10 border-b-white/10 bg-black/20 text-white/60 hover:border-white/20 hover:text-white/80 hover:bg-black/30"
							} ${index === 0 ? "" : "-ml-px"}`}
						>
							{category.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<AnimatePresence mode="wait">
				<motion.div
					key={activeTab}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
					className="border border-white/10 bg-black/40 p-12 -mt-px"
				>
					{/* Category Description */}
					<div className="mb-10">
						<p className="text-lg text-white/70 leading-relaxed">
							{activeCategory.description}
						</p>
					</div>

					{/* MCP Highlights Grid */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
						{activeCategory.highlights.map((highlight) => (
							<div
								key={highlight.name}
								className="border border-white/10 bg-black/60 p-6 hover:border-primary/30 hover:bg-black/80 transition-all duration-300"
							>
								<div className="mb-4">
									<div className="px-3 py-1 border border-white/10 bg-white/5 rounded text-xs text-white/40 inline-block mb-3">
										{highlight.mcpName}
									</div>
									<h4 className="text-xl mb-2">{highlight.name}</h4>
									<p className="text-sm text-white/60 leading-relaxed">
										{highlight.description}
									</p>
								</div>

								<div className="space-y-2">
									{highlight.features.map((feature) => (
										<div key={feature} className="flex items-start gap-2">
											<div className="w-1 h-1 bg-primary mt-2 flex-shrink-0" />
											<div className="text-xs text-white/50">{feature}</div>
										</div>
									))}
								</div>
							</div>
						))}

						{/* Bot Animation - Only show for communication tab */}
						{activeTab === "communication" && (
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="border border-white/10 bg-black/60 p-6 flex items-center justify-center min-h-[400px]"
							>
								<div className="flex flex-col items-center gap-4">
									<svg
										aria-hidden="true"
										viewBox="0 0 200 160"
										fill="none"
										className="w-48 h-40 opacity-60"
									>
										<path
											d="M100 40 L160 75 L100 110 L40 75 Z"
											fill="#0F0F0F"
											stroke="white"
											strokeOpacity="0.4"
											strokeWidth="1.5"
										/>
										<path
											d="M40 75 L40 105 L100 140 L100 110 Z"
											fill="#0A0A0A"
											stroke="white"
											strokeOpacity="0.4"
											strokeWidth="1.5"
										/>
										<path
											d="M160 75 L160 105 L100 140 L100 110 Z"
											fill="#121212"
											stroke="white"
											strokeOpacity="0.4"
											strokeWidth="1.5"
										/>
										<path
											d="M40 75 L100 40 L160 75"
											stroke="#FF1A88"
											strokeWidth="1.5"
											fill="none"
											strokeDasharray="2 2"
										/>
									</svg>
									<span className="text-xs text-white/30">
										MCP Communication
									</span>
								</div>
							</motion.div>
						)}
					</div>

					{/* Quick Integration Example */}
					<div className="border-t border-white/5 pt-8">
						<div className="text-xs text-white/40 uppercase tracking-wider mb-4">
							Quick Integration
						</div>
						<div className="p-4 border border-white/10 bg-black/80 rounded font-mono text-sm">
							<pre className="text-white/70 leading-relaxed overflow-x-auto">
								{`import { AgentBuilder, ${activeCategory.highlights[0].mcpName}, getMcpTools } from "@iqai/adk";

const mcp = new ${activeCategory.highlights[0].mcpName}();
const agent = await AgentBuilder.create("my_agent")
  .withTools(...getMcpTools(mcp))
  .build();`}
							</pre>
						</div>
					</div>
				</motion.div>
			</AnimatePresence>

			{/* Compatibility Footer */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6, delay: 0.3 }}
				className="mt-16 pt-8 border-t border-white/5"
			>
				<div className="flex flex-wrap gap-6 items-center justify-center">
					<div className="text-sm text-white/40">COMPATIBILITY</div>
					<div className="flex flex-wrap gap-3 justify-center">
						<div className="px-4 py-2 border border-primary/30 bg-primary/10 rounded text-xs text-primary">
							ADK-TS v2.0+
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Standalone Usage
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Node.js 18+
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							TypeScript 5+
						</div>
					</div>
				</div>
			</motion.div>
		</SectionWrapper>
	);
};
export default MCPServersSection;
