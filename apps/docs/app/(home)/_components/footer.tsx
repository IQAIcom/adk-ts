import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border w-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">ADK TypeScript</h3>
            <p className="text-sm text-muted-foreground">
              Production-ready framework for building intelligent AI agents with TypeScript and multi-LLM support.
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://github.com/IQAIcom/adk-ts"
                className="text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.237 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </Link>
              <Link
                href="https://www.npmjs.com/package/@iqai/adk"
                className="text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Documentation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Documentation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/framework/get-started" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/docs/framework/agents" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Agent Building
                </Link>
              </li>
              <li>
                <Link href="/docs/framework/tools" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Tools & Functions
                </Link>
              </li>
              <li>
                <Link href="/docs/framework/context" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Context & Memory
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Examples
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
                  href="https://github.com/IQAIcom/adk-ts/issues"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issues & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Community</h3>
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
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © 2025 ADK TypeScript. Released under the MIT License.
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link
                href="https://iqai.com"
                className="hover:text-primary transition-colors flex items-center gap-1"
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