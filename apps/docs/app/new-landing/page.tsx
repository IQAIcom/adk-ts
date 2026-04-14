"use client";

import dynamic from "next/dynamic";
import "./landing.css";
import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";
import LLMModels from "./_components/llm-models";
import CoreFeaturesSection from "./_components/core-features";

const DeveloperExperienceSection = dynamic(
	() => import("./_components/developer-experience"),
);
const DeveloperPlatformSection = dynamic(
	() => import("./_components/developer-platform"),
);
const MCPServersSection = dynamic(() => import("./_components/mcp-servers"));
const InteractiveSimulationsSection = dynamic(
	() => import("./_components/interactive-simulations"),
);
const CommunityProjectFeatureSection = dynamic(
	() => import("./_components/community-projects-feature"),
);
const GettingStartedSection = dynamic(
	() => import("./_components/getting-started"),
);
const CTASection = dynamic(() => import("./_components/cta"));
const Footer = dynamic(() =>
	import("./_components/footer").then((mod) => ({ default: mod.Footer })),
);

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
					<CoreFeaturesSection />
					<DeveloperExperienceSection />
				</div>
				<div className="bg-white">
					<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
						<DeveloperPlatformSection />
						<MCPServersSection />
					</div>
				</div>
				<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
					<InteractiveSimulationsSection />
					<CommunityProjectFeatureSection />
					<GettingStartedSection />
					<CTASection />
				</div>
			</main>
			<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
				<Footer />
			</div>
		</div>
	);
}
