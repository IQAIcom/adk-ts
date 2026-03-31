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
const kw = "text-[#C678DD]"; // keywords
const fn = "text-[#61AFEF]"; // functions
const str = "text-[#98C379]"; // strings
const tp = "text-[#E5C07B]"; // types
const pr = "text-[#ABB2BF]"; // punctuation

// Each entry is one visible line; "showPopup" marks where IntelliSense appears
// "partial" is shown first before popup, replaced by full "jsx" after selection
const codeLinesData: {
	jsx: React.ReactNode;
	partial?: React.ReactNode;
	showPopup?: boolean;
}[] = [
	{
		jsx: (
			<>
				<span className={kw}>import</span> <span className={pr}>{"{ "}</span>
				<span className={tp}>AgentBuilder</span>
				<span className={pr}>{" }"}</span> <span className={kw}>from</span>{" "}
				<span className={str}>&quot;@iqai/adk&quot;</span>
				<span className={pr}>;</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={kw}>import</span> <span className={pr}>{"{ "}</span>
				<span className={tp}>McpDefillama</span>
				<span className={pr}>{" }"}</span> <span className={kw}>from</span>{" "}
				<span className={str}>&quot;@iqai/adk&quot;</span>
				<span className={pr}>;</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={kw}>import</span> <span className={fn}>z</span>{" "}
				<span className={kw}>from</span>{" "}
				<span className={str}>&quot;zod/v4&quot;</span>
				<span className={pr}>;</span>
			</>
		),
	},
	{ jsx: <>&nbsp;</> },
	{
		jsx: (
			<>
				<span className={kw}>const</span>{" "}
				<span className={fn}>outputSchema</span> <span className={pr}>=</span>{" "}
				<span className={fn}>z</span>
				<span className={pr}>.object({"{"}</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}tvl:</span> <span className={fn}>z</span>
				<span className={pr}>.number(),</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}protocol:</span>{" "}
				<span className={fn}>z</span>
				<span className={pr}>.string(),</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"}"});</span>
			</>
		),
	},
	{ jsx: <>&nbsp;</> },
	{
		jsx: (
			<>
				<span className={kw}>const</span> <span className={fn}>toolset</span>{" "}
				<span className={pr}>=</span> <span className={tp}>McpDefillama</span>
				<span className={pr}>();</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={kw}>const</span> <span className={fn}>tools</span>{" "}
				<span className={pr}>=</span> <span className={kw}>await</span>{" "}
				<span className={fn}>toolset</span>
				<span className={pr}>.getTools();</span>
			</>
		),
	},
	{ jsx: <>&nbsp;</> },
	{
		jsx: (
			<>
				<span className={kw}>const</span> <span className={pr}>{"{ "}</span>
				<span className={fn}>runner</span>
				<span className={pr}>{" }"}</span> <span className={pr}>=</span>{" "}
				<span className={kw}>await</span>{" "}
				<span className={tp}>AgentBuilder</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}.create(</span>
				<span className={str}>&quot;defi-analyst&quot;</span>
				<span className={pr}>)</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}.</span>
				<span className={fn}>withModel</span>
				<span className={pr}>(</span>
				<span className={str}>&quot;gemini-2.5-flash&quot;</span>
				<span className={pr}>)</span>
			</>
		),
	},
	{
		partial: (
			<>
				<span className={pr}>{"  "}.with</span>
				<span className="animate-pulse text-white/40">|</span>
			</>
		),
		jsx: (
			<>
				<span className={pr}>{"  "}.</span>
				<span className={fn}>withTools</span>
				<span className={pr}>(...</span>
				<span className={fn}>tools</span>
				<span className={pr}>)</span>
			</>
		),
		showPopup: true,
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}.</span>
				<span className={fn}>withOutputSchema</span>
				<span className={pr}>(</span>
				<span className={fn}>outputSchema</span>
				<span className={pr}>)</span>
			</>
		),
	},
	{
		jsx: (
			<>
				<span className={pr}>{"  "}.build();</span>
			</>
		),
	},
	{ jsx: <>&nbsp;</> },
	{
		jsx: (
			<>
				<span className={kw}>const</span> <span className={fn}>data</span>{" "}
				<span className={pr}>=</span> <span className={kw}>await</span>{" "}
				<span className={fn}>runner</span>
				<span className={pr}>.ask(</span>
				<span className={str}>&quot;TVL for Uniswap?&quot;</span>
				<span className={pr}>);</span>
			</>
		),
	},
];

const POPUP_LINE = codeLinesData.findIndex((l) => l.showPopup);
const CODE_LINE_INTERVAL = 200; // ms between each line appearing
const TOTAL_CODE_LINES = codeLinesData.length;

const TOTAL_STEPS = dxHighlights.length;
const STEP_INTERVAL = 800; // ms per icon

