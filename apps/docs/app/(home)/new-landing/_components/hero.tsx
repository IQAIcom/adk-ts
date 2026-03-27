"use client";

import dedent from "dedent";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(() => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [text]);

	return (
		<button
			type="button"
			onClick={copy}
			className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
			aria-label="Copy to clipboard"
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</button>
	);
}

const cliCommand = "npx @iqai/adk-cli new";

const codeSnippet = dedent`
	const workflow = AgentBuilder
	  .asSequential([researchAgent, analysisAgent])
	  .withTools([GoogleSearchTool, DataProcessor])
	  .withMemory(vectorMemoryService);

	const result = await workflow.ask(
	  "Analyze market trends in AI"
	);
`;

const featurePills = [
	"Multi-Agent Systems",
	"Tool Integration",
	"Memory Services",
	"Real-time Streaming",
	"MCP Support",
	"Multi-LLM",
];

export function Hero() {
	return (
		<section className="relative overflow-hidden border-b h-screen landing-border">
			{/* Star background + video layer */}
			<div className="absolute inset-0 overflow-hidden">
				{/* Star specks background */}
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: "url('/landing-page/hero-star-bg.svg')" }}
				/>
				{/* Video - positioned right, ~4/6 width */}
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute top-0 right-0 w-4/6 h-full object-cover opacity-60"
				>
					<source src="/landing-page/hero-video.mp4" type="video/mp4" />
				</video>
			</div>

			{/* Content */}
			<div className="relative z-10 p-6 sm:p-10 lg:p-16">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
					{/* Left Column - Text */}
					<div>
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="mb-6"
						>
							<span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
								<svg
									className="h-3.5 w-3.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Lightning</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
								ADK-TS
							</span>
						</motion.div>

						{/* Heading */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4"
						>
							<span className="text-foreground">
								Build Production-Ready AI Agents in{" "}
							</span>
							<span className="bg-linear-to-r from-primary to-chart-5 bg-clip-text text-transparent">
								TypeScript
							</span>
						</motion.h1>

						{/* Subtitle */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8"
						>
							Enterprise-grade framework for hierarchical agents, tool
							integration, memory management, and real-time streaming — powered
							by multiple LLM providers.
						</motion.p>

						{/* Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="flex flex-wrap gap-3 mb-8"
						>
							<Link
								href="/docs/framework/get-started"
								className="group inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg hover:shadow-primary/25"
							>
								Get Started
								<svg
									className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Arrow Right</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M13 7l5 5m0 0l-5 5m5-5H6"
									/>
								</svg>
							</Link>
							<CliCopyButton />
						</motion.div>
					</div>

					{/* Right Column - Code Preview */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className="w-full"
					>
						<div className="overflow-hidden rounded-lg border landing-border bg-card shadow-xl">
							<div className="flex items-center justify-between border-b landing-border bg-muted/30 px-4 py-2">
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 rounded-full bg-red-500" />
									<div className="h-3 w-3 rounded-full bg-yellow-500" />
									<div className="h-3 w-3 rounded-full bg-green-500" />
								</div>
								<div className="flex items-center gap-2">
									<span className="font-mono text-xs text-muted-foreground">
										agent.ts
									</span>
									<CopyButton text={codeSnippet} />
								</div>
							</div>
							<div className="overflow-x-auto p-4 text-left">
								<DynamicCodeBlock lang="typescript" code={codeSnippet} />
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

function CliCopyButton() {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(() => {
		navigator.clipboard.writeText(cliCommand);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, []);

	return (
		<button
			type="button"
			onClick={copy}
			className="group inline-flex items-center gap-2 rounded-lg border landing-border bg-background/80 backdrop-blur-sm px-4 py-2.5 text-sm font-mono text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105"
		>
			<span className="text-primary">$</span>
			{cliCommand}
			{copied ? (
				<Check className="h-4 w-4 text-green-500" />
			) : (
				<Copy className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
			)}
		</button>
	);
}
