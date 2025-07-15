import Link from "next/link";

export function Footer() {
	return (
		<footer className="w-screen border-border border-t bg-card">
			<div className="mx-auto max-w-6xl px-4 py-12">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-2 lg:grid-cols-4">
					{/* About */}
					<div className="space-y-4">
						<h3 className="font-semibold text-card-foreground text-lg">
							ADK TypeScript
						</h3>
						<p className="text-muted-foreground text-sm">
							Production-ready framework for building intelligent AI agents with
							TypeScript and multi-LLM support.
						</p>
						<div className="flex space-x-4">
							<Link
								className="text-muted-foreground transition-colors hover:text-primary"
								href="https://github.com/IQAIcom/adk-ts"
								rel="noopener noreferrer"
								target="_blank"
							>
								<svg
									className="h-5 w-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.237 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</Link>
							<Link
								className="text-muted-foreground transition-colors hover:text-primary"
								href="https://www.npmjs.com/package/@iqai/adk"
								rel="noopener noreferrer"
								target="_blank"
							>
								<svg
									className="h-5 w-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
								</svg>
							</Link>
						</div>
					</div>

					{/* Documentation */}
					<div className="space-y-4">
						<h3 className="font-semibold text-card-foreground text-lg">
							Documentation
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="/docs/get-started"
								>
									Getting Started
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="/docs/agents"
								>
									Agent Building
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="/docs/tools"
								>
									Tools & Functions
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="/docs/context"
								>
									Context & Memory
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="/docs/deploy"
								>
									Deployment
								</Link>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div className="space-y-4">
						<h3 className="font-semibold text-card-foreground text-lg">
							Resources
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
									rel="noopener noreferrer"
									target="_blank"
								>
									Examples
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/blob/main/CHANGELOG.md"
									rel="noopener noreferrer"
									target="_blank"
								>
									Changelog
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md"
									rel="noopener noreferrer"
									target="_blank"
								>
									Contributing
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/issues"
									rel="noopener noreferrer"
									target="_blank"
								>
									Issues & Support
								</Link>
							</li>
						</ul>
					</div>

					{/* Community */}
					<div className="space-y-4">
						<h3 className="font-semibold text-card-foreground text-lg">
							Community
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/discussions"
									rel="noopener noreferrer"
									target="_blank"
								>
									Discussions
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/releases"
									rel="noopener noreferrer"
									target="_blank"
								>
									Releases
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md"
									rel="noopener noreferrer"
									target="_blank"
								>
									License
								</Link>
							</li>
							<li>
								<Link
									className="text-muted-foreground text-sm transition-colors hover:text-primary"
									href="https://github.com/IQAIcom/adk-ts/blob/main/CODE_OF_CONDUCT.md"
									rel="noopener noreferrer"
									target="_blank"
								>
									Code of Conduct
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Footer */}
				<div className="mt-12 border-border border-t pt-8">
					<div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
						<div className="text-muted-foreground text-sm">
							© 2025 ADK TypeScript. Released under the MIT License.
						</div>
						<div className="flex items-center space-x-6 text-muted-foreground text-sm">
							<Link
								className="flex items-center gap-1 transition-colors hover:text-primary"
								href="https://iqai.com"
								rel="noopener noreferrer"
								target="_blank"
							>
								<span className="text-lg">🧠</span>
								Powered by IQ
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
