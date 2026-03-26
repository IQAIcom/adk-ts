"use client";

import "./landing.css";
import { Footer } from "./_components/footer";
import { Navbar } from "./_components/navbar";
import { Hero } from "./_components/hero";

export default function HomePage() {
	return (
		<div className="min-h-screen w-screen bg-black text-white overflow-x-clip">
			<Navbar />
			<div className="mx-6 md:mx-10 lg:mx-auto max-w-7xl landing-border-x relative">
				<Hero />
				<Footer />
			</div>
		</div>
	);
}
