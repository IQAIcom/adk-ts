"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FadeInView } from "./fade-in-view";
import { ArrowRight, Clipboard, Check } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import Link from "next/link";
import Image from "next/image";

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
	codeSnippet: string;
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
		codeSnippet: `import { AgentBuilder, McpOdos } from "@iqai/adk";

const toolset = McpOdos({ env: { WALLET_PRIVATE_KEY: process.env.KEY } });
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("defi-agent")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
  .build();

const result = await runner.ask("Swap 1 ETH for USDC on the best route");`,
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
		codeSnippet: `import { AgentBuilder, McpDefillama } from "@iqai/adk";

const toolset = McpDefillama();
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("market-analyst")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
  .build();

const result = await runner.ask("What is Uniswap's TVL today vs last month?");`,
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
		codeSnippet: `import { AgentBuilder, McpPolymarket } from "@iqai/adk";

const toolset = McpPolymarket();
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("prediction-agent")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
  .build();

const result = await runner.ask("What are the odds of a Fed rate cut in Q3?");`,
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
		codeSnippet: `import { AgentBuilder, McpTelegram } from "@iqai/adk";

const toolset = McpTelegram({
  env: { TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN },
});
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("telegram-agent")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
  .withInstruction("You are a helpful Telegram assistant")
  .build();`,
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
		codeSnippet: `import { AgentBuilder, McpNearAgent } from "@iqai/adk";

const toolset = McpNearAgent();
const tools = await toolset.getTools();

const { runner } = await AgentBuilder.create("ai-agent")
  .withModel("gemini-2.5-flash")
  .withTools(...tools)
  .build();`,
	},
];

const AUTO_SWITCH_INTERVAL = 5000;

