"use client";

import { CodeExample } from "./_components/code-example";
import { CTA } from "./_components/cta";
import { Features } from "./_components/features";
import { Footer } from "./_components/footer";
import { Hero } from "./_components/hero";

export default function HomePage() {
	return (
		<div className="flex min-h-screen w-screen flex-col">
			<Hero />
			<Features />
			<CodeExample />
			<CTA />
			<Footer />
		</div>
	);
}
