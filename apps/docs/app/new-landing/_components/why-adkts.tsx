"use client";

import { Blocks, Box, Cog, GitFork, Layers, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionWrapper } from "./section-wrapper";

const features = [
	{
		id: "agentbuilder-api",
		icon: Box,
		label: "AgentBuilder API",
		title: "AgentBuilder API",
		description:
			"Build single-prompt agents and full multi-team orchestrators with the same fluent AgentBuilder interface, without any rewrites or boilerplate changes.",
		image: "/landing-page/agentbuilder.svg",
	},
	{
		id: "multi-llm-support",
		icon: Layers,
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
			"Enterprise-grade session management, persistent memory, and artifact handling built in from day one — not bolted on as an afterthought.",
		image: "/landing-page/production-ready.svg",
	},
	{
		id: "advanced-tooling",
		icon: Cog,
		label: "Advanced Tooling",
		title: "Advanced Tooling",
		description:
			"Create custom tools with full type safety, automatic schema generation, and seamless MCP server integration for unlimited extensibility.",
		image: "/landing-page/advanced-tooling.svg",
	},
	{
		id: "multi-agent-workflows",
		icon: GitFork,
		label: "Multi-Agent Workflows",
		title: "Multi-Agent Workflows",
		description:
			"Compose agents into sequential, parallel, or loop-based pipelines with built-in state sharing and orchestration control.",
		image: "/landing-page/multi-agent-workflows.svg",
	},
	{
		id: "workflow-control",
		icon: Blocks,
		label: "Workflow Control",
		title: "Workflow Control",
		description:
			"Fine-grained control over agent execution with callbacks, streaming events, and runtime configuration for every step of your pipeline.",
		image: "/landing-page/workflow-control.svg",
	},
];

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
		<SectionWrapper id="why-adkts" className="landing-glow">
			{/* Section header */}
			<div className="mb-12 lg:mb-16">
				<span className="landing-badge mb-4 inline-block">Core Features</span>
				<h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-4">
					Why ADK-TS?
				</h2>
				<p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl">
					A TypeScript-native framework for building, orchestrating, and running
					AI agents in production. Built for developers who want full control.
				</p>
			</div>

			{/* Desktop: side nav + scrolling content */}
			<div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-12">
				{/* Left nav — sticky */}
				<nav className="sticky top-24 self-start space-y-1">
					{features.map((feature, index) => {
						const Icon = feature.icon;
						const isActive = index === activeIndex;
						return (
							<button
								key={feature.id}
								type="button"
								onClick={() => scrollToFeature(index)}
								className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-md transition-colors text-sm ${
									isActive
										? "text-primary border-l-2 border-primary bg-primary/5"
										: "text-muted-foreground hover:text-foreground border-l-2 border-transparent"
								}`}
							>
								<Icon className="size-4 shrink-0" />
								{feature.label}
							</button>
						);
					})}

					{/* Progress indicator */}
					<div className="flex items-center gap-3 pt-6 px-4 text-xs text-muted-foreground">
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
				<div className="space-y-24">
					{features.map((feature, index) => (
						<div
							key={feature.id}
							ref={(el) => {
								sectionRefs.current[index] = el;
							}}
							className="scroll-mt-24"
						>
							<div className="landing-gradient-border rounded-lg p-6 mb-8">
								<h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
							<div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
								<Image
									src={feature.image}
									alt={feature.title}
									fill
									className="object-contain"
								/>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Mobile/Tablet: stacked layout */}
			<div className="lg:hidden space-y-16">
				{features.map((feature) => (
					<div key={feature.id}>
						<div className="landing-gradient-border rounded-lg p-5 mb-6">
							<h3 className="text-base font-semibold mb-2">{feature.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{feature.description}
							</p>
						</div>
						<div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
							<Image
								src={feature.image}
								alt={feature.title}
								fill
								className="object-contain"
							/>
						</div>
					</div>
				))}
			</div>
		</SectionWrapper>
	);
}
