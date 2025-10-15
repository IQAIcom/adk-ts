"use client";

import { Hero } from "./_components/hero";
import { Features } from "./_components/features";
import { CodeExample } from "./_components/code-example";
import { CTA } from "./_components/cta";
import { Footer } from "./_components/footer";

export default function HomePage() {
	return (
		<div className="flex flex-col min-h-screen w-screen">
			<Hero />
			<Features />
			<CodeExample />
			<CTA />
			<Footer />
		</div>
	);
}
