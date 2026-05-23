"use client";

import "../landing.css";
import { Navbar } from "../_components/navbar";
import { DocsHero } from "../_components/docs-hero";
import { DocsLinksSection } from "../_components/docs-links";
import CTASection from "../_components/cta";
import { Footer } from "../_components/footer";

export default function DocsPage() {
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
			{/* Glow — behind stars */}
			<div className="landing-glow-container" aria-hidden="true">
				<div className="landing-glow-orb" />
			</div>
			<main id="main-content" className="relative z-10">
				<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x">
					<DocsHero />
					<DocsLinksSection />
					<CTASection />
				</div>
			</main>
			<div className="mx-3 sm:mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x z-10">
				<Footer />
			</div>
		</div>
	);
}
