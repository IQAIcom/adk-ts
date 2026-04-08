"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useLayoutEffect, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SectionWrapper } from "./section-wrapper";
import { projects } from "@/app/showcase/_schema";
import Image from "next/image";

const showcaseProjects = projects.slice(0, 6); // Show top 6 projects

const ProjectFeaturesSection = () => {
	const sectionRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const rightColRef = useRef<HTMLDivElement>(null);
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
			if (!sectionRef.current || !trackRef.current || !rightColRef.current)
				return;

			const trackWidth = trackRef.current.scrollWidth;
			const visibleWidth = rightColRef.current.offsetWidth;

			// Total horizontal movement = total track minus visible area
			const horizontalDistance = trackWidth - visibleWidth;

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
		<SectionWrapper id="project-features" className="relative">
			{/* Vertical boundary lines — span full section height */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="h-full relative">
					<div className="absolute left-[33.333%] top-0 bottom-0 w-px bg-white/5" />
					<div className="absolute left-[66.666%] top-0 bottom-0 w-px bg-white/5" />
				</div>
			</div>

			{/* Mobile header — shown above sticky on small screens */}
			<div className="lg:hidden mb-8">
				<div className="landing-section-header">
					<span className="landing-badge">Community Projects</span>
					<h2>Built with ADK-TS</h2>
					<p>
						Community-built projects and hackathon winners powered by ADK-TS.
					</p>
				</div>
				<Link
					href="/showcase"
					className="inline-flex items-center py-2.5 px-3 lg:px-5 lg:py-4.5 rounded-md border-2 border-primary text-primary text-xs md:text-sm font-medium transition-colors space-x-3"
				>
					<span className="">View All Showcases</span>
					<ArrowRight className="w-4 h-4" />
				</Link>
			</div>

			<div ref={sectionRef} className="relative w-full">
				<div className="sticky top-30 h-fit overflow-hidden">
					<div className="flex items-center">
						<div className="grid lg:grid-cols-3 gap-0 w-full">
							{/* LEFT COLUMN — hidden on small screens (shown above sticky) */}
							<div className="col-span-1 relative hidden lg:block">
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									whileInView={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.6 }}
									viewport={{ once: true }}
								>
									{/* Section header */}
									<div className="landing-section-header lg:max-w-sm">
										<span className="landing-badge">Community Projects</span>
										<h2>Built with ADK-TS</h2>
										<p>
											Community-built projects and hackathon winners powered by
											ADK-TS.
										</p>

										<div className="flex items-center gap-4">
											<div className="flex flex-col">
												<span className="text-2xl font-bold text-white">
													90+
												</span>
												<span className="text-xs text-white/40">
													Community Projects
												</span>
											</div>
											<div className="w-px h-12 bg-white/10" />
											<div className="flex flex-col">
												<span className="text-2xl font-bold text-white">
													115+
												</span>
												<span className="text-xs text-white/40">Stars</span>
											</div>
											<div className="w-px h-12 bg-white/10" />
											<div className="flex flex-col">
												<span className="text-2xl font-bold text-white">
													100+
												</span>
												<span className="text-xs text-white/40">
													Contributors
												</span>
											</div>
										</div>
									</div>

									{/* View All Showcases Button */}
									<Link
										href="/showcase"
										className="inline-flex items-center py-2.5 px-3 lg:px-5 lg:py-4.5 rounded-md border-2 border-primary text-primary text-xs md:text-sm font-medium transition-colors p-3! space-x-3 text-lg!"
									>
										<span className="text-sm">View All Showcases</span>
										<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
									</Link>
								</motion.div>
							</div>

							<hr className="hidden col-span-3 border-t border-white/10 my-8" />

							{/* RIGHT COLUMN (horizontal scroll) */}
							<div
								ref={rightColRef}
								className="col-span-2 relative mb-9 overflow-hidden"
							>
								<motion.div
									ref={trackRef}
									style={{ x }}
									className="flex gap-6 pl-8 will-change-transform"
								>
									{showcaseProjects.map((project, index) => (
										<ShowcaseCard
											key={project.title}
											project={project}
											index={index}
										/>
									))}
								</motion.div>

								{/* Scroll indicator — static, below the right section */}
								<motion.div
									initial={{ opacity: 0 }}
									whileInView={{ opacity: 1 }}
									transition={{ delay: 0.8 }}
									className="absolute -bottom-8 right-8 flex justify-end mt-8"
								>
									<div className="flex items-center gap-2 text-white">
										<span className="text-xs">SCROLL DOWN</span>
										<motion.div
											animate={{ y: [0, 4, 0] }}
											transition={{
												duration: 2,
												repeat: Number.POSITIVE_INFINITY,
												ease: "easeInOut",
											}}
										>
											{" "}
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
									</div>
								</motion.div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</SectionWrapper>
	);
};
export default ProjectFeaturesSection;

interface ShowcaseCardProps {
	project: (typeof showcaseProjects)[0];
	index: number;
}

function ShowcaseCard({ project, index }: ShowcaseCardProps) {
	return (
		<motion.article
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, delay: index * 0.1 }}
			viewport={{ once: true, margin: "-100px" }}
			className="group relative w-[420px] shrink-0"
		>
			<div className="relative h-full bg-black/40 border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden">
				{/* Card header with gradient effect */}
				<div className="relative h-48 overflow-hidden">
					{/* Cover image */}
					<div className="">
						{project.image ? (
							<Image
								src={project.image}
								alt={project.title}
								fill
								className="object-cover transition-transform duration-500 group-hover:scale-105"
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted/20 to-muted/5 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
								<div className="text-4xl font-bold text-muted-foreground/20 group-hover:text-primary/30 transition-colors">
									{project.title.substring(0, 2).toUpperCase()}
								</div>
							</div>
						)}
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

					{/* Project number */}
					<div className="absolute bottom-4 left-6">
						<span className="text-6xl font-mono font-bold text-white/10 select-none">
							{String(index + 1).padStart(2, "0")}
						</span>
					</div>
				</div>

				{/* Card content */}
				<div className="p-6">
					<h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary transition-colors duration-300">
						{project.title}
					</h3>

					<p className="text-sm text-white/60 leading-relaxed mb-6">
						{project.description.slice(0, 100)}...
					</p>

					{/* Tags */}
					<div className="flex flex-wrap gap-2 mb-6">
						{project.tags.map((tag) => (
							<span
								key={tag}
								className="px-3 py-1 text-xs border border-white/10 text-white/50 hover:border-primary/30 hover:text-white/70 transition-all duration-300"
							>
								{tag}
							</span>
						))}
					</div>

					{/* View code link */}
					<Link
						href={project.link}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 text-white hover:text-white/60 transition-colors duration-300"
					>
						<svg
							width="14"
							height="14"
							fill="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
						</svg>
						<span className="text-xs">View Code</span>
						<ExternalLink className="size-3" />
					</Link>
				</div>

				{/* Hover effect border */}
				<div className="absolute inset-0 pointer-events-none">
					<motion.div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
				</div>
			</div>
		</motion.article>
	);
}
