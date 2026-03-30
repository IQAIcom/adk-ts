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
import { Check } from "lucide-react";
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

// Syntax color tokens
const kw = "text-[#C678DD]"; // keywords: import, from, const, await
const fn = "text-[#61AFEF]"; // functions/methods
const str = "text-[#98C379]"; // strings
const tp = "text-[#E5C07B]"; // types
const pr = "text-[#ABB2BF]"; // punctuation/default

const codeLines = (
	<>
		<span className={kw}>import</span> <span className={pr}>{"{ "}</span>
		<span className={tp}>AgentBuilder</span>
		<span className={pr}>{" }"}</span> <span className={kw}>from</span>{" "}
		<span className={str}>&quot;@iqai/adk&quot;</span>
		<span className={pr}>;</span>
		{"\n"}
		<span className={kw}>import</span> <span className={pr}>{"{ "}</span>
		<span className={tp}>McpDefillama</span>
		<span className={pr}>{" }"}</span> <span className={kw}>from</span>{" "}
		<span className={str}>&quot;@iqai/adk&quot;</span>
		<span className={pr}>;</span>
		{"\n"}
		<span className={kw}>import</span> <span className={fn}>z</span>{" "}
		<span className={kw}>from</span>{" "}
		<span className={str}>&quot;zod/v4&quot;</span>
		<span className={pr}>;</span>
		{"\n"}
		{"\n"}
		<span className={kw}>const</span> <span className={fn}>outputSchema</span>{" "}
		<span className={pr}>=</span> <span className={fn}>z</span>
		<span className={pr}>.</span>
		<span className={fn}>object</span>
		<span className={pr}>({"{"}</span>
		{"\n"}
		{"  "}
		<span className={pr}>tvl:</span> <span className={fn}>z</span>
		<span className={pr}>.</span>
		<span className={fn}>number</span>
		<span className={pr}>(),</span>
		{"\n"}
		{"  "}
		<span className={pr}>protocol:</span> <span className={fn}>z</span>
		<span className={pr}>.</span>
		<span className={fn}>string</span>
		<span className={pr}>(),</span>
		{"\n"}
		<span className={pr}>{"}"});</span>
		{"\n"}
		{"\n"}
		<span className={kw}>const</span> <span className={fn}>toolset</span>{" "}
		<span className={pr}>=</span> <span className={tp}>McpDefillama</span>
		<span className={pr}>();</span>
		{"\n"}
		<span className={kw}>const</span> <span className={fn}>tools</span>{" "}
		<span className={pr}>=</span> <span className={kw}>await</span>{" "}
		<span className={fn}>toolset</span>
		<span className={pr}>.</span>
		<span className={fn}>getTools</span>
		<span className={pr}>();</span>
		{"\n"}
		{"\n"}
		<span className={kw}>const</span> <span className={pr}>{"{ "}</span>
		<span className={fn}>runner</span>
		<span className={pr}>{" }"}</span> <span className={pr}>=</span>{" "}
		<span className={kw}>await</span> <span className={tp}>AgentBuilder</span>
		{"\n"}
		{"  "}
		<span className={pr}>.</span>
		<span className={fn}>create</span>
		<span className={pr}>(</span>
		<span className={str}>&quot;defi-analyst&quot;</span>
		<span className={pr}>)</span>
		{"\n"}
		{"  "}
		<span className={pr}>.</span>
		<span className={fn}>withModel</span>
		<span className={pr}>(</span>
		<span className={str}>&quot;gemini-2.5-flash&quot;</span>
		<span className={pr}>)</span>
		{"\n"}
		{"  "}
		<span className={pr}>.</span>
		<span className={fn}>withTools</span>
		<span className={pr}>(...</span>
		<span className={fn}>tools</span>
		<span className={pr}>)</span>
		{"\n"}
		{"  "}
		<span className={pr}>.</span>
		<span className={fn}>withOutputSchema</span>
		<span className={pr}>(</span>
		<span className={fn}>outputSchema</span>
		<span className={pr}>)</span>
		{"\n"}
		{"  "}
		<span className={pr}>.</span>
		<span className={fn}>build</span>
		<span className={pr}>();</span>
		{"\n"}
		{"\n"}
		<span className={kw}>const</span> <span className={fn}>data</span>{" "}
		<span className={pr}>=</span> <span className={kw}>await</span>{" "}
		<span className={fn}>runner</span>
		<span className={pr}>.</span>
		<span className={fn}>ask</span>
		<span className={pr}>(</span>
		<span className={str}>&quot;TVL for Uniswap?&quot;</span>
		<span className={pr}>);</span>
	</>
);

const TOTAL_STEPS = dxHighlights.length;
const STEP_INTERVAL = 800; // ms per icon

