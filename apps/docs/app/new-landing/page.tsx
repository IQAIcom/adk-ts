"use client";

import "./landing.css";
import { Footer } from "./_components/footer";
import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import WhyADKTSSection from "./_components/why-adkts";
import BuiltForDevelopersSection from "./_components/built-for-developers";
import CompleteStackSection from "./_components/complete-stack";
import MCPServersSection from "./_components/mcp-servers";
import InteractiveSimulationsSection from "./_components/interactive-simulations";
import ProjectFeaturesSection from "./_components/project-features";
import GetStartedSection from "./_components/get-started";
import CTASection from "./_components/cta";
import LLMModels from "./_components/llm-models";

export default function HomePage() {
	return (
		<div
			className="dark landing-fonts min-h-screen w-screen bg-black text-white overflow-x-clip"
			style={{ colorScheme: "dark" }}
		>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
			>
				Skip to main content
			</a>
			<Navbar />
			{/* Glow clipped to container width */}
			<div className="landing-glow-container" aria-hidden="true">
				<div className="landing-glow-orb" />
			</div>
			<main id="main-content" className="relative">
				<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
					<Hero />
					<LLMModels />
					<WhyADKTSSection />
					<BuiltForDevelopersSection />
				</div>
				<div className="bg-white">
					<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
						<CompleteStackSection />
						<MCPServersSection />
					</div>
				</div>
				<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
					<InteractiveSimulationsSection />
					<ProjectFeaturesSection />
					<GetStartedSection />
					<CTASection />
				</div>
			</main>
			<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
				<Footer />
			</div>
		</div>
	);
}