const MCPServersSection = () => {
	const [activeTab, setActiveTab] = useState("defi");
	const [copied, setCopied] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const hovering = useRef(false);
	const activeCategory =
		categories.find((cat) => cat.id === activeTab) || categories[0];

	const stopInterval = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const startInterval = useCallback(() => {
		stopInterval();
		intervalRef.current = setInterval(() => {
			setActiveTab((prev) => {
				const idx = categories.findIndex((cat) => cat.id === prev);
				return categories[(idx + 1) % categories.length].id;
			});
		}, AUTO_SWITCH_INTERVAL);
	}, [stopInterval]);

	const handleTabClick = (tabId: string) => {
		setActiveTab(tabId);
		if (!hovering.current) startInterval();
	};

	const pauseAutoSwitch = () => {
		hovering.current = true;
		stopInterval();
	};
	const resumeAutoSwitch = () => {
		hovering.current = false;
		startInterval();
	};

	useEffect(() => {
		startInterval();
		return stopInterval;
	}, [startInterval, stopInterval]);

	return (
		<SectionWrapper
			id="mcp-servers"
			className="bg-white text-[#1A1A1A]! border border-[#D1D5DB]! border-t-0"
		>
			{/* Section Header + Explore Button */}
			<FadeInView className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-7 lg:mb-12">
				<div className="landing-section-header mb-0!">
					<span className="relative w-max inline-flex items-center rounded-md bg-[#F3F4F6] backdrop-blur-sm px-3 py-2 text-[10px] lg:text-sm font-medium border text-[#1A1A1A]! border-[#D1D5DB]!">
						Model Context Protocol (MCP)
					</span>
					<h2 className="text-[#0F172A]!">Pre-Built MCP Servers</h2>
					<p className="text-[#475569]!">
						Production-ready MCP servers built by IQ AI for DeFi, market data,
						messaging, prediction markets, and more. Use them with ADK-TS, other
						agent frameworks, or any MCP-compatible runtime.
					</p>
				</div>

				<div>
					<Link
						href="/docs/mcp-servers"
						className="group flex items-center gap-3  py-2.5 px-3 lg:px-5 lg:py-4.5 text-xs md:text-sm border-2 border-primary bg-primary/10 hover:bg-primary/20 transition-all duration-300 whitespace-nowrap shrink-0 rounded-md self-start w-fit"
					>
						<span className="text-sm text-primary">Explore All MCPs</span>
						<ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
					</Link>
				</div>
			</FadeInView>

			{/* Overview Stats */}
			<FadeInView
				className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-7 mb-7 lg:mb-10"
				delay={0.1}
			>
				<div className="px-3.5 py-4 lg:p-6 border rounded-md border-[#D1D5DB]">
					<div className="text-sm md:text-2xl lg:text-4xl text-[#0F172A] font-geist-sans font-semibold mb-1">
						20+
					</div>
					<div className="text-[11px] md:text-sm font-medium text-[#475569]">
						MCP Servers
					</div>
				</div>
				<div className="px-3.5 py-4 p-6 border rounded-md border-[#D1D5DB]">
					<div className="text-sm md:text-2xl lg:text-4xl text-[#0F172A] font-geist-sans font-semibold mb-1 uppercase">
						TypeScript
					</div>
					<div className="text-[11px] md:text-sm font-medium text-[#475569]">
						First
					</div>
				</div>
				<div className="px-3.5 py-4 p-6 border rounded-md border-[#D1D5DB]">
					<div className="text-sm md:text-2xl lg:text-4xl text-[#0F172A] font-geist-sans font-semibold mb-1">
						MIT
					</div>
					<div className="text-[11px] md:text-sm font-medium text-[#475569]">
						Licensed
					</div>
				</div>
				<div className="px-3.5 py-4 p-6 border rounded-md border-[#D1D5DB]">
					<div className="text-sm md:text-2xl lg:text-4xl text-[#0F172A] font-geist-sans font-semibold mb-1">
						Framework
					</div>
					<div className="text-[11px] md:text-sm font-medium text-[#475569]">
						Agnostic
					</div>
				</div>
			</FadeInView>

			{/* Horizontal Tabs */}
			<FadeInView className="lg:mb-0 mb-7" delay={0.2}>
				<div
					className="flex gap-0 overflow-x-auto rounded-md"
					onMouseEnter={pauseAutoSwitch}
					onMouseLeave={resumeAutoSwitch}
					onFocus={pauseAutoSwitch}
					onBlur={resumeAutoSwitch}
					role="tablist"
					aria-label="MCP server categories"
				>
					{categories.map((category, index) => (
						<button
							type="button"
							key={category.id}
							role="tab"
							id={`tab-${category.id}`}
							aria-selected={activeTab === category.id}
							aria-controls={`tabpanel-${category.id}`}
							onClick={() => handleTabClick(category.id)}
							className={`py-2.5 px-3 md:px-6 md:py-3 font-medium text-xs md:text-sm whitespace-nowrap border transition-all duration-300 ${
								activeTab === category.id
									? "border-primary bg-primary/20 text-primary relative z-10"
									: "border-[#D1D5DB] bg-[#F9F9F9] text-[#475569] hover:border-[#D1D5DB] hover:text-[#334155] hover:bg-[#F3F4F6]"
							} ${index === 0 ? "rounded-l-md" : ""} ${index === categories.length - 1 ? "rounded-r-md" : ""}`}
						>
							{category.label}
						</button>
					))}
				</div>
			</FadeInView>

			{/* Tab Content */}
			<div
				className="border border-[#D1D5DB] rounded-md p-4 lg:p-8"
				role="tabpanel"
				id={`tabpanel-${activeCategory.id}`}
				aria-labelledby={`tab-${activeCategory.id}`}
				onMouseEnter={pauseAutoSwitch}
				onMouseLeave={resumeAutoSwitch}
				onFocus={pauseAutoSwitch}
				onBlur={resumeAutoSwitch}
			>
				{/* Category Description */}
				<div className="mb-4.5 lg:mb-10">
					<p className="text-sm lg:text-lg text-[#475569] leading-relaxed">
						{activeCategory.description}
					</p>
				</div>

				{/* MCP Highlights Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
					{activeCategory.highlights.map((highlight) => (
						<div
							key={highlight.name}
							className="border border-[#D1D5DB] rounded-md space-y-4 p-4 lg:p-6"
						>
							<div className="mb-4 space-y-2.5">
								<div className="px-7 py-1 border border-[#D1D5DB] bg-[#F3F4F6] rounded-md font-medium text-xs text-[#475569] inline-block">
									{highlight.mcpName}
								</div>
								<h4 className="text-[13px] md:text-sm lg:text-xl font-geist-sans font-semibold text-[#0F172A]">
									{highlight.name}
								</h4>
								<p className="text-sm lg:text-base text-[#475569] leading-relaxed">
									{highlight.description}
								</p>
							</div>

							<ul className="space-y-2">
								{highlight.features.map((feature) => (
									<li key={feature} className="flex items-start gap-2">
										<span
											className="w-1 h-1 bg-primary mt-2 shrink-0"
											aria-hidden="true"
										/>
										<span className="text-sm lg:text-base text-[#475569]">
											{feature}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}

					{/* Messaging illustration - Only show for messaging tab */}
					{activeTab === "messaging" && (
						<div className="relative border border-[#D1D5DB] rounded-md overflow-hidden">
							<Image
								src="/landing-page/messaging-mcp.svg"
								alt="Messaging MCP integration showing Telegram and Discord connections"
								width={400}
								height={400}
								className="absolute inset-0 w-full h-full object-contain"
								loading="lazy"
								sizes="(max-width: 1024px) 90vw, 33vw"
							/>
						</div>
					)}
				</div>

				{/* Quick Integration Example */}
				<div className="border-t border-[#E4E7EB] pt-8">
					<div className="text-xs text-[#475569] uppercase tracking-wider mb-4">
						Quick Integration
					</div>
					<div className="relative p-4 border bg-[#F9F9F9] border-[#E5E7EB] rounded font-mono text-sm">
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(activeCategory.codeSnippet);
								setCopied(true);
								setTimeout(() => setCopied(false), 2000);
							}}
							className="absolute top-3 right-3 text-primary hover:bg-primary-foreground transition-colors"
							aria-label={copied ? "Copied" : "Copy code"}
						>
							{copied ? (
								<Check className="w-4 h-4" />
							) : (
								<Clipboard className="w-4 h-4" />
							)}
						</button>
						<pre className="text-[#475569] leading-relaxed overflow-x-auto font-geist-mono font-medium text-sm pr-10">
							{activeCategory.codeSnippet}
						</pre>
					</div>
				</div>
			</div>
		</SectionWrapper>
	);
};
export default MCPServersSection;
