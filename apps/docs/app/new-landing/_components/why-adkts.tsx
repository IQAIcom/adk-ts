"use client";

import { Blocks, Cpu, Cog, GitFork, ShieldCheck, Network } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionWrapper } from "./section-wrapper";

const features = [
	{
		id: "agentbuilder-api",
		icon: Cpu,
		label: "AgentBuilder API",
		title: "AgentBuilder API",
		description:
			"Build single-prompt agents and full multi-team orchestrators with the same fluent AgentBuilder interface, without any rewrites or boilerplate changes.",
		image: "/landing-page/agentbuilder.svg",
	},
	{
		id: "multi-llm-support",
		icon: Network,
		label: "Multi-LLM Support",
		title: "Multi-LLM Support",
		description:
			"Seamlessly switch between any LLM provider by changing one string, while your agent logic, tools, and memory remain unchanged.",
		image: "/landing-page/multi-llm-support.svg",
	},
	{
		id: "production-ready",
		icon: ShieldCheck,
		label: "Production-Ready Architecture",
		title: "Production-Ready Architecture",
		description:
			"Deploy to Node.js, serverless, or containers without changing your agent code, with sessions, memory, streaming, and Zod-typed outputs all built in.",
		image: "/landing-page/production-ready.svg",
	},
	{
		id: "advanced-tooling",
		icon: Cog,
		label: "Advanced Tooling",
		title: "Advanced Tooling",
		description:
			"Turn any function into a typed agent tool with automatic schema generation via ADK-TS, and connect to 20+ built-in MCP servers or any external API from a single unified tool registry.",
		image: "/landing-page/advanced-tooling.svg",
	},
	{
		id: "multi-agent-workflows",
		icon: GitFork,
		label: "Multi-Agent Workflows",
		title: "Multi-Agent Workflows",
		description:
			"Run tasks sequentially, in parallel, or in loops using the same AgentBuilder API, with four execution patterns: sequential pipelines, parallel fan-outs, iterative loops, and custom DAGs.",
		image: "/landing-page/multi-agent-workflows.svg",
	},
	{
		id: "workflow-control",
		icon: Blocks,
		label: "Workflow Control",
		title: "Workflow Control",
		description:
			"Pause and resume agent workflows at any step with built-in suspend/resume primitives, enabling human-in-the-loop systems, approval gates, and long-running pipelines using persistent state snapshots and an agent scheduler for cron-style execution.",
		image: "/landing-page/workflow-control.svg",
	},
];

const FeatureItem = ({ feature }: { feature: (typeof features)[0] }) => (
	<>
		<div className="border border-white/10 rounded-md p-5 grid gap-2.5 bg-black/60 max-w-2xl">
			<h3 className="text-lg text-foreground font-medium">{feature.title}</h3>
			<p className="text-base font-medium text-muted-foreground leading-relaxed max-w-xl">
				{feature.description}
			</p>
		</div>
		<div className="mt-10 relative w-full aspect-4/3 overflow-hidden">
			<Image
				src={feature.image}
				alt={feature.title}
				fill
				className="object-contain"
			/>
		</div>
	</>
);

export default function WhyADKTSSection() {
	const [activeIndex, setActiveIndex] = useState(0);
	const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const index = sectionRefs.current.indexOf(
							entry.target as HTMLDivElement,
						);
						if (index !== -1) {
							setActiveIndex(index);
						}
					}
				}
			},
			{ threshold: 0.5, rootMargin: "-20% 0px -20% 0px" },
		);

		for (const ref of sectionRefs.current) {
			if (ref) observer.observe(ref);
		}

		return () => observer.disconnect();
	}, []);

	const scrollToFeature = (index: number) => {
		sectionRefs.current[index]?.scrollIntoView({
			behavior: "smooth",
			block: "center",
		});
	};

	return (
		<SectionWrapper
			id="why-adkts"
			className="bg-black sticky-glow overflow-x-clip"
		>
			{/* Section header */}
			<div className="landing-section-header">
				<span className="landing-badge">Core Features</span>
				<h2>Why ADK-TS?</h2>
				<p>
					A TypeScript-native framework for building, orchestrating, and running
					AI agents in production. Built for developers who want full control.
				</p>
			</div>

			{/* Desktop: side nav + scrolling content */}
			<div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-12">
				{/* Left nav — sticky */}
				<nav className="sticky top-40 self-start space-y-8 mt-[100px]">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						const isActive = index === activeIndex;
						return (
							<button
								key={feature.id}
								type="button"
								onClick={() => scrollToFeature(index)}
								className={`flex items-center gap-2 w-full text-left pl-2 transition-colors text-base font-medium font-satoshi ${
									isActive
										? "text-primary border-l-3 border-primary"
										: "text-muted-foreground hover:text-foreground border-l-2 border-white/10"
								}`}
							>
								<Icon className="size-5 shrink-0" />
								{feature.label}
							</button>
						);
					})}

					{/* Progress indicator */}
					<div className="flex items-center gap-3 pt-8 border-t border-white/10 font-medium text-xs text-white/40">
						<span>{String(activeIndex + 1).padStart(2, "0")}</span>
						<div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
							<div
								className="h-full bg-primary rounded-full transition-all duration-300"
								style={{
									width: `${((activeIndex + 1) / features.length) * 100}%`,
								}}
							/>
						</div>
						<span>{String(features.length).padStart(2, "0")}</span>
					</div>
				</nav>

				{/* Right content */}
				<div className="space-y-24 border py-10 px-8 border-white/10">
					{features.map((feature, index) => (
						<div
							key={feature.id}
							ref={(el) => {
								sectionRefs.current[index] = el;
							}}
							className="scroll-mt-24 border-b border-white/10 last:border-0"
						>
							<FeatureItem feature={feature} />
						</div>
					))}
				</div>
			</div>

			{/* Mobile/Tablet: stacked layout */}
			<div className="lg:hidden space-y-5 md:space-y-10">
				{features.map((feature) => (
					<div
						key={feature.id}
						className="scroll-mt-24 border-b border-white/10 last:border-0"
					>
						<FeatureItem feature={feature} />
					</div>
				))}
			</div>
		</SectionWrapper>
	);
}
