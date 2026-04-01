"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useLayoutEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const showcaseProjects = [
	{
		id: 1,
		title: "AI Research Assistant",
		description:
			"Autonomous research agent that searches the web, analyzes papers, and generates comprehensive reports.",
		tags: ["Multi-Agent", "Web Search", "RAG"],
		github: "research-ai/adk-assistant",
		stats: { agents: 5 },
	},
	{
		id: 2,
		title: "Customer Support Bot",
		description:
			"Production-grade support agent with memory, ticket routing, and seamless handoff to human operators.",
		tags: ["Production", "Memory", "Streaming"],
		github: "supportco/adk-bot",
		stats: { agents: 3 },
	},
	{
		id: 3,
		title: "Code Review Agent",
		description:
			"Multi-LLM code reviewer that analyzes PRs, suggests improvements, and enforces style guidelines.",
		tags: ["Multi-LLM", "GitHub", "Tooling"],
		github: "devtools/code-reviewer",
		stats: { agents: 2 },
	},
	{
		id: 4,
		title: "Content Generator",
		description:
			"Workflow orchestrator that coordinates writers, editors, and SEO agents for content creation.",
		tags: ["Workflow", "Orchestration", "SEO"],
		github: "contentai/generator",
		stats: { agents: 4 },
	},
	{
		id: 5,
		title: "Data Analysis Pipeline",
		description:
			"Agent system that fetches data, runs analysis, generates visualizations, and produces insights.",
		tags: ["Analytics", "Visualization", "Tools"],
		github: "dataai/pipeline",
		stats: { agents: 6 },
	},
	{
		id: 6,
		title: "Email Automation",
		description:
			"Smart email agent with classification, prioritization, draft generation, and calendar integration.",
		tags: ["Automation", "NLP", "Integration"],
		github: "emailai/automation",
		stats: { agents: 3 },
	},
];

const ProjectFeaturesSection = () => {
	const sectionRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const [maxScroll, setMaxScroll] = useState(0);

	// Scroll progress for the section
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start start", "end end"],
	});

	// Horizontal transform - converts scroll progress to horizontal movement
	const x = useTransform(scrollYProgress, [0, 1], [0, -maxScroll]);

	useLayoutEffect(() => {
		const calculateDimensions = () => {
			if (!sectionRef.current || !trackRef.current) return;

			const trackWidth = trackRef.current.scrollWidth;
			const viewportWidth = window.innerWidth;

			// Total horizontal movement required to show all cards
			const horizontalDistance = trackWidth - viewportWidth;

			// Set the section height = viewport height + horizontal distance
			// This creates scroll space for the horizontal movement
			sectionRef.current.style.height = `${horizontalDistance + window.innerHeight}px`;

			// Update the max scroll distance for the transform
			setMaxScroll(horizontalDistance);
		};

		// Calculate on mount
		calculateDimensions();

		// Recalculate on resize
		window.addEventListener("resize", calculateDimensions);

		// Small delay to ensure content is fully loaded
		const timeout = setTimeout(calculateDimensions, 100);

		return () => {
			window.removeEventListener("resize", calculateDimensions);
			clearTimeout(timeout);
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative w-full border-t border-white/5"
		>
			<div className="sticky top-0 h-screen overflow-hidden">
				{/* Vertical boundary lines */}
				<div className="absolute inset-0 pointer-events-none">
					<div className="max-w-[1800px] mx-auto h-full relative">
						<div className="absolute left-[33.333%] top-0 bottom-0 w-px bg-white/5" />
						<div className="absolute left-[66.666%] top-0 bottom-0 w-px bg-white/5" />
					</div>
				</div>

				<div className="max-w-[1800px] mx-auto px-8 h-full flex items-center">
					<div className="grid grid-cols-3 gap-0 w-full">
						{/* LEFT COLUMN (static) */}
						<div className="col-span-1 relative">
							<motion.div
								initial={{ opacity: 0, x: -20 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.6 }}
								viewport={{ once: true }}
							>
								<div className="flex items-center gap-3 mb-4">
									<div className="w-2 h-2 bg-primary" />
									<span className="text-xs font-mono text-white/40 tracking-wider uppercase">
										Showcase
									</span>
								</div>
								<h2 className="font-mono text-4xl mb-6">
									Built with
									<br />
									ADK-TS
								</h2>
								<p className="text-white/50 font-mono text-sm leading-relaxed max-w-sm">
									Real-world projects and production systems powered by the
									Agent Development Kit.
								</p>

								<div className="mt-12 flex items-center gap-4">
									<div className="flex flex-col">
										<span className="text-2xl font-mono font-bold text-white">
											50+
										</span>
										<span className="text-xs font-mono text-white/40">
											Projects
										</span>
									</div>
									<div className="w-px h-12 bg-white/10" />
									<div className="flex flex-col">
										<span className="text-2xl font-mono font-bold text-white">
											15k+
										</span>
										<span className="text-xs font-mono text-white/40">
											Stars
										</span>
									</div>
									<div className="w-px h-12 bg-white/10" />
									<div className="flex flex-col">
										<span className="text-2xl font-mono font-bold text-white">
											200+
										</span>
										<span className="text-xs font-mono text-white/40">
											Contributors
										</span>
									</div>
								</div>

								{/* View All Showcases Button */}
								<Link
									href="/showcases"
									className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-black/40 border border-white/10 hover:border-primary/50 text-white/70 hover:text-white transition-all duration-300 group"
								>
									<span className="text-sm font-mono">View All Showcases</span>
									<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
								</Link>
							</motion.div>
						</div>

						{/* RIGHT COLUMN (horizontal scroll) */}
						<div className="col-span-2 relative overflow-hidden">
							<motion.div
								ref={trackRef}
								style={{ x }}
								className="flex gap-6 pl-8 will-change-transform"
							>
								{showcaseProjects.map((project, index) => (
									<ShowcaseCard
										key={project.id}
										project={project}
										index={index}
									/>
								))}
							</motion.div>

							{/* Scroll indicator */}
							<motion.div
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								transition={{ delay: 0.8 }}
								className="absolute bottom-8 right-8 flex items-center gap-2 text-white/30"
							>
								<span className="text-xs font-mono">SCROLL DOWN</span>
								<motion.div
									animate={{ y: [0, 4, 0] }}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										ease: "easeInOut",
									}}
								>
									<svg
										width="12"
										height="16"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										aria-hidden="true"
									>
										<path d="M6 1v14M1 10l5 5 5-5" />
									</svg>
								</motion.div>
							</motion.div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};
