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
		<div className="landing-fonts min-h-screen w-screen bg-black text-white overflow-x-clip">
			<Navbar />
			<div className="mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x relative landing-glow">
				<Hero />
				<LLMModels />
				<WhyADKTSSection />
				<BuiltForDevelopersSection />
				<CompleteStackSection />
				<MCPServersSection />
				<InteractiveSimulationsSection />
				<ProjectFeaturesSection />
				<GetStartedSection />
				<CTASection />
				<Footer />
			</div>
		</div>
	);
}