const BuiltForDevelopersSection = () => {
	const [activeCount, setActiveCount] = useState(0);
	const panelRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const stepRef = useRef(0);
	const hasPlayedRef = useRef(false);

	useEffect(() => {
		const el = panelRef.current;
		if (!el) return;

		const tick = () => {
			stepRef.current++;
			if (stepRef.current > TOTAL_STEPS) {
				if (timerRef.current) clearTimeout(timerRef.current);
				return;
			}
			setActiveCount(stepRef.current);
			timerRef.current = setTimeout(tick, STEP_INTERVAL);
		};

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !hasPlayedRef.current) {
					hasPlayedRef.current = true;
					stepRef.current = 0;
					setActiveCount(0);
					timerRef.current = setTimeout(tick, STEP_INTERVAL);
				}
			},
			{ threshold: 0.3 },
		);

		observer.observe(el);
		return () => {
			observer.disconnect();
			if (timerRef.current) clearTimeout(timerRef.current);
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
				{/* Code editor */}
				<div className="border border-white/20 rounded-lg bg-[#0000001f] flex flex-col overflow-hidden font-mono text-[11px] leading-[1.7]">
					{/* Title bar */}
					<div className="flex items-center gap-2 tracking-widest text-white/50 uppercase bg-[#000000] border-b border-[#FFFFFF0F] px-5  py-0.5 text-[11px]">
						<div className="flex gap-1.5">
							<span className="size-2.5 rounded-full bg-[#FF5F57]" />
							<span className="size-2.5 rounded-full bg-[#FEBC2E]" />
							<span className="size-2.5 rounded-full bg-[#28C840]" />
						</div>
						<div className="flex items-center gap-1.5 text-white/60 text-[11px] px-3 py-2.5 border-b-2 border-primary bg-[#0D0D12] lowercase">
							<Check className="size-3 text-green-400" />
							agent.ts
						</div>
					</div>
					{/* Code */}
					<div className="relative flex-1 overflow-x-auto">
						<div className="flex min-h-full">
							{/* Line numbers */}
							<div className="select-none text-right text-white/20 pr-4 pl-4 pt-4 shrink-0 leading-[1.7] border-r border-white/10">
								{Array.from({ length: 20 }, (_, i) => (
									<div key={`ln-${i + 1}`}>{i + 1}</div>
								))}
							</div>
							<pre className="text-white/80 pr-5 pl-4 py-4">
								<code>{codeLines}</code>
							</pre>
						</div>
						{/* IntelliSense popup */}
						<div className="absolute bottom-[30%] left-[38%] border border-neutral-700 rounded bg-black shadow-2xl text-[13px] font-mono overflow-hidden whitespace-nowrap w-full max-w-[296px]">
							<div className="px-2.5 py-1.5 border-b border-neutral-700 text-[#79C0FF] bg-[#171717] text-[10px]">
								AgentBuilder suggestions
							</div>
							<div className="p-3.5 space-y-1 text-[11px] font-mono text-[#E6EDF3]">
								<div className="flex items-center gap-2.5">
									<span className="size-2 rounded-full bg-[#4ADE80] shrink-0" />
									<span>create(name: string): AgentBuilder</span>
								</div>
								<div className="flex items-center gap-2.5">
									<span className="size-2 rounded-full bg-[#E5A04B] shrink-0" />
									<span>withModel(model: string | BaseLlm)</span>
								</div>
								<div className="flex items-center gap-2.5">
									<span className="size-2 rounded-full bg-[#A78BFA] shrink-0" />
									<span>{"withTools( ... tools: BaseTool[])"}</span>
								</div>
								<div className="text-[#8B949E] text-[10px]">
									+ 20 more methods ...
								</div>
							</div>
						</div>
					</div>
					{/* Status bar */}
					<div className="flex items-center justify-between gap-2 font-mono text-white/50 uppercase bg-[#000000] border-t border-[#FFFFFF0F] px-5 py-2.5 text-2.5">
						<div className="flex gap-3">
							<span>TypeScript</span> <span>UTF-8</span>
						</div>
						<div className="flex gap-3">
							<span>Ln 11, Col 1</span>{" "}
							<span className="text-primary">ADK-TS</span>
						</div>
					</div>
				</div>

				{/* DX Highlights panel */}
				<div
					ref={panelRef}
					className="border border-white/20 rounded-lg bg-[#0000001f] flex flex-col font-mono overflow-hidden"
				>
					<div className="flex items-center gap-2 tracking-widest text-white/50 uppercase bg-[#000000] border-b border-[#FFFFFF0F] px-5 py-3.5 text-[11px]">
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
					<div className="flex items-center gap-2 font-mono tracking-widest text-white/50 uppercase bg-[#000000] border-t border-[#FFFFFF0F] px-5 py-2.5 text-[11px] ">
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
			<div className="mt-3.5 bg-[#0000001f] px-5 py-3 font-mono text-xs text-white/80 flex items-center gap-3 border border-white/10 rounded-md shadow-[0px_4px_4px_0px_#00000040]">
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