export default ProjectFeaturesSection;

interface ShowcaseCardProps {
	project: (typeof showcaseProjects)[0];
	index: number;
}

function ShowcaseCard({ project, index }: ShowcaseCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, delay: index * 0.1 }}
			viewport={{ once: true, margin: "-100px" }}
			className="group relative w-[420px] shrink-0"
		>
			<div className="relative h-full bg-black/40 border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
				{/* Card header with gradient effect */}
				<div className="relative h-48 bg-linear-to-br from-white/5 to-transparent overflow-hidden">
					{/* Animated grid pattern */}
					<div className="absolute inset-0 opacity-20">
						<div
							className="absolute inset-0"
							style={{
								backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
								backgroundSize: "20px 20px",
							}}
						/>
					</div>

					{/* Pink accent line */}
					<motion.div
						className="absolute top-0 left-0 right-0 h-px bg-primary"
						initial={{ scaleX: 0 }}
						whileInView={{ scaleX: 1 }}
						transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
						viewport={{ once: true }}
						style={{ transformOrigin: "left" }}
					/>

					{/* Stats overlay */}
					<div className="absolute top-4 right-4 flex gap-3">
						<div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 border border-white/10">
							<span className="text-xs font-mono text-white/60">
								{project.stats.agents} agents
							</span>
						</div>
					</div>

					{/* Project number */}
					<div className="absolute bottom-4 left-6">
						<span className="text-6xl font-mono font-bold text-white/5 select-none">
							{String(project.id).padStart(2, "0")}
						</span>
					</div>
				</div>

				{/* Card content */}
				<div className="p-6">
					<h3 className="text-xl font-mono font-bold mb-3 text-white group-hover:text-primary transition-colors duration-300">
						{project.title}
					</h3>

					<p className="text-sm text-white/60 font-mono leading-relaxed mb-6">
						{project.description}
					</p>

					{/* Tags */}
					<div className="flex flex-wrap gap-2 mb-6">
						{project.tags.map((tag) => (
							<span
								key={tag}
								className="px-3 py-1 text-xs font-mono border border-white/10 text-white/50 hover:border-primary/30 hover:text-white/70 transition-all duration-300"
							>
								{tag}
							</span>
						))}
					</div>

					{/* GitHub link */}
					<div className="flex items-center gap-2 text-white/40 group-hover:text-white/60 transition-colors duration-300">
						<svg
							width="14"
							height="14"
							fill="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
						</svg>
						<span className="text-xs font-mono">{project.github}</span>
					</div>
				</div>

				{/* Hover effect border */}
				<div className="absolute inset-0 pointer-events-none">
					<motion.div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
				</div>
			</div>
		</motion.div>
	);
}
