import dedent from "dedent";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import Link from "next/link";

export function Hero() {
	return (
		<section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-2 py-8 sm:px-4 sm:py-12">
			{/* Enhanced Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/20">
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5" />

				{/* Enhanced floating orbs */}
				<div className="absolute top-8 left-8 h-24 w-24 animate-pulse rounded-full bg-primary/20 opacity-30 blur-2xl sm:h-32 sm:w-32" />
				<div className="animation-delay-2000 absolute right-8 bottom-8 h-32 w-32 animate-pulse rounded-full bg-chart-1/20 opacity-30 blur-2xl sm:h-40 sm:w-40" />
				<div className="animation-delay-4000 absolute top-1/2 left-1/4 h-16 w-16 animate-ping rounded-full bg-chart-2/15 opacity-20 blur-xl" />

				{/* Subtle grid pattern */}
				<div className="absolute inset-0 bg-grid-pattern opacity-5" />

				{/* Moving gradient overlay */}
				<div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
			</div>

			{/* Main content - centered */}
			<div className="relative z-10 mx-auto w-full max-w-4xl text-center">
				{/* Header section with animations */}
				<div className="mb-8 animate-fade-in-up">
					<div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-medium text-primary text-sm transition-all duration-300 hover:scale-105 hover:bg-primary/15">
						<svg
							className="mr-2 h-3.5 w-3.5 animate-pulse"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M13 10V3L4 14h7v7l9-11h-7z"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
						ADK-TS: Build AI Agents in TypeScript
					</div>

					<h1 className="animation-delay-200 mb-4 animate-fade-in-up font-bold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
						<span className="text-foreground">Build Sophisticated</span>
						<br />
						<span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text font-medium text-2xl text-transparent sm:text-3xl md:text-4xl lg:text-5xl">
							Multi-Agent AI Systems
						</span>
					</h1>

					<p className="animation-delay-400 mx-auto mb-8 max-w-2xl animate-fade-in-up text-base text-muted-foreground sm:text-lg">
						Enterprise-grade framework for hierarchical agents, tool
						integration, memory management, and real-time streaming
					</p>

					{/* Action buttons with enhanced styling */}
					<div className="animation-delay-600 mb-12 flex animate-fade-in-up flex-row justify-center gap-3">
						<Link
							className="group inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm shadow-lg transition-all hover:scale-105 hover:bg-primary/90 hover:shadow-primary/25 sm:px-6"
							href="/docs"
						>
							Get Started
							<svg
								className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M13 7l5 5m0 0l-5 5m5-5H6"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</Link>

						<Link
							className="group inline-flex items-center justify-center rounded-lg border border-border bg-background/80 px-4 py-2.5 font-medium text-foreground text-sm backdrop-blur-sm transition-all hover:scale-105 hover:bg-accent hover:text-accent-foreground hover:shadow-lg sm:px-6"
							href="/docs/get-started/quickstart"
						>
							Quick Start
							<svg
								className="ml-2 h-4 w-4 opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 5l7 7-7 7"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</Link>
					</div>
				</div>

				{/* Code preview - centered container with left-aligned code */}
				<div className="animation-delay-800 relative mx-auto mb-12 w-full max-w-2xl animate-fade-in-up">
					<div className="-inset-1 absolute animate-pulse rounded-lg bg-gradient-to-r from-primary/20 to-chart-1/20 opacity-25 blur" />
					<div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
						<div className="flex items-center justify-between border-border border-b bg-muted/30 px-3 py-2 sm:px-4">
							<div className="flex items-center space-x-2">
								<div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
								<div className="animation-delay-300 h-3 w-3 animate-pulse rounded-full bg-yellow-500" />
								<div className="animation-delay-600 h-3 w-3 animate-pulse rounded-full bg-green-500" />
							</div>
							<span className="font-mono text-muted-foreground text-xs">
								multi-agent-system.ts
							</span>
						</div>
						<div className="overflow-x-auto p-3 text-left sm:p-4">
							<div className="min-w-0">
								<DynamicCodeBlock
									code={dedent`
                    const workflow = await AgentBuilder
                      .asSequential([researchAgent, analysisAgent])
                      .withTools([GoogleSearch, DataProcessor])
                      .withMemory(vectorMemoryService)
                      .build();

                    const result = await workflow.ask(
                      "Analyze market trends in AI"
                    );
                  `}
									lang="typescript"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Enhanced feature highlights at the end */}
				<div className="animation-delay-1000 mx-auto grid max-w-3xl animate-fade-in-up grid-cols-2 gap-4 lg:grid-cols-4">
					<div className="flex items-center justify-center space-x-2 text-sm transition-transform duration-300 hover:scale-105">
						<div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-primary" />
						<span className="text-muted-foreground">Multi-Agent</span>
					</div>
					<div className="flex items-center justify-center space-x-2 text-sm transition-transform duration-300 hover:scale-105">
						<div className="animation-delay-200 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-chart-1" />
						<span className="text-muted-foreground">Tool Integration</span>
					</div>
					<div className="flex items-center justify-center space-x-2 text-sm transition-transform duration-300 hover:scale-105">
						<div className="animation-delay-400 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-chart-2" />
						<span className="text-muted-foreground">Memory Services</span>
					</div>
					<div className="flex items-center justify-center space-x-2 text-sm transition-transform duration-300 hover:scale-105">
						<div className="animation-delay-600 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-chart-3" />
						<span className="text-muted-foreground">Real-time Streaming</span>
					</div>
				</div>
			</div>

			{/* Enhanced CSS animations */}
			<style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0);
          background-size: 24px 24px;
        }

        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-600 { animation-delay: 0.6s; }
        .animation-delay-800 { animation-delay: 0.8s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
		</section>
	);
}
