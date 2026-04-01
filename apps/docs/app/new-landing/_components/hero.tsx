"use client";

import dedent from "dedent";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clipboard, Copy } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

function ClipboardCopyButton({ text }: { text: string }) {
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
			className="inline-flex items-center justify-center rounded-md p-1.5 text-primary hover:text-primary/80 transition-colors"
			aria-label="Copy to clipboard"
		>
			{copied ? <Check className="size-5" /> : <Clipboard className="size-5" />}
		</button>
	);
}

const cliCommand = "npx @iqai/adk-cli new";

const codeSnippet = dedent`
	const { runner } = await AgentBuilder
	  .create("research-pipeline")
	  .withModel("gemini-2.5-flash")
	  .asSequential([researchAgent, analysisAgent, summaryAgent])
	  .withInstruction("Orchestrate research, analysis, and synthesis")
	  .build();

	const result = await runner.ask("Analyze AI market trends");
`;

export function Hero() {
	return (
		<section className="relative overflow-hidden border-b landing-border min-h-screen bg-black">
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
					className="absolute top-0 right-0 w-full lg:w-4/6 h-full object-cover object-left lg:object-contain opacity-60"
				>
					<source src="/landing-page/hero-video.mp4" type="video/mp4" />
				</video>
			</div>

			{/* Content */}
			<div className="relative z-10 flex items-center min-h-screen p-6 sm:p-10 lg:p-16">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-end w-full">
					{/* Left Column - Text */}
					<div className="mt-12 md:mt-24 lg:mt-0 text-center grid gap-3 md:gap-3.5 lg:gap-8 lg:text-left">
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
						>
							<span className="landing-badge">
								Open-Source TypeScript Agent Framework
							</span>
						</motion.div>

						{/* Heading */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="text-2xl sm:text-3xl md:text-4xl lg:text-[3.5rem] font-semibold tracking-tight text-foreground leading-tight"
						>
							Build Production-Ready AI Agents in TypeScript
						</motion.h1>

						{/* Subtitle */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="text-sm sm:text-base font-medium md:text-lg lg:text-2xl text-muted-foreground max-w-lg mx-auto lg:mx-0"
						>
							A TypeScript-first framework for building single and multi-agent
							systems with tools, memory, streaming, and full runtime control.
						</motion.p>

						{/* Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="flex flex-wrap gap-6 mb-8 lg:mb-0 justify-center lg:justify-start"
						>
							<Link
								href="/docs/framework/get-started"
								className="group inline-flex items-center justify-center rounded-lg bg-primary px-5 py-4.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-lg hover:shadow-primary/25"
							>
								Get Started
								<ArrowRight
									className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
									name="Arrow Right"
								/>
							</Link>
							<CliCopyButton />
						</motion.div>
					</div>

					{/* Right Column - Code Preview */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className="w-full max-w-117.5 mx-auto lg:mx-0 lg:ml-auto"
					>
						<div className="hero-code-card landing-gradient-border overflow-hidden rounded-md bg-[#D9D9D90D] backdrop-blur-[36px] grid gap-5 p-3 pb-6">
							<div className="flex items-center justify-between border-b border-white/20">
								<span className="font-mono font-medium text-base text-muted-foreground pb-1">
									agent-pipeline.ts
								</span>
								<ClipboardCopyButton text={codeSnippet} />
							</div>
							<div className="overflow-x-auto text-left text-xs leading-relaxed rounded-md! border-white/20 p-2">
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
			className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm px-5 py-4.5 text-sm font-medium font-mono text-primary-foreground transition-all hover:bg-white/10 hover:text-white"
		>
			{cliCommand}
			{copied ? (
				<Check className="h-4 w-4 text-green-500" />
			) : (
				<Copy className="h-4 w-4 text-primary-foreground" />
			)}
		</button>
	);
}
