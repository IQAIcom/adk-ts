"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clipboard, Check } from "lucide-react";
import Link from "next/link";
import { SectionWrapper } from "./section-wrapper";

const CLI_COMMAND = "npx create-adk-project my-agent";

export function DocsHero() {
	const [copied, setCopied] = useState(false);

	const copyCommand = () => {
		navigator.clipboard.writeText(CLI_COMMAND);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<SectionWrapper id="docs-hero" className="relative overflow-hidden">
			{/* Stars background */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					backgroundImage: "url('/showcase/showcase-bg-stars.svg')",
					backgroundRepeat: "no-repeat",
					backgroundSize: "cover",
				}}
				aria-hidden="true"
			/>

			<header className="relative flex flex-col items-center text-center">
				<motion.div
					className="space-y-8 max-w-2xl"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<span className="landing-badge mx-auto">
						Open Source AI Agent Framework
					</span>

					<h1 className="text-5xl md:text-7xl font-geist-sans font-bold tracking-tight leading-none">
						ADK-TS
					</h1>

					<p className="text-sm md:text-lg text-muted-foreground max-w-lg mx-auto">
						Build powerful AI Agents with our comprehensive TypeScript framework
						and MCP server integrations.
					</p>
				</motion.div>

				<motion.div
					className="flex flex-col items-center gap-6 mt-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					{/* CTA Buttons */}
					<div className="flex items-center gap-3">
						<Link
							href="/docs"
							className="inline-flex items-center gap-2 py-2.5 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
						>
							Get Started
							<ArrowRight className="size-4" aria-hidden="true" />
						</Link>
						<Link
							href="/docs/framework/guides"
							className="inline-flex items-center py-2.5 px-5 rounded-md border border-white/20 text-sm font-medium text-white hover:bg-white/5 transition-colors"
						>
							Quickstart Guide
						</Link>
					</div>

					{/* CLI Command */}
					<button
						type="button"
						onClick={copyCommand}
						className="flex items-center gap-3 py-2.5 px-4 rounded-md border border-white/10 bg-white/5 text-sm text-muted-foreground hover:border-white/20 transition-colors font-mono"
						aria-label={copied ? "Copied!" : `Copy command: ${CLI_COMMAND}`}
					>
						<span>{CLI_COMMAND}</span>
						{copied ? (
							<Check className="size-4 text-primary" aria-hidden="true" />
						) : (
							<Clipboard className="size-4" aria-hidden="true" />
						)}
					</button>
				</motion.div>
			</header>
		</SectionWrapper>
	);
}