const BuiltForDevelopersSection = () => {
	const [activeCount, setActiveCount] = useState(0);
	const [visibleLines, setVisibleLines] = useState(0);
	const [showPopup, setShowPopup] = useState(false);
	const [highlightedOption, setHighlightedOption] = useState(-1);
	const [popupSelected, setPopupSelected] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const codeRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const codeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const stepRef = useRef(0);
	const hasPlayedRef = useRef(false);
	const codeHasPlayedRef = useRef(false);

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

	// Code line-by-line animation
	useEffect(() => {
		const el = codeRef.current;
		if (!el) return;

		let lineStep = 0;

		const typeLine = () => {
			lineStep++;
			if (lineStep > TOTAL_CODE_LINES) {
				// Hold finished state, then reset and loop
				codeTimerRef.current = setTimeout(() => {
					lineStep = 0;
					setVisibleLines(0);
					setShowPopup(false);
					setHighlightedOption(-1);
					setPopupSelected(false);
					codeTimerRef.current = setTimeout(typeLine, CODE_LINE_INTERVAL);
				}, 2000);
				return;
			}
			setVisibleLines(lineStep);
			// When we reach the .withModel line: show partial ".with|", then popup
			if (lineStep === POPUP_LINE + 1) {
				setPopupSelected(false);
				// Brief pause to show the partial ".with|" typing
				codeTimerRef.current = setTimeout(() => {
					setShowPopup(true);
					setHighlightedOption(-1);
					// Highlight options one by one, then select withTools
					codeTimerRef.current = setTimeout(() => {
						setHighlightedOption(0); // highlight withDescription
						codeTimerRef.current = setTimeout(() => {
							setHighlightedOption(1); // highlight withModel
							codeTimerRef.current = setTimeout(() => {
								setHighlightedOption(2); // highlight withTools — select this one
								codeTimerRef.current = setTimeout(() => {
									// "Select" withTools — close popup, show full line, resume
									setShowPopup(false);
									setHighlightedOption(-1);
									setPopupSelected(true);
									codeTimerRef.current = setTimeout(
										typeLine,
										CODE_LINE_INTERVAL,
									);
								}, 800);
							}, 600);
						}, 600);
					}, 500);
				}, 400);
				return;
			}
			codeTimerRef.current = setTimeout(typeLine, CODE_LINE_INTERVAL);
		};

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !codeHasPlayedRef.current) {
					codeHasPlayedRef.current = true;
					lineStep = 0;
					setVisibleLines(0);
					setShowPopup(false);
					codeTimerRef.current = setTimeout(typeLine, CODE_LINE_INTERVAL);
				}
			},
			{ threshold: 0.3 },
		);

		observer.observe(el);
		return () => {
			observer.disconnect();
			if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
		};
	}, []);

	const progress = Math.round((activeCount / TOTAL_STEPS) * 100);

	return (
		<SectionWrapper id="built-for-developers">
			{/* Section header */}
			<div className="landing-section-header">
				<span className="landing-badge">Developer Experience</span>
				<h2>Built for Developers</h2>
				<p>TypeScript-first . Full IntelliSense . Zero Configuration</p>
			</div>

			{/* Code snippet + DX highlights */}
			<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-y-3.5 lg:gap-x-8">
				{/* Code editor */}
				<div
					ref={codeRef}
					className="border border-white/20 rounded-lg flex flex-col overflow-hidden font-mono text-[11px] leading-[1.7] bg-black/50"
				>
					{/* Title bar */}
					<div className="flex items-center gap-2 tracking-widest text-white/50 uppercase bg-black/40 border-b border-[#FFFFFF0F] px-5 py-0.5 text-[11px]">
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
								{Array.from({ length: TOTAL_CODE_LINES }, (_, i) => (
									<div
										key={`ln-${i + 1}`}
										className={i < visibleLines ? "opacity-100" : "opacity-0"}
										style={{ transition: "opacity 0.15s" }}
									>
										{i + 1}
									</div>
								))}
							</div>
							<pre className="text-white/80 pr-5 pl-4 py-4">
								<code>
									{codeLinesData.map((line, i) => (
										<div
											key={`cl-${i + 1}`}
											className={i < visibleLines ? "opacity-100" : "opacity-0"}
											style={{ transition: "opacity 0.15s" }}
										>
											{line.partial && !popupSelected && i === POPUP_LINE
												? line.partial
												: line.jsx}
										</div>
									))}
								</code>
							</pre>
						</div>
						{/* IntelliSense popup */}
						{showPopup && (
							<div className="absolute bottom-[30%] left-[38%] border border-neutral-700 rounded-md bg-black shadow-2xl text-[13px] font-mono overflow-hidden whitespace-nowrap w-full max-w-[296px]">
								<div className="py-1 text-[11px] font-mono text-[#E6EDF3]">
									{[
										{ dot: "bg-[#4ADE80]", text: "withDescription" },
										{ dot: "bg-[#E5A04B]", text: "withModel" },
										{ dot: "bg-[#A78BFA]", text: "withTools" },
									].map((opt, i) => (
										<div
											key={opt.text}
											className={`flex items-center gap-2.5 px-3.5 py-1 transition-colors duration-150 ${highlightedOption === i ? "bg-[#1a1a2e] text-white" : ""}`}
										>
											<span
												className={`size-2 rounded-full ${opt.dot} shrink-0`}
											/>
											<span>{opt.text}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
					{/* Status bar */}
					<div className="flex items-center justify-between gap-2 font-mono text-white/50 uppercase bg-black/40 border-t border-[#FFFFFF0F] px-5 py-2 text-[11px]">
						<div className="flex gap-3">
							<span>TypeScript</span> <span>UTF-8</span>
						</div>
						<div className="flex gap-3">
							<span>Ln {Math.min(visibleLines, TOTAL_CODE_LINES)}, Col 1</span>{" "}
							<span className="text-primary">ADK-TS</span>
						</div>
					</div>
				</div>

				{/* DX Highlights panel */}
				<div
					ref={panelRef}
					className="border border-white/20 rounded-lg bg-black/40 flex flex-col font-mono overflow-hidden"
				>
					<div className="flex items-center gap-2 tracking-widest text-white/50 uppercase bg-black/40 border-b border-[#FFFFFF0F] px-5 py-3.5 text-[11px]">
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
					<div className="flex items-center gap-2 font-mono tracking-widest text-white/50 uppercase bg-black/40 border-t border-[#FFFFFF0F] px-5 py-2.5 text-[11px] ">
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
			<div className="mt-3.5 bg-black/50 px-5 py-3 font-mono text-xs text-white/80 flex items-center gap-3 border border-white/10 rounded-md shadow-[0px_4px_4px_0px_#00000040]">
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
