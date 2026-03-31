import { motion } from "motion/react";
import { Zap, Flame, FileStack, Rocket } from "lucide-react";

const CompleteStackSection = () => {
	return (
		<section className="relative border-t border-white/5 bg-black py-32">
			{/* Vertical boundary lines */}
			<div className="absolute inset-0 pointer-events-none z-0">
				<div className="max-w-[1800px] mx-auto h-full relative">
					<div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5" />
				</div>
			</div>

			<div className="relative max-w-[1800px] mx-auto px-8 lg:px-16">
				{/* Section Header */}
				<div className="mb-24">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
					>
						<h2 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-4">
							Developer Platform
						</h2>
						<h3 className="text-5xl font-bold mb-6">
							The Complete
							<br />
							Agent Stack
						</h3>
						<p className="text-white/50 text-lg max-w-2xl">
							Everything you need to build, test, and deploy AI agents. From CLI
							tools to observability, all batteries included.
						</p>
					</motion.div>
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
						<h3 className="font-mono text-3xl mb-4 leading-tight">ADK CLI</h3>

						<p className="text-base font-mono text-white/60 leading-relaxed mb-8">
							Powerful command-line interface for scaffolding projects, managing
							agents, running development servers, and deploying to production.
						</p>

						{/* Stats grid */}
						<div className="grid grid-cols-2 gap-6 mb-12">
							<div>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-12 h-12 relative flex items-center justify-center">
										<div className="absolute inset-0 bg-[#FF1A88]/10 rounded-lg" />
										<div className="absolute inset-0 border border-[#FF1A88]/30 rounded-lg" />
										<Zap className="w-6 h-6 text-[#FF1A88] relative z-10" />
									</div>
									<div>
										<div className="font-mono text-2xl font-semibold">
											{"<"}3s
										</div>
										<div className="text-xs font-mono text-white/40">
											Project creation
										</div>
									</div>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-12 h-12 relative flex items-center justify-center">
										<div className="absolute inset-0 bg-[#FF1A88]/10 rounded-lg" />
										<div className="absolute inset-0 border border-[#FF1A88]/30 rounded-lg" />
										<Flame className="w-6 h-6 text-[#FF1A88] relative z-10" />
									</div>
									<div>
										<div className="font-mono text-2xl font-semibold">HMR</div>
										<div className="text-xs font-mono text-white/40">
											Hot module reload
										</div>
									</div>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-12 h-12 relative flex items-center justify-center">
										<div className="absolute inset-0 bg-[#FF1A88]/10 rounded-lg" />
										<div className="absolute inset-0 border border-[#FF1A88]/30 rounded-lg" />
										<FileStack className="w-6 h-6 text-[#FF1A88] relative z-10" />
									</div>
									<div>
										<div className="font-mono text-2xl font-semibold">12+</div>
										<div className="text-xs font-mono text-white/40">
											Built-in templates
										</div>
									</div>
								</div>
							</div>

							<div>
								<div className="flex items-center gap-3 mb-3">
									<div className="w-12 h-12 relative flex items-center justify-center">
										<div className="absolute inset-0 bg-[#FF1A88]/10 rounded-lg" />
										<div className="absolute inset-0 border border-[#FF1A88]/30 rounded-lg" />
										<Rocket className="w-6 h-6 text-[#FF1A88] relative z-10" />
									</div>
									<div>
										<div className="font-mono text-2xl font-semibold">
											1-click
										</div>
										<div className="text-xs font-mono text-white/40">
											Deploy command
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="text-xs font-mono text-white/40 mb-4">COMMANDS</div>

						<div className="space-y-2">
							<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
								<span className="text-[#FF1A88]">$</span> adk init my-agent
							</div>
							<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
								<span className="text-[#FF1A88]">$</span> adk dev
							</div>
							<div className="px-4 py-3 border border-white/10 bg-white/5 rounded font-mono text-sm text-white/80">
								<span className="text-[#FF1A88]">$</span> adk deploy --prod
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

						<p className="text-base font-mono text-white/60 leading-relaxed mb-8">
							Built-in session management with persistent memory storage.
							Multiple storage backends with unified API and automatic context
							retention.
						</p>

						{/* Stack visualization */}
						<div className="space-y-4 mb-8">
							<div className="flex items-center gap-4">
								<div className="w-32 h-14 relative">
									<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
										<span className="font-mono text-xs text-white/60">
											Redis
										</span>
									</div>
									<div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF1A88] rounded-full" />
								</div>
								<div className="flex-1 text-xs font-mono text-white/40">
									100ms avg latency, 10k+ sessions/sec
								</div>
							</div>

							<div className="flex items-center gap-4">
								<div className="w-32 h-14 relative">
									<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
										<span className="font-mono text-xs text-white/60">
											PostgreSQL
										</span>
									</div>
								</div>
								<div className="flex-1 text-xs font-mono text-white/40">
									Persistent storage, full-text search
								</div>
							</div>

							<div className="flex items-center gap-4">
								<div className="w-32 h-14 relative">
									<div className="absolute inset-0 bg-white/5 border border-white/10 rounded flex items-center justify-center">
										<span className="font-mono text-xs text-white/60">
											In-Memory
										</span>
									</div>
								</div>
								<div className="flex-1 text-xs font-mono text-white/40">
									Zero-config local development
								</div>
							</div>
						</div>

						<div className="text-xs font-mono text-white/40 mb-4">
							KEY FEATURES
						</div>

						<div className="space-y-2">
							<div className="flex items-center gap-3 text-sm font-mono text-white/70">
								<div className="w-1.5 h-1.5 bg-[#FF1A88]" />
								Automatic conversation threading
							</div>
							<div className="flex items-center gap-3 text-sm font-mono text-white/70">
								<div className="w-1.5 h-1.5 bg-white/30" />
								Context window management
							</div>
							<div className="flex items-center gap-3 text-sm font-mono text-white/70">
								<div className="w-1.5 h-1.5 bg-white/30" />
								Cross-agent memory sharing
							</div>
						</div>
					</motion.div>

					{/* Callbacks & Plugins Card */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative p-12 lg:border-r border-white/5 bg-black/20 hover:bg-black/40 transition-colors duration-500"
						style={{ userSelect: "text" }}
					>
						<h3 className="font-mono text-3xl mb-4 leading-tight">
							Callbacks & Plugin System
						</h3>

						<p className="text-base font-mono text-white/60 leading-relaxed mb-8">
							Extensible plugin architecture with lifecycle hooks. Event-driven
							callbacks for complete control over agent behavior and composable
							middleware.
						</p>

						{/* Lifecycle flow */}
						<div className="mb-8">
							<div className="text-xs font-mono text-white/40 mb-4">
								LIFECYCLE HOOKS
							</div>

							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-[#FF1A88]" />
									<div className="text-sm font-mono text-white/80">
										beforeExecute
									</div>
									<div className="flex-1 text-xs font-mono text-white/40">
										Validate & modify prompt
									</div>
								</div>

								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-white/20" />
									<div className="text-sm font-mono text-white/80">
										onToolCall
									</div>
									<div className="flex-1 text-xs font-mono text-white/40">
										Intercept tool execution
									</div>
								</div>

								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-white/20" />
									<div className="text-sm font-mono text-white/80">
										onStream
									</div>
									<div className="flex-1 text-xs font-mono text-white/40">
										Process streaming chunks
									</div>
								</div>

								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-white/20" />
									<div className="text-sm font-mono text-white/80">
										afterExecute
									</div>
									<div className="flex-1 text-xs font-mono text-white/40">
										Log & trigger webhooks
									</div>
								</div>

								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-white/20" />
									<div className="text-sm font-mono text-white/80">onError</div>
									<div className="flex-1 text-xs font-mono text-white/40">
										Handle failures gracefully
									</div>
								</div>
							</div>
						</div>

						<div className="text-xs font-mono text-white/40 mb-4">
							BUILT-IN PLUGINS
						</div>

						<div className="flex flex-wrap gap-3">
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Rate Limiter
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Logger
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Validator
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Cache
							</div>
						</div>
					</motion.div>

					{/* Observability Card */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="relative p-12 bg-black/20 hover:bg-black/40 transition-colors duration-500"
						style={{ userSelect: "text" }}
					>
						<h3 className="font-mono text-3xl mb-4 leading-tight">
							Observability
						</h3>

						<p className="text-base font-mono text-white/60 leading-relaxed mb-8">
							Full OpenTelemetry integration for metrics, traces, and logs.
							Monitor agent performance and debug execution flows in production.
						</p>

						{/* Checkmarks list */}
						<div className="space-y-3 mb-8">
							<div className="flex items-center gap-3 p-3 border border-[#FF1A88]/20 bg-[#FF1A88]/5 rounded-lg">
								<div className="w-5 h-5 border-2 border-[#FF1A88] rounded flex items-center justify-center flex-shrink-0">
									<div className="w-2.5 h-2.5 bg-[#FF1A88]" />
								</div>
								<div className="text-sm font-mono text-white/90">
									Distributed tracing with context propagation
								</div>
							</div>

							<div className="flex items-center gap-3 p-3 border border-white/10 bg-white/[0.02] rounded-lg">
								<div className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center flex-shrink-0">
									<div className="w-2.5 h-2.5 bg-white/30" />
								</div>
								<div className="text-sm font-mono text-white/60">
									Custom metrics & dashboards
								</div>
							</div>

							<div className="flex items-center gap-3 p-3 border border-white/10 bg-white/[0.02] rounded-lg">
								<div className="w-5 h-5 border-2 border-white/30 rounded flex items-center justify-center flex-shrink-0">
									<div className="w-2.5 h-2.5 bg-white/30" />
								</div>
								<div className="text-sm font-mono text-white/60">
									Structured logging with correlation IDs
								</div>
							</div>
						</div>

						<div className="text-xs font-mono text-white/40 mb-4">
							MONITORING PLATFORMS
						</div>

						<div className="flex flex-wrap gap-3">
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Datadog
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								New Relic
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Grafana
							</div>
							<div className="px-4 py-2 border border-white/10 bg-white/5 rounded font-mono text-xs text-white/60">
								Jaeger
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
};
export default CompleteStackSection;
