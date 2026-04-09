"use client";

import { motion } from "motion/react";
import { SectionWrapper } from "./section-wrapper";
import { SHOWCASE_STATS } from "./showcase.data";

export function ShowcaseHero() {
	return (
		<SectionWrapper id="showcase-hero" className="relative overflow-hidden">
			{/* Stars background — scoped to hero only */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					backgroundImage: "url('/showcase/showcase-bg-stars.svg')",
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
				}}
				aria-hidden="true"
			/>
			<div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
				{/* Left — section header */}
				<motion.header
					className="landing-section-header mb-0! max-w-xl"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<span className="landing-badge">Community Projects</span>
					<h1 className="text-2xl md:text-3xl lg:text-5xl font-semibold tracking-tight">
						Showcases
					</h1>
					<p>
						Real-world AI agent implementations built with ADK-TS. From
						autonomous research assistants to production-grade support systems.
					</p>
				</motion.header>

				{/* Right — stats */}
				<motion.dl
					className="flex items-end gap-8 lg:gap-12 shrink-0"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					<div>
						<dd className="text-4xl lg:text-7xl font-geist-sans font-bold text-white">
							{SHOWCASE_STATS[2].value}
						</dd>
						<dt className="text-sm lg:text-base text-muted-foreground mt-1">
							{SHOWCASE_STATS[2].label}
						</dt>
					</div>
					<div>
						<dd className="text-4xl lg:text-7xl font-geist-sans font-bold text-primary">
							{SHOWCASE_STATS[0].value}
						</dd>
						<dt className="text-sm lg:text-base text-muted-foreground mt-1">
							{SHOWCASE_STATS[0].label}
						</dt>
					</div>
				</motion.dl>
			</div>
		</SectionWrapper>
	);
}
