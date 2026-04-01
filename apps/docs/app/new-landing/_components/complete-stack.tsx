"use client";

import { motion } from "motion/react";
import { Zap, Flame, FileStack, Rocket } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

const CompleteStackSection = () => {
	return (
		<SectionWrapper id="complete-stack">
			{/* Section Header */}
			<div className="landing-section-header">
				<span className="landing-badge">Developer Platform</span>
				<h2>The Complete ADK-TS Stack</h2>
				<p>
					Not just a framework, but a complete development experience. Every
					layer you need, from project scaffolding to production observability.
				</p>
			</div>

			{/* 2x2 Grid of Capabilities */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-white/5">
				{/* CLI Card */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0 }}
					className="relative p-12 border-b lg:border-r border-white/5 bg-black/20 hover:bg-black/40 transition-colors duration-500"
				>
					<h3 className="font-mono text-3xl mb-4 leading-tight">ADK-TS CLI</h3>

					<p className="text-base text-white/60 leading-relaxed mb-8">
						The official CLI for ADK-TS. Scaffold projects from templates, run
						agents with hot-reload, and launch a web UI for testing — all in one
						tool.
					</p>

					{/* Stats grid */}
					<div className="grid grid-cols-2 gap-6 mb-12">
						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/30 rounded-lg" />
									<Zap className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div>
									<div className="font-mono text-2xl font-semibold">
										{"<"}3s
									</div>
									<div className="text-xs text-white/40">Project ready</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/30 rounded-lg" />
									<FileStack className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div>
									<div className="font-mono text-2xl font-semibold">7+</div>
									<div className="text-xs text-white/40">Starter templates</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/30 rounded-lg" />
									<Flame className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div>
									<div className="font-mono text-2xl font-semibold">HMR</div>
									<div className="text-xs text-white/40">Hot reload</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-3 mb-3">
								<div className="w-12 h-12 relative flex items-center justify-center">
									<div className="absolute inset-0 bg-primary/10 rounded-lg" />
									<div className="absolute inset-0 border border-primary/30 rounded-lg" />
									<Rocket className="w-6 h-6 text-primary relative z-10" />
								</div>
								<div>
									<div className="font-mono text-2xl font-semibold">Web</div>
									<div className="text-xs text-white/40">Browser UI</div>
								</div>
							</div>
						</div>
					</div>

					<div className="text-xs text-white/40 mb-4">COMMANDS</div>

					<div className="space-y-2">
						<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
							<span className="text-primary">$</span> adk new my-agent
						</div>
						<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
							<span className="text-primary">$</span> adk run
						</div>
						<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
							<span className="text-primary">$</span> adk web
						</div>
						<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
							<span className="text-primary">$</span> adk serve
						</div>
					</div>
				</motion.div>

				{/* Sessions & Memory Card */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.1 }}
					className="relative p-12 border-b border-white/5 bg-black/20 hover:bg-black/40 transition-colors duration-500"
				>
					<h3 className="font-mono text-3xl mb-4 leading-tight">
						Sessions & Memory
					</h3>

					<p className="text-base text-white/60 leading-relaxed mb-8">
						Persistent session state across every conversation. Multiple storage
						backends with a unified interface and automatic conversation
						threading.
					</p>

					{/* Stack visualization */}
					<div className="space-y-4 mb-8">
						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
									<span className="font-mono text-xs text-white/60">
										In-Memory
									</span>
								</div>
								<div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
							</div>
							<div className="flex-1 text-xs text-white/40">
								Zero-config local development, no persistence needed.
							</div>
						</div>

						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
									<span className="font-mono text-xs text-white/60">
										PostgreSQL/SQLite
									</span>
								</div>
							</div>
							<div className="flex-1 text-xs text-white/40">
								Persistent sessions with Drizzle ORM and full-text search.
							</div>
						</div>

						<div className="flex items-center gap-4">
							<div className="w-34 h-14 relative">
								<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
									<span className="font-mono text-xs text-white/60">
										Vertex AI
									</span>
								</div>
							</div>
							<div className="flex-1 text-xs text-white/40">
								Google Cloud-native session storage for production scale.
							</div>
						</div>
					</div>

					<div className="text-xs text-white/40 mb-4">KEY FEATURES</div>

					<div className="space-y-2">
						<div className="flex items-center gap-3 text-sm text-white/70">
							<div className="w-1.5 h-1.5 bg-primary" />
							Automatic conversation threading
						</div>
						<div className="flex items-center gap-3 text-sm text-white/70">
							<div className="w-1.5 h-1.5 bg-white/30" />
							Context window management
						</div>
						<div className="flex items-center gap-3 text-sm text-white/70">
							<div className="w-1.5 h-1.5 bg-white/30" />
							Cross-agent memory sharing
						</div>
						<div className="flex items-center gap-3 text-sm text-white/70">
							<div className="w-1.5 h-1.5 bg-white/30" />
							Vertex AI RAG memory integration
						</div>
						<div className="flex items-center gap-3 text-sm text-white/70">
							<div className="w-1.5 h-1.5 bg-white/30" />
							Unified Memory API (combine multiple sources)
						</div>
					</div>
				</motion.div>

				{/* Workflows & Extensibility Card */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="relative p-12 lg:border-r border-white/5 bg-black/20 hover:bg-black/40 transition-colors duration-500"
					style={{ userSelect: "text" }}
				>
					<h3 className="font-mono text-3xl mb-4 leading-tight">
						Workflows & Extensibility
					</h3>

					<p className="text-base text-white/60 leading-relaxed mb-8">
						Orchestrate complex agents with a built-in workflow engine and
						plugin system. Intercept events, manage long-running tasks, and
						extend agent behavior with ease.
					</p>

					{/* Lifecycle flow */}
					<div className="mb-8">
						<div className="text-xs text-white/40 mb-4">LIFECYCLE HOOKS</div>

						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-primary" />
								<div className="text-sm text-white/80">beforeModelCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Inspect and transform prompts before model execution
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-white/20" />
								<div className="text-sm text-white/80">beforeToolCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Observe or override tool execution
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-white/20" />
								<div className="text-sm text-white/80">afterModelCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Post-process and validate model responses
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-white/20" />
								<div className="text-sm text-white/80">afterToolCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Capture and transform tool results
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-white/20" />
								<div className="text-sm text-white/80">beforeAgentCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Intercept agent execution before any step
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-white/20" />
								<div className="text-sm text-white/80">afterAgentCallback</div>
								<div className="flex-1 text-xs text-white/40">
									Inspect final agent output and execution trace
								</div>
							</div>
						</div>
					</div>

					<div className="text-xs text-white/40 mb-4">BUILT-IN PLUGINS</div>

					<div className="flex flex-wrap gap-3">
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							ModelFallbackPlugin
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							LangfusePlugin
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							ReflectRetryToolPlugin
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							ToolFilterPlugin
						</div>
					</div>
				</motion.div>

				{/* Reliability & Observability Card */}
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8, delay: 0.3 }}
					className="relative p-12 bg-black/20 hover:bg-black/40 transition-colors duration-500"
					style={{ userSelect: "text" }}
				>
					<h3 className="font-mono text-3xl mb-4 leading-tight">
						Reliability & Observability
					</h3>

					<p className="text-base text-white/60 leading-relaxed mb-8">
						Production-grade observability and systematic evaluation. Monitor
						performance with OpenTelemetry and test agent behavior with built-in
						evaluation suites.
					</p>

					{/* Checkmarks list */}
					<div className="space-y-3 mb-8">
						<div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg">
							<div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center shrink-0">
								<div className="w-2.5 h-2.5 bg-primary" />
							</div>
							<div className="text-sm text-white/90">
								Distributed tracing (OTLP) with automatic context propagation
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 border border-white/10 bg-white/2 rounded-lg">
							<div className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center shrink-0">
								<div className="w-2.5 h-2.5 bg-white/30" />
							</div>
							<div className="text-sm text-white/60">
								ADK-TS semantic spans for agents, tools, and models
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 border border-white/10 bg-white/2 rounded-lg">
							<div className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center shrink-0">
								<div className="w-2.5 h-2.5 bg-white/30" />
							</div>
							<div className="text-sm text-white/60">
								Structured logs correlated with traces and requests
							</div>
						</div>
					</div>

					<div className="text-xs text-white/40 mb-4">MONITORING PLATFORMS</div>

					<div className="flex flex-wrap gap-3">
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Langfuse (built-in)
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Datadog
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Grafana
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							Jaeger
						</div>
						<div className="px-4 py-2 border border-white/10 bg-white/5 rounded text-xs text-white/60">
							New Relic
						</div>
					</div>
				</motion.div>
			</div>
		</SectionWrapper>
	);
};
export default CompleteStackSection;
