"use client";

import { FadeInView } from "./fade-in-view";
import { Zap, Flame, FileStack, Rocket } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

const DeveloperPlatformSection = () => {
	return (
		<SectionWrapper
			id="complete-stack"
			className="bg-white text-[#1A1A1A]! border border-[#D1D5DB]!"
		>
			{/* Section Header */}
			<div className="landing-section-header mb-8 md:mb-12.5 lg:mb-22.5!">
				<span className="relative w-max inline-flex items-center rounded-md bg-[#F3F4F6] backdrop-blur-sm px-3 py-2 text-[10px] lg:text-sm font-medium border text-[#1A1A1A]! border-[#D1D5DB]!">
					Developer Platform
				</span>
				<h2 className="text-[#0F172A]!">The Complete ADK-TS Stack</h2>
				<p className="text-[#475569]!">
					Not just a framework, but a complete development experience. Every
					layer you need, from project scaffolding to production observability.
				</p>
			</div>

			{/* 2x2 Grid of Capabilities */}
			<div className="-mx-2 md:-mx-6 lg:-mx-16 px-2 md:px-6 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-0 border-y border-[#D1D5DB]">
				{/* CLI Card */}
				<FadeInView
					y={40}
					duration={0.8}
					delay={0}
					className="relative py-12 lg:py-12 lg:pr-12 border-b lg:border-r border-[#D1D5DB] "
				>
					<h3 className="text-xl mb-1.5 font-semibold leading-tight text-[#0F172A]">
						ADK-TS CLI
					</h3>

					<p className="text-base text-[#475569] leading-relaxed mb-8">
						The official CLI for ADK-TS. Scaffold projects from templates, run
						agents with hot-reload, and launch a web UI for testing — all in one
						tool.
					</p>

					{/* Stats grid */}
					<div className="grid grid-cols-2 gap-x-5 gap-y-6 mb-12">
						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/50 rounded-lg" />
									<Zap className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div className="space-y-2">
									<div className="font-geist-sans text-[#0F172A] text-xl lg:text-2xl font-semibold">
										{"<"}3s
									</div>
									<div className="text-xs md:text-sm font-medium text-[#475569]">
										Project ready
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/50 rounded-lg" />
									<FileStack className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div className="space-y-2">
									<div className="text-[#0F172A] text-xl lg:text-2xl font-semibold">
										7+
									</div>
									<div className="text-xs md:text-sm font-medium text-[#475569]">
										Starter templates
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/50 rounded-lg" />
									<Flame className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div className="space-y-2">
									<div className="text-[#0F172A] text-xl lg:text-2xl font-semibold">
										HMR
									</div>
									<div className="text-xs md:text-sm font-medium text-[#475569]">
										Hot reload
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/50 rounded-lg" />
									<Rocket className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div className="space-y-2">
									<div className="text-[#0F172A] text-xl lg:text-2xl font-semibold">
										Web
									</div>
									<div className="text-xs md:text-sm font-medium text-[#475569]">
										Browser UI
									</div>
								</div>
							</div>
						</div>
					</div>

					<h4 className="text-xs text-[#475569] mb-3.5">COMMANDS</h4>

					<ul className="space-y-2" aria-label="CLI commands">
						<li className="px-4 py-3.5 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-sm text-[#475569]">
							<span className="text-primary" aria-hidden="true">
								$
							</span>{" "}
							<code className="text-[13px] md:text-sm">adk new my-agent</code>
							<span className="text-[11px] md:text-sm ml-3 block md:inline-block">
								# Scaffold a project from 7+ starter templates
							</span>
						</li>
						<li className="px-4 py-3.5 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-sm text-[#475569]">
							<span className="text-primary" aria-hidden="true">
								$
							</span>{" "}
							<code className="text-[13px] md:text-sm">adk run</code>
							<span className="text-[11px] md:text-sm ml-3 block md:inline-block">
								# Interactive terminal chat with your agent
							</span>
						</li>
						<li className="px-4 py-3.5 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-sm text-[#475569]">
							<span className="text-primary" aria-hidden="true">
								$
							</span>{" "}
							<code className="text-[13px] md:text-sm">adk web</code>
							<span className="text-[11px] md:text-sm ml-3 block md:inline-block">
								# Launch browser UI to test and inspect agents
							</span>
						</li>
						<li className="px-4 py-3.5 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-sm text-[#475569]">
							<span className="text-primary" aria-hidden="true">
								$
							</span>{" "}
							<code className="text-[13px] md:text-sm">adk serve</code>
							<span className="text-[11px] md:text-sm ml-3 block md:inline-block">
								# Start an API server for agent management
							</span>
						</li>
					</ul>
				</FadeInView>

				{/* Sessions & Memory Card */}
				<FadeInView
					y={40}
					duration={0.8}
					delay={0.1}
					className="relative py-12 lg:py-12 lg:pl-12 border-b border-[#D1D5DB] "
				>
					<h3 className="text-xl mb-1.5 font-semibold leading-tight text-[#0F172A]">
						Sessions & Memory
					</h3>

					<p className="text-base text-[#475569] leading-relaxed mb-8">
						Persistent session state across every conversation. Multiple storage
						backends with a unified interface and automatic conversation
						threading.
					</p>

					{/* Stack visualization */}
					<div className="space-y-4 mb-8">
						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-[#F9F9F9] border border-[#E5E5E5] rounded flex items-center justify-center">
									<span className="text-xs md:text-sm text-[#475569]">
										In-Memory
									</span>
								</div>
								<div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
							</div>
							<div className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
								Zero-config local development, no persistence needed.
							</div>
						</div>

						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-[#F9F9F9] border border-[#E5E5E5] rounded flex items-center justify-center">
									<span className="text-xs md:text-sm text-[#475569]">
										PostgreSQL/SQLite
									</span>
								</div>
							</div>
							<div className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
								Persistent sessions with Drizzle ORM and full-text search.
							</div>
						</div>

						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-[#F9F9F9] border border-[#E5E5E5] rounded flex items-center justify-center">
									<span className="text-xs md:text-sm text-[#475569]">
										Vertex AI
									</span>
								</div>
							</div>
							<div className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
								Google Cloud-native session storage for production scale.
							</div>
						</div>
					</div>

					<h4 className="text-xs text-[#94A3B8] mb-4">KEY FEATURES</h4>

					<ul className="space-y-2" aria-label="Key features">
						<li className="flex items-center gap-3 text-sm text-[#475569]">
							<span
								className="w-1.5 h-1.5 bg-primary shrink-0"
								aria-hidden="true"
							/>
							Automatic conversation threading
						</li>
						<li className="flex items-center gap-3 text-sm text-[#475569]">
							<span
								className="w-1.5 h-1.5 bg-[#D1D5DB] shrink-0"
								aria-hidden="true"
							/>
							Context window management
						</li>
						<li className="flex items-center gap-3 text-sm text-[#475569]">
							<span
								className="w-1.5 h-1.5 bg-[#D1D5DB] shrink-0"
								aria-hidden="true"
							/>
							Cross-agent memory sharing
						</li>
						<li className="flex items-center gap-3 text-sm text-[#475569]">
							<span
								className="w-1.5 h-1.5 bg-[#D1D5DB] shrink-0"
								aria-hidden="true"
							/>
							Vertex AI RAG memory integration
						</li>
						<li className="flex items-center gap-3 text-sm text-[#475569]">
							<span
								className="w-1.5 h-1.5 bg-[#D1D5DB] shrink-0"
								aria-hidden="true"
							/>
							Unified Memory API (combine multiple sources)
						</li>
					</ul>
				</FadeInView>

				{/* Workflows & Extensibility Card */}
				<FadeInView
					y={40}
					duration={0.8}
					delay={0.2}
					className="relative py-12  lg:py-12 lg:pr-12 lg:border-r border-[#D1D5DB] "
					style={{ userSelect: "text" }}
				>
					<h3 className="text-xl mb-1.5 font-semibold leading-tight text-[#0F172A]">
						Workflows & Extensibility
					</h3>

					<p className="text-base text-[#475569] leading-relaxed mb-8">
						Orchestrate complex agents with a built-in workflow engine and
						plugin system. Intercept events, manage long-running tasks, and
						extend agent behavior with ease.
					</p>

					{/* Lifecycle flow */}
					<div className="mb-8">
						<h4 className="text-xs text-[#94A3B8] mb-4">LIFECYCLE HOOKS</h4>

						<ul className="space-y-3" aria-label="Lifecycle hooks">
							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-primary shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									beforeModelCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Inspect and transform prompts before model execution
								</span>
							</li>

							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-[#D1D5DB] shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									beforeToolCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Observe or override tool execution
								</span>
							</li>

							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-[#D1D5DB] shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									afterModelCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Post-process and validate model responses
								</span>
							</li>

							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-[#D1D5DB] shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									afterToolCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Capture and transform tool results
								</span>
							</li>

							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-[#D1D5DB] shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									beforeAgentCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Intercept agent execution before any step
								</span>
							</li>

							<li className="flex items-center gap-3">
								<span
									className="w-2 h-2 bg-[#D1D5DB] shrink-0"
									aria-hidden="true"
								/>
								<code className="text-sm text-[#334155] md:font-medium">
									afterAgentCallback
								</code>
								<span className="flex-1 text-xs text-[#94A3B8] md:text-sm md:text-[#475569]">
									Inspect final agent output and execution trace
								</span>
							</li>
						</ul>
					</div>

					<h4 className="text-xs text-[#94A3B8] mb-4">BUILT-IN PLUGINS</h4>

					<ul className="flex flex-wrap gap-3" aria-label="Built-in plugins">
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-xs text-[#475569]">
							ModelFallbackPlugin
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-xs text-[#475569]">
							LangfusePlugin
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-xs text-[#475569]">
							ReflectRetryToolPlugin
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-xs text-[#475569]">
							ToolFilterPlugin
						</li>
					</ul>
				</FadeInView>

				{/* Reliability & Observability Card */}
				<FadeInView
					y={40}
					duration={0.8}
					delay={0.3}
					className="relative  py-12  lg:py-12 lg:pl-12 "
					style={{ userSelect: "text" }}
				>
					<h3 className="text-xl mb-1.5 font-semibold leading-tight text-[#0F172A]">
						Reliability & Observability
					</h3>

					<p className="text-base text-[#475569] leading-relaxed mb-8">
						Production-grade observability and systematic evaluation. Monitor
						performance with OpenTelemetry and test agent behavior with built-in
						evaluation suites.
					</p>

					{/* Checkmarks list */}
					<ul className="space-y-3 mb-8" aria-label="Observability features">
						<li className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg">
							<span
								className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center shrink-0"
								aria-hidden="true"
							>
								<span className="w-2.5 h-2.5 bg-primary" />
							</span>
							<span className="text-xs md:text-sm text-[#1E293B]">
								Distributed tracing (OTLP) with automatic context propagation
							</span>
						</li>

						<li className="flex items-center gap-3 p-3 border border-[#E5E7EB] bg-[#F9FAFB] rounded-lg">
							<span
								className="w-5 h-5 border-2 border-[#D1D5DB] rounded flex items-center justify-center shrink-0"
								aria-hidden="true"
							>
								<span className="w-2.5 h-2.5 bg-[#D1D5DB]" />
							</span>
							<span className="text-xs md:text-sm text-[#475569]">
								ADK-TS semantic spans for agents, tools, and models
							</span>
						</li>

						<li className="flex items-center gap-3 p-3 border border-[#E5E7EB] bg-[#F9FAFB] rounded-lg">
							<span
								className="w-5 h-5 border-2 border-[#D1D5DB] rounded flex items-center justify-center shrink-0"
								aria-hidden="true"
							>
								<span className="w-2.5 h-2.5 bg-[#D1D5DB]" />
							</span>
							<span className="text-xs md:text-sm text-[#475569]">
								Structured logs correlated with traces and requests
							</span>
						</li>
					</ul>

					<h4 className="text-xs text-[#94A3B8] mb-4">MONITORING PLATFORMS</h4>

					<ul
						className="flex flex-wrap gap-3"
						aria-label="Supported monitoring platforms"
					>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-[11px] lg:text-xs text-[#475569]">
							Langfuse (built-in)
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-[11px] lg:text-xs text-[#475569]">
							Datadog
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-[11px] lg:text-xs text-[#475569]">
							Grafana
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-[11px] lg:text-xs text-[#475569]">
							Jaeger
						</li>
						<li className="px-4 py-2 border border-[#E5E5E5] bg-[#F9F9F9] rounded text-[11px] lg:text-xs text-[#475569]">
							New Relic
						</li>
					</ul>
				</FadeInView>
			</div>
		</SectionWrapper>
	);
};
export default DeveloperPlatformSection;
