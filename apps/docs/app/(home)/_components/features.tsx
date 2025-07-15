export function Features() {
	return (
		<section className="bg-muted/30 px-4 py-16">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-foreground md:text-4xl">
						Why Choose ADK TypeScript?
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
						Everything you need to build production-ready AI agents with
						TypeScript's type safety and modern tooling.
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<svg
								className="h-6 w-6 text-primary"
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
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							AgentBuilder API
						</h3>
						<p className="text-muted-foreground">
							Fluent interface for rapid agent creation with zero boilerplate.
							Create agents in one line or build complex workflows.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
							<svg
								className="h-6 w-6 text-chart-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							Multi-LLM Support
						</h3>
						<p className="text-muted-foreground">
							Seamlessly switch between OpenAI, Google Gemini, Anthropic Claude,
							and more with unified interface.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10">
							<svg
								className="h-6 w-6 text-chart-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							Production Ready
						</h3>
						<p className="text-muted-foreground">
							Built-in session management, memory services, streaming, and
							artifact handling for enterprise deployment.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10">
							<svg
								className="h-6 w-6 text-chart-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							Advanced Tooling
						</h3>
						<p className="text-muted-foreground">
							Custom tools, function integration, Google Cloud tools, MCP
							support, and automatic schema generation.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/10">
							<svg
								className="h-6 w-6 text-chart-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							Multi-Agent Workflows
						</h3>
						<p className="text-muted-foreground">
							Orchestrate complex workflows with parallel, sequential, and
							hierarchical agent architectures.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<svg
								className="h-6 w-6 text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-card-foreground text-xl">
							Developer Experience
						</h3>
						<p className="text-muted-foreground">
							Excellent DX with TypeScript IntelliSense, comprehensive examples,
							and intuitive APIs.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
