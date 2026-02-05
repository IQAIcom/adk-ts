import Link from "next/link";

export function Footer() {
	return (
		<footer className="bg-card border-t border-border w-screen">
			<div className="max-w-6xl mx-auto px-4 py-12">
				<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8">
					{/* About */}
					<div className="space-y-4 col-span-2 lg:col-span-1">
						<h3 className="text-lg font-semibold text-card-foreground">
							ADK-TS
						</h3>
						<p className="text-sm text-muted-foreground">
							Production-ready framework for building intelligent AI agents with
							TypeScript and multi-LLM support.
						</p>
						<div className="flex flex-wrap gap-3">
							<Link
								href="https://github.com/IQAIcom/adk-ts"
								className="text-muted-foreground hover:text-primary transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Github Icon</title>
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.237 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
							</Link>
							<Link
								href="https://www.npmjs.com/package/@iqai/adk"
								className="text-muted-foreground hover:text-primary transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>NPM Icon</title>
									<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
								</svg>
							</Link>
							<Link
								href="https://X.com/IQAICOM"
								className="text-muted-foreground hover:text-primary transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>X (Twitter) Icon</title>
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
							</Link>
							<Link
								href="https://www.youtube.com/@iqtoken"
								className="text-muted-foreground hover:text-primary transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>YouTube Icon</title>
									<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
								</svg>
							</Link>
							<Link
								href="https://t.me/+Z37x8uf6DLE3ZTQ8"
								className="text-muted-foreground hover:text-primary transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<title>Telegram Icon</title>
									<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
								</svg>
							</Link>
						</div>
					</div>

					{/* Developers */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-card-foreground">
							Developers
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href="/docs/framework/get-started"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									Getting Started
								</Link>
							</li>
							<li>
								<Link
									href="/docs/mcp-servers"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									MCP Servers
								</Link>
							</li>
							<li>
								<Link
									href="/docs/framework/guides"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									Guides
								</Link>
							</li>
							<li>
								<Link
									href="https://iqaicom.github.io/adk-ts/"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									API Reference
								</Link>
							</li>
							<li>
								<Link
									href="/docs/cli"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									CLI Reference
								</Link>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-card-foreground">
							Resources
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href="https://blog.iqai.com/"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Blog
								</Link>
							</li>
							<li>
								<Link
									href="/showcase"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
								>
									Showcase
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts-samples"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Sample Projects
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Tutorials
								</Link>
							</li>
						</ul>
					</div>

					{/* Support */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-card-foreground">
							Support
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/issues"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Issues & Support
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Contributing
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/blob/main/CHANGELOG.md"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Changelog
								</Link>
							</li>
						</ul>
					</div>

					{/* Community */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-card-foreground">
							Community
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/discussions"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Discussions
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/releases"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Releases
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									License
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/blob/main/CODE_OF_CONDUCT.md"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Code of Conduct
								</Link>
							</li>
							<li>
								<Link
									href="https://github.com/IQAIcom/adk-ts/blob/main/SECURITY.md"
									className="text-sm text-muted-foreground hover:text-primary transition-colors"
									target="_blank"
									rel="noopener noreferrer"
								>
									Security
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Footer */}
				<div className="mt-12 pt-8 border-t border-border">
					<div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
						<div className="text-sm text-muted-foreground">
							© 2025 ADK-TS. Released under the MIT License.
						</div>
						<div className="flex items-center gap-4 text-sm">
							<Link
								href="https://www.getdrip.com/forms/505929689/submissions/new"
								className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
								target="_blank"
								rel="noopener noreferrer"
							>
								📧 Newsletter
							</Link>
							<Link
								href="https://iqai.com"
								className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
								target="_blank"
								rel="noopener noreferrer"
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
