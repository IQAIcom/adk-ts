"use client";

import {
	Sparkles,
	ShieldCheck,
	Layers,
	RefreshCw,
	BookOpen,
	LayoutDashboard,
	Box,
	SquareTerminal,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionWrapper } from "./section-wrapper";

const dxHighlights = [
	{
		icon: Sparkles,
		title: "Full IntelliSense",
		description: "Autocomplete every method, prop & type",
	},
	{
		icon: ShieldCheck,
		title: "Zod v4 Schema Support",
		description: "Runtime-safe schemas with full inference",
	},
	{
		icon: Layers,
		title: "Zero Boilerplate",
		description: "One-line agents, no config files",
	},
	{
		icon: LayoutDashboard,
		title: "7 Starter Templates",
		description: "RAG, chat, workflow & more out of the box",
	},
	{
		icon: SquareTerminal,
		title: "ADK-TS CLI",
		description: "Scaffold, dev-serve & deploy in seconds",
	},
	{
		icon: RefreshCw,
		title: "Hot Module Reload",
		description: "Instant feedback loop while you iterate",
	},
	{
		icon: BookOpen,
		title: "Rich Examples",
		description: "Copy-paste patterns for every use case",
	},
	{
		icon: Box,
		title: "ESM · CommonJS",
		description: "Works everywhere — Node, Bun, Deno",
	},
];

const TOTAL_STEPS = dxHighlights.length;
const STEP_INTERVAL = 800; // ms per icon

const BuiltForDevelopersSection = () => {
	const [activeCount, setActiveCount] = useState(0);
	const panelRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		const el = panelRef.current;
		if (!el) return;

		let step = 0;
		let hasPlayed = false;

		const tick = () => {
			step++;
			if (step > TOTAL_STEPS) return; // done, stay at 100%
			setActiveCount(step);
			timerRef.current = setTimeout(tick, STEP_INTERVAL);
		};

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !hasPlayed) {
					hasPlayed = true;
					step = 0;
					setActiveCount(0);
					timerRef.current = setTimeout(tick, STEP_INTERVAL);
				}
			},
			{ threshold: 0.3 },
		);

		observer.observe(el);
		return () => {
			observer.disconnect();
			clearTimeout(timerRef.current);
		};
	}, []);

	const progress = Math.round((activeCount / TOTAL_STEPS) * 100);

	return (
		<SectionWrapper id="built-for-developers" className="landing-glow">
			{/* Section header */}
			<div className="landing-section-header">
				<span className="landing-badge">Developer Experience</span>
				<h2>Built for Developers</h2>
				<p>TypeScript-first . Full IntelliSense . Zero Configuration</p>
			</div>

			{/* Code snippet + DX highlights */}
			<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-y-3.5 lg:gap-x-8">
				<Image
					src="/landing-page/built-for-dev-1.svg"
					alt="Code snippet showing AgentBuilder API with IntelliSense"
					width={799}
					height={468}
					className="w-full h-auto"
				/>
				{/* DX Highlights panel */}
				<div
					ref={panelRef}
					className="border border-white/20 rounded-lg bg-[#0A0A0A99] flex flex-col font-mono"
				>
					<div className="flex items-center gap-2 tracking-widest text-white/50 uppercase bg-[#00000066] border-b border-[#FFFFFF0F] p-5 text-[11px]">
						<span className="size-1.5 bg-primary border border-primary" />
						DX Highlights
					</div>
					<div className="flex-1">
						{dxHighlights.map((item, index) => {
							const Icon = item.icon;
							const isActive = index < activeCount;
							return (
								<div
									key={item.title}
									className="flex items-center gap-4 px-5 py-2.5 first:mt-1 last:mb-4.5"
								>
									<Icon
										className={`size-4.5 shrink-0 transition-colors duration-300 ${isActive ? "text-primary" : "text-white/60"}`}
									/>
									<div>
										<p className="text-xs text-foreground">{item.title}</p>
										<p className="text-[10px] text-white/60">
											{item.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>
					{/* DX Score bar */}
					<div className="flex items-center gap-2 font-mono tracking-widest text-white/50 uppercase bg-[#00000066] border-t border-[#FFFFFF0F] p-5 text-[11px]">
						<div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
							<div
								className="h-full rounded-full bg-linear-to-r from-primary to-[#FF1A8866] transition-[width] duration-100"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<span className="text-[9px] text-white/60">
							DX Score {Math.round(progress)}%
						</span>
					</div>
				</div>
			</div>

			{/* Terminal command */}
			<div
				className="mt-3.5 bg-[#0A0A0A99] px-5 py-3 font-mono text-xs text-white/80 flex items-center gap-3 border border-white/10 rounded-md"
				style={{ boxShadow: "0px 4px 4px 0px #00000040" }}
			>
				<span className="text-primary text-[11px]">$</span>
				<span>
					npx @iqai/adk-cli new my-agent{" "}
					<span className="text-white/40"># project ready in &lt;3s</span>
				</span>
			</div>
		</SectionWrapper>
	);
};

export default BuiltForDevelopersSection;
