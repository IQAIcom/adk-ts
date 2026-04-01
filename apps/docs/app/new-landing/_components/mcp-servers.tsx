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
		label: "Blockchain & DeFi",
		description:
			"Connect agents to on-chain protocols, DEX liquidity, and blockchain execution across multiple networks.",
		highlights: [
			{
				name: "ABI Decoder",
				mcpName: "McpAbi",
				description:
					"Decode and interact with smart contract ABIs for any on-chain address.",
				features: ["ABI fetch", "Function decoding", "Event parsing"],
			},
			{
				name: "NEAR Intents",
				mcpName: "McpNearIntents",
				description:
					"Execute cross-chain swaps and asset moves via NEAR's intent system without managing bridges.",
				features: [
					"Cross-chain intents",
					"Swap execution",
					"Chain abstraction",
				],
			},
			{
				name: "Odos",
				mcpName: "McpOdos",
				description:
					"Aggregated order routing across 100+ DEXs on 20+ chains for optimal swap execution and minimal slippage.",
				features: [
					"Multi-hop optimization",
					"20+ chains",
					"100+ DEX integrations",
				],
			},
		],
	},
	{
		id: "market-data",
		label: "Market Data",
		description:
			"Give agents real-time access to crypto prices, protocol TVL, wallet portfolios, and exchange data.",
		highlights: [
			{
				name: "DeFi Llama",
				mcpName: "McpDefillama",
				description:
					"Access comprehensive DeFi protocol data, including TVL, yield rates, and protocol revenue.",
				features: ["Real-time TVL", "Protocol revenue", "200+ chain support"],
			},
			{
				name: "DeBank",
				mcpName: "McpDebank",
				description:
					"Track wallet portfolios, DeFi positions, and NFT holdings across multiple chains.",
				features: [
					"Multi-chain portfolio",
					"DeFi position analysis",
					"NFT valuation",
				],
			},
			{
				name: "CoinGecko",
				mcpName: "McpCoinGecko",
				description:
					"Access real-time and historical cryptocurrency market data from CoinGecko's free API.",
				features: [
					"Price feeds",
					"Market cap rankings",
					"Historical OHLCV data",
				],
			},
		],
	},
	{
		id: "prediction",
		label: "Prediction",
		description:
			"Build agents that monitor odds, place positions, and aggregate signals across prediction and event markets.",
		highlights: [
			{
				name: "Polymarket",
				mcpName: "McpPolymarket",
				description:
					"Access Polymarket's decentralized prediction markets for real-time odds, position management, and historical resolution data.",
				features: [
					"Real-time market odds",
					"Order placement",
					"Historical resolution",
				],
			},
			{
				name: "Kalshi",
				mcpName: "McpKalshi",
				description:
					"CFTC-regulated event contracts marketplace for US-based prediction markets.",
				features: [
					"Regulated trading",
					"Economic & Political Events",
					"Settlement Tracking",
				],
			},
			{
				name: "Limitless",
				mcpName: "McpLimitless",
				description:
					"Access Limitless prediction markets for question-based event contracts.",
				features: ["Market discovery", "Position tracking", "Settlement data"],
			},
		],
	},
	{
		id: "messaging",
		label: "Messaging",
		description:
			"Give agents a presence in messaging platforms. Send messages, handle commands, and manage communities.",
		highlights: [
			{
				name: "Telegram",
				mcpName: "McpTelegram",
				description:
					"Build Telegram bots with full ADK-TS agent capabilities — messaging, commands, and group management.",
				features: [
					"Bot Messaging",
					"Command Handling",
					"Group management",
					"Media Uploads",
				],
			},
			{
				name: "Discord",
				mcpName: "McpDiscord",
				description:
					"Create Discord bots powered by ADK-TS agents for slash commands, role management, and rich embeds.",
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
		id: "ai-data",
		label: "AI & Data",
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
								{`import { AgentBuilder, ${activeCategory.highlights[0].mcpName} } from "@iqai/adk";

const toolset = ${activeCategory.highlights[0].mcpName}();
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("my-agent")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
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

			{/* External MCP callout */}
			<div className="border border-white/10 rounded-md bg-white/5 p-5 mb-10">
				<p className="text-sm font-medium text-white mb-1">
					Not just IQ AI servers.
				</p>
				<p className="text-xs text-white/50">
					ADK-TS connects to any MCP server from the ecosystem —
					Anthropic&apos;s official servers, community servers, or servers you
					build yourself using the{" "}
					<code className="text-primary/70">mcp-starter</code> template.
				</p>
			</div>
		</SectionWrapper>
	);
};
export default MCPServersSection;
