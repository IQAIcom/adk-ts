"use client";

import { useState, useRef, useEffect } from "react";
import { SectionWrapper } from "./section-wrapper";
import { FadeInView } from "./fade-in-view";
import { Play, RotateCw, Clock, Zap, Target } from "lucide-react";

interface DemoCardProps {
	title: string;
	subtitle: string;
	description: string;
	latency: string;
	tokens: string;
	accuracy?: string;
	agents: Array<{
		name: string;
		label: string;
	}>;
	inputLabel?: string;
	outputLabel?: string;
	hasInput?: boolean;
	hasOutput?: boolean;
	patternLabel?: string;
}

function DemoCard({
	title,
	subtitle,
	description,
	latency,
	tokens,
	accuracy,
	agents,
	inputLabel = "INPUT",
	hasInput = true,
	patternLabel,
}: DemoCardProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [activeAgent, setActiveAgent] = useState(-1);
	const [logs, setLogs] = useState<string[]>([]);
	const logContainerRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom smoothly when logs update
	// biome-ignore lint/correctness/useExhaustiveDependencies: logs triggers scroll on update
	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTo({
				top: logContainerRef.current.scrollHeight,
				behavior: "auto",
			});
		}
	}, [logs]);

	const generateDetailedLogs = (agent: { name: string; label: string }) => {
		const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
		return [
			`[${timestamp}] 🚀 Initializing ${agent.name} agent...`,
			`[${timestamp}] ⚙️  Loading model: gemini-2.5-flash`,
			`[${timestamp}] 📥 Processing input: ${agent.label}`,
			`[${timestamp}] 🔄 Executing task...`,
			`[${timestamp}] ✅ ${agent.name} completed successfully`,
			`[${timestamp}] 📊 Tokens used: ${Math.floor(Math.random() * 500 + 200)}`,
			`[${timestamp}] ⏱️  Execution time: ${Math.floor(Math.random() * 150 + 50)}ms`,
			"",
		];
	};

	const startSimulation = async () => {
		if (isPlaying) {
			setIsPlaying(false);
			setActiveAgent(-1);
			return;
		}

		setIsPlaying(true);
		setLogs([
			`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 🎬 Starting multi-agent pipeline...`,
			"",
		]);
		setActiveAgent(-1);

		// Execute agents one by one sequentially
		for (let i = 0; i < agents.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, 500));
			setActiveAgent(i);

			const agentLogs = generateDetailedLogs(agents[i]);
			for (const log of agentLogs) {
				await new Promise((resolve) => setTimeout(resolve, 150));
				setLogs((prev) => [...prev, log]);
			}

			setActiveAgent(-1);
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

		setLogs((prev) => [
			...prev,
			`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 🎉 Pipeline completed successfully`,
			`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 📈 Total execution time: ${latency}`,
			`[${new Date().toLocaleTimeString("en-US", { hour12: false })}] 🔢 Total tokens: ${tokens}`,
		]);
		setIsPlaying(false);
	};

	const resetSimulation = () => {
		setIsPlaying(false);
		setActiveAgent(-1);
		setLogs([]);
	};

	return (
		<div className="relative border border-white/20 bg-black/60 rounded-lg overflow-hidden">
			{/* Header Section */}
			<div className="p-6 space-y-4 lg:space-y-6">
				<div className="">
					<h3 className="text-xl lg:text-3xl text-white font-bold">{title}</h3>
					<p className="text-primary font-medium text-sm">{subtitle}</p>
				</div>

				<p className="text-muted-foreground font-medium text-sm lg:text-lg leading-relaxed max-w-3xl">
					{description}
				</p>

				{/* Metrics */}
				<div className="border-b border-white/20">
					<div className="flex justify-between lg:justify-center py-4 lg:gap-8  max-w-[318px] mr-auto">
						<div className="flex items-center gap-3">
							<Clock className="size-5 text-muted-foreground" />
							<div>
								<div className="text-muted-foreground text-xs text-medium mb-0.5">
									Latency:
								</div>
								<div className="text-primary text-lg font-medium">
									{latency}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Zap className="size-5 text-muted-foreground" />
							<div>
								<div className="text-muted-foreground text-xs text-medium mb-0.5">
									Tokens:
								</div>
								<div className="text-primary text-lg font-medium">{tokens}</div>
							</div>
						</div>
						{accuracy && (
							<div className="flex items-center gap-3">
								<Target className="size-5 text-muted-foreground" />
								<div>
									<div className="text-muted-foreground text-xs text-medium mb-0.5">
										Accuracy:
									</div>
									<div className="text-primary text-lg font-medium">
										{accuracy}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Body Section - Two Columns */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
				{/* LEFT - Node Graph Visualization */}
				<div className="relative bg-black/40 border border-white/20 overflow-hidden flex items-center justify-center rounded-md h-auto lg:h-[500px]">
					{patternLabel && (
						<div className="absolute top-4 left-4 px-2.5 py-1 text-[10px] font-medium text-primary/70 border border-primary/20 bg-primary/5 rounded">
							{patternLabel}
						</div>
					)}
					<svg
						aria-hidden="true"
						viewBox="0 0 800 500"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="w-full h-full"
						preserveAspectRatio="xMidYMid meet"
					>
						<defs>
							<filter id={`glow-${title.replace(/\s/g, "")}`}>
								<feGaussianBlur stdDeviation="3" result="coloredBlur" />
								<feMerge>
									<feMergeNode in="coloredBlur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>

						{/* Connection Lines - Behind everything */}
						<g opacity={isPlaying ? "1" : "0.4"}>
							{/* User to Supervisor */}
							{hasInput && (
								<path
									d="M 150,250 L 300,250"
									stroke={isPlaying ? "#FF1A88" : "#FFFFFF33"}
									strokeWidth="2"
									strokeDasharray="6 4"
									className={isPlaying ? "anim-dash-flow" : ""}
								/>
							)}

							{/* Supervisor to Branch Point */}
							<path
								d={hasInput ? "M 380,250 L 480,250" : "M 200,250 L 320,250"}
								stroke={isPlaying ? "#FF1A88" : "rgba(255,255,255,0.2)"}
								strokeWidth="2"
								strokeDasharray="6 4"
								className={isPlaying ? "anim-dash-flow" : ""}
								style={isPlaying ? { animationDelay: "0.2s" } : undefined}
							/>

							{/* Branch to Top Agent */}
							<path
								d={
									hasInput
										? "M 480,250 L 480,150 L 580,150"
										: "M 320,250 L 320,150 L 450,150"
								}
								stroke={isPlaying ? "#FF1A88" : "rgba(255,255,255,0.2)"}
								strokeWidth="2"
								strokeDasharray="6 4"
								className={isPlaying ? "anim-dash-flow" : ""}
								style={isPlaying ? { animationDelay: "0.4s" } : undefined}
							/>

							{/* Branch to Middle Agent */}
							<path
								d={hasInput ? "M 480,250 L 580,250" : "M 320,250 L 450,250"}
								stroke={isPlaying ? "#FF1A88" : "rgba(255,255,255,0.2)"}
								strokeWidth="2"
								strokeDasharray="6 4"
								className={isPlaying ? "anim-dash-flow" : ""}
								style={isPlaying ? { animationDelay: "0.6s" } : undefined}
							/>

							{/* Branch to Bottom Agent */}
							<path
								d={
									hasInput
										? "M 480,250 L 480,350 L 580,350"
										: "M 320,250 L 320,350 L 450,350"
								}
								stroke={isPlaying ? "#FF1A88" : "rgba(255,255,255,0.2)"}
								strokeWidth="2"
								strokeDasharray="6 4"
								className={isPlaying ? "anim-dash-flow" : ""}
								style={isPlaying ? { animationDelay: "0.8s" } : undefined}
							/>
						</g>

						{/* Data particles flowing — SMIL animations (GPU-composited) */}
						{isPlaying && (
							<>
								{/* Flow to Top Agent */}
								<circle
									r="4"
									fill="#FF1A88"
									filter={`url(#glow-${title.replace(/\s/g, "")})`}
								>
									<animate
										attributeName="cx"
										values={
											hasInput ? "150;300;380;480;480;580" : "200;320;320;450"
										}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
										calcMode="spline"
										keySplines={
											hasInput
												? "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
												: "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
										}
									/>
									<animate
										attributeName="cy"
										values={
											hasInput ? "250;250;250;250;150;150" : "250;250;150;150"
										}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
										calcMode="spline"
										keySplines={
											hasInput
												? "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
												: "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
										}
									/>
									<animate
										attributeName="opacity"
										values={hasInput ? "0;1;1;1;1;0" : "0;1;1;0"}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
									/>
								</circle>

								{/* Flow to Middle Agent */}
								<circle
									r="4"
									fill="#FF1A88"
									filter={`url(#glow-${title.replace(/\s/g, "")})`}
								>
									<animate
										attributeName="cx"
										values={hasInput ? "150;300;380;480;580" : "200;320;450"}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;1" : "0;0.4;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.3s"
										calcMode="spline"
										keySplines={
											hasInput
												? "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
												: "0.42 0 0.58 1;0.42 0 0.58 1"
										}
									/>
									<animate
										attributeName="cy"
										values={hasInput ? "250;250;250;250;250" : "250;250;250"}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;1" : "0;0.4;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.3s"
									/>
									<animate
										attributeName="opacity"
										values={hasInput ? "0;1;1;1;0" : "0;1;0"}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;1" : "0;0.4;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.3s"
									/>
								</circle>

								{/* Flow to Bottom Agent */}
								<circle
									r="4"
									fill="#FF1A88"
									filter={`url(#glow-${title.replace(/\s/g, "")})`}
								>
									<animate
										attributeName="cx"
										values={
											hasInput ? "150;300;380;480;480;580" : "200;320;320;450"
										}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.6s"
										calcMode="spline"
										keySplines={
											hasInput
												? "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
												: "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
										}
									/>
									<animate
										attributeName="cy"
										values={
											hasInput ? "250;250;250;250;350;350" : "250;250;350;350"
										}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.6s"
										calcMode="spline"
										keySplines={
											hasInput
												? "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
												: "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
										}
									/>
									<animate
										attributeName="opacity"
										values={hasInput ? "0;1;1;1;1;0" : "0;1;1;0"}
										keyTimes={hasInput ? "0;0.2;0.4;0.6;0.8;1" : "0;0.3;0.6;1"}
										dur="2.5s"
										repeatCount="indefinite"
										begin="0.6s"
									/>
								</circle>
							</>
						)}

						{/* User Node */}
						{hasInput && (
							<g className="anim-svg-enter-left">
								<rect
									x="60"
									y="220"
									width="90"
									height="60"
									fill="rgba(10,10,10,0.9)"
									stroke={
										activeAgent === -1 && isPlaying
											? "#FF1A88"
											: "rgba(255,255,255,0.25)"
									}
									strokeWidth="2"
									rx="4"
								/>
								<rect
									x="60"
									y="220"
									width="90"
									height="60"
									fill="none"
									stroke="#FF1A88"
									strokeWidth="2"
									rx="4"
									className={
										activeAgent === -1 && isPlaying ? "anim-pulse-glow" : ""
									}
									opacity={activeAgent === -1 && isPlaying ? undefined : 0}
								/>
								<text
									x="105"
									y="245"
									fill="white"
									fontSize="13"
									fontFamily="monospace"
									fontWeight="600"
									textAnchor="middle"
								>
									User
								</text>
								<text
									x="105"
									y="262"
									fill="rgba(255,255,255,0.5)"
									fontSize="10"
									fontFamily="monospace"
									textAnchor="middle"
								>
									{inputLabel}
								</text>
							</g>
						)}

						{/* Supervisor Node */}
						<g
							className="anim-svg-enter-scale"
							style={{ animationDelay: "0.1s" }}
						>
							<rect
								x={hasInput ? "210" : "80"}
								y="215"
								width="170"
								height="70"
								fill="rgba(10,10,10,0.9)"
								stroke={
									activeAgent >= 0 && activeAgent <= 2 && isPlaying
										? "#FF1A88"
										: "rgba(255,255,255,0.25)"
								}
								strokeWidth="2"
								rx="4"
							/>
							<rect
								x={hasInput ? "210" : "80"}
								y="215"
								width="170"
								height="70"
								fill="none"
								stroke="#FF1A88"
								strokeWidth="2"
								rx="4"
								className={
									activeAgent >= 0 && activeAgent <= 2 && isPlaying
										? "anim-pulse-glow"
										: ""
								}
								opacity={
									activeAgent >= 0 && activeAgent <= 2 && isPlaying
										? undefined
										: 0
								}
							/>
							<text
								x={hasInput ? "295" : "165"}
								y="235"
								fill="rgba(255,255,255,0.4)"
								fontSize="9"
								fontFamily="monospace"
								textAnchor="middle"
							>
								ORCHESTRATOR
							</text>
							<text
								x={hasInput ? "295" : "165"}
								y="252"
								fill="white"
								fontSize="14"
								fontFamily="monospace"
								fontWeight="600"
								textAnchor="middle"
							>
								Supervisor
							</text>
							<text
								x={hasInput ? "295" : "165"}
								y="270"
								fill="rgba(255,255,255,0.5)"
								fontSize="10"
								fontFamily="monospace"
								textAnchor="middle"
							>
								Route & Coordinate
							</text>
						</g>

						{/* Agent 1 - Top */}
						<g
							className="anim-svg-enter-right"
							style={{ animationDelay: "0.2s" }}
						>
							<rect
								x={hasInput ? "580" : "450"}
								y="120"
								width="160"
								height="60"
								fill="rgba(10,10,10,0.9)"
								stroke={
									activeAgent === 0 ? "#FF1A88" : "rgba(255,255,255,0.25)"
								}
								strokeWidth="2"
								rx="4"
							/>
							<rect
								x={hasInput ? "580" : "450"}
								y="120"
								width="160"
								height="60"
								fill="none"
								stroke="#FF1A88"
								strokeWidth="2"
								rx="4"
								className={activeAgent === 0 ? "anim-pulse-glow" : ""}
								opacity={activeAgent === 0 ? undefined : 0}
							/>

							{/* Icon for agent */}
							<g
								transform={
									hasInput ? "translate(588, 128)" : "translate(458, 128)"
								}
							>
								{title === "Autonomous Support" && (
									// Filter/Triage icon
									<>
										<path
											d="M 14,4 L 22,12 L 14,20 L 6,12 Z"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
										<path
											d="M 14,12 L 14,26"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
								{title === "Market Research" && (
									// Database/Scraper icon
									<>
										<ellipse
											cx="14"
											cy="8"
											rx="10"
											ry="5"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
										<path
											d="M 4,8 L 4,18 Q 4,23 14,23 Q 24,23 24,18 L 24,8"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
									</>
								)}
								{title === "Code Modernization" && (
									// Code/Refactor icon
									<>
										<path
											d="M 8,12 L 4,16 L 8,20"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M 20,12 L 24,16 L 20,20"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M 17,8 L 11,24"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
							</g>

							<text
								x={hasInput ? "628" : "498"}
								y="153"
								fill="white"
								fontSize="12"
								fontFamily="monospace"
								fontWeight="600"
								textAnchor="start"
							>
								{agents[0].name}
							</text>
							<text
								x={hasInput ? "628" : "498"}
								y="167"
								fill="rgba(255,255,255,0.5)"
								fontSize="9"
								fontFamily="monospace"
								textAnchor="start"
							>
								{agents[0].label}
							</text>
							{activeAgent === 0 && (
								<circle
									cx={hasInput ? "730" : "600"}
									cy="130"
									r="4"
									fill="#FF1A88"
									className="anim-dot-pulse"
								/>
							)}
						</g>

						{/* Agent 2 - Middle */}
						<g
							className="anim-svg-enter-right"
							style={{ animationDelay: "0.3s" }}
						>
							<rect
								x={hasInput ? "580" : "450"}
								y="220"
								width="160"
								height="60"
								fill="rgba(10,10,10,0.9)"
								stroke={
									activeAgent === 1 ? "#FF1A88" : "rgba(255,255,255,0.25)"
								}
								strokeWidth="2"
								rx="4"
							/>
							<rect
								x={hasInput ? "580" : "450"}
								y="220"
								width="160"
								height="60"
								fill="none"
								stroke="#FF1A88"
								strokeWidth="2"
								rx="4"
								className={activeAgent === 1 ? "anim-pulse-glow" : ""}
								opacity={activeAgent === 1 ? undefined : 0}
							/>

							{/* Icon for agent */}
							<g
								transform={
									hasInput ? "translate(588, 228)" : "translate(458, 228)"
								}
							>
								{title === "Autonomous Support" && (
									// Book/Knowledge icon
									<>
										<rect
											x="6"
											y="6"
											width="16"
											height="20"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											rx="1.5"
										/>
										<path
											d="M 10,12 L 18,12"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 10,17 L 18,17"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
								{title === "Market Research" && (
									// Chart/Analyst icon
									<>
										<path
											d="M 4,22 L 4,6 L 24,6 L 24,22 L 4,22"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
										<path
											d="M 9,19 L 9,14"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 14,19 L 14,10"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 19,19 L 19,12"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
								{title === "Code Modernization" && (
									// Check/Test icon
									<>
										<circle
											cx="14"
											cy="16"
											r="9"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
										<path
											d="M 9,16 L 12,19 L 19,12"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</>
								)}
							</g>

							<text
								x={hasInput ? "628" : "498"}
								y="253"
								fill="white"
								fontSize="12"
								fontFamily="monospace"
								fontWeight="600"
								textAnchor="start"
							>
								{agents[1].name}
							</text>
							<text
								x={hasInput ? "628" : "498"}
								y="267"
								fill="rgba(255,255,255,0.5)"
								fontSize="9"
								fontFamily="monospace"
								textAnchor="start"
							>
								{agents[1].label}
							</text>
							{activeAgent === 1 && (
								<circle
									cx={hasInput ? "730" : "600"}
									cy="230"
									r="4"
									fill="#FF1A88"
									className="anim-dot-pulse"
								/>
							)}
						</g>

						{/* Agent 3 - Bottom */}
						<g
							className="anim-svg-enter-right"
							style={{ animationDelay: "0.4s" }}
						>
							<rect
								x={hasInput ? "580" : "450"}
								y="320"
								width="160"
								height="60"
								fill="rgba(10,10,10,0.9)"
								stroke={
									activeAgent === 2 ? "#FF1A88" : "rgba(255,255,255,0.25)"
								}
								strokeWidth="2"
								rx="4"
							/>
							<rect
								x={hasInput ? "580" : "450"}
								y="320"
								width="160"
								height="60"
								fill="none"
								stroke="#FF1A88"
								strokeWidth="2"
								rx="4"
								className={activeAgent === 2 ? "anim-pulse-glow" : ""}
								opacity={activeAgent === 2 ? undefined : 0}
							/>

							{/* Icon for agent */}
							<g
								transform={
									hasInput ? "translate(588, 328)" : "translate(458, 328)"
								}
							>
								{title === "Autonomous Support" && (
									// Message/Responder icon
									<>
										<path
											d="M 4,6 L 24,6 L 24,20 L 18,20 L 14,25 L 14,20 L 4,20 Z"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinejoin="round"
										/>
										<path
											d="M 9,12 L 19,12"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 9,16 L 15,16"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
								{title === "Market Research" && (
									// Document/Summarizer icon
									<>
										<path
											d="M 8,4 L 20,4 L 20,24 L 8,24 Z"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
										/>
										<path
											d="M 11,9 L 17,9"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 11,14 L 17,14"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 11,19 L 15,19"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
								{title === "Code Modernization" && (
									// File/Documentation icon
									<>
										<path
											d="M 8,4 L 17,4 L 20,7 L 20,24 L 8,24 Z"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinejoin="round"
										/>
										<path
											d="M 17,4 L 17,7 L 20,7"
											fill="none"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinejoin="round"
										/>
										<path
											d="M 11,12 L 17,12"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
										<path
											d="M 11,17 L 17,17"
											stroke="rgba(255,255,255,0.6)"
											strokeWidth="2"
											strokeLinecap="round"
										/>
									</>
								)}
							</g>

							<text
								x={hasInput ? "628" : "498"}
								y="353"
								fill="white"
								fontSize="12"
								fontFamily="monospace"
								fontWeight="600"
								textAnchor="start"
							>
								{agents[2].name}
							</text>
							<text
								x={hasInput ? "628" : "498"}
								y="367"
								fill="rgba(255,255,255,0.5)"
								fontSize="9"
								fontFamily="monospace"
								textAnchor="start"
							>
								{agents[2].label}
							</text>
							{activeAgent === 2 && (
								<circle
									cx={hasInput ? "730" : "600"}
									cy="330"
									r="4"
									fill="#FF1A88"
									className="anim-dot-pulse"
								/>
							)}
						</g>
					</svg>
				</div>

				{/* RIGHT - Terminal Window */}
				<div className="relative border border-white/20 bg-black/60 flex flex-col rounded-md overflow-hidden lg:h-[500px]">
					{/* Window Header - macOS Style */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0a]">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
							<div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
							<div className="w-3 h-3 rounded-full bg-[#28C840]" />
						</div>
						<div className="text-white text-xs">agent-output.log</div>
						{/* Control Buttons - Relocated here */}
						<div className="flex gap-2">
							<button
								type="button"
								onClick={startSimulation}
								disabled={isPlaying}
								aria-label={isPlaying ? "Simulation running" : "Run simulation"}
								className="p-2 bg-[#1a1a1a] border border-white/20 hover:border-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded"
							>
								<Play
									className="w-3.5 h-3.5 text-white/70"
									fill="currentColor"
									aria-hidden="true"
								/>
							</button>
							<button
								type="button"
								onClick={resetSimulation}
								disabled={logs.length === 0}
								aria-label="Reset simulation"
								className="p-2 bg-[#1a1a1a] border border-white/20 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 rounded"
							>
								<RotateCw
									className="w-3.5 h-3.5 text-white/70"
									aria-hidden="true"
								/>
							</button>
						</div>
					</div>

					{/* Window Content */}
					<div className="flex flex-col flex-1 min-h-0">
						<div
							ref={logContainerRef}
							className="flex-1 min-h-0 bg-black rounded border border-white/10 m-6 p-4 overflow-y-auto text-xs"
							role="log"
							aria-label="Simulation output"
							aria-live="polite"
						>
							{logs.length === 0 ? (
								<div className="text-white text-center py-20 translate-y-1/2">
									Press Play to start simulation
								</div>
							) : (
								logs.map((log, index) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: logs are append-only and never reorder
										key={`log-${index}`}
										className="text-green-400/80 mb-0.5 anim-log-slide-in"
									>
										{log}
									</div>
								))
							)}
							{isPlaying && (
								<div className="text-white/50 anim-cursor-blink">▊</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const InteractiveSimulationsSection = () => {
	return (
		<SectionWrapper
			id="interactive-simulations"
			className="grid md:gap-y-4 lg:gap-y-12"
		>
			{/* Section Header */}
			<div className="landing-section-header">
				<span className="landing-badge">Interactive Simulations</span>
				<h2>See Multi-Agent Execution in Action</h2>
				<p>
					Interactive simulations of real multi-agent execution flows. See how
					agents coordinate, call tools, and generate structured outputs step by
					step.
				</p>
			</div>

			{/* Demo Cards */}
			<div className="grid gap-8 lg:gap-16">
				<FadeInView y={30} duration={0.8} delay={0.1}>
					<DemoCard
						title="Autonomous Support"
						subtitle="Customer Support Pipeline"
						description="A multi-agent customer support system that classifies incoming tickets, retrieves knowledge, and generates structured responses in real time."
						patternLabel="Sequential with Context Sharing"
						latency="84ms"
						tokens="1.2k"
						accuracy="94.2%"
						inputLabel="INPUT"
						agents={[
							{ name: "Triage", label: "Classify & Route" },
							{ name: "Knowledge-Base", label: "Document Search" },
							{ name: "Responder", label: "Generate Reply" },
						]}
					/>
				</FadeInView>

				<FadeInView y={30} duration={0.8} delay={0.2}>
					<DemoCard
						title="Market Research"
						subtitle="Parallel Intelligence Gathering"
						description="Parallel agents collect data, identify patterns, and synthesize structured reports for research and competitive intelligence."
						patternLabel="Pattern: Parallel + Aggregation"
						latency="142ms"
						tokens="3.8k"
						accuracy="94.2%"
						inputLabel="Data Sources"
						outputLabel="OUTPUT"
						hasOutput={true}
						agents={[
							{ name: "Scraper", label: "Data Collection" },
							{ name: "Analyst", label: "Pattern Detection" },
							{ name: "Summarizer", label: "Report Generation" },
						]}
					/>
				</FadeInView>

				<FadeInView y={30} duration={0.8} delay={0.3}>
					<DemoCard
						title="Code Modernization"
						subtitle="Sequential Transformation Pipeline"
						description="A sequential agent pipeline that refactors legacy code, validates changes, runs tests, and generates documentation artifacts."
						patternLabel="Pattern: Sequential with Validation Gates"
						latency="267ms"
						tokens="5.1k"
						accuracy="91.8%"
						hasInput={false}
						agents={[
							{ name: "Refactorer", label: "Code Transform" },
							{ name: "Tester", label: "QA & Validation" },
							{ name: "Documenter", label: "Auto-docs" },
						]}
					/>
				</FadeInView>
			</div>
		</SectionWrapper>
	);
};
export default InteractiveSimulationsSection;
