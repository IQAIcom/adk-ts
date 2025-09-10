import Link from 'next/link';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import dedent from 'dedent';

export function Hero() {
  return (
    <section className="relative flex flex-1 flex-col justify-center items-center px-2 sm:px-4 py-8 sm:py-12 overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5"></div>

        {/* Enhanced floating orbs */}
        <div className="absolute top-8 left-8 w-24 sm:w-32 h-24 sm:h-32 bg-primary/20 rounded-full blur-2xl animate-pulse opacity-30"></div>
        <div className="absolute bottom-8 right-8 w-32 sm:w-40 h-32 sm:h-40 bg-chart-1/20 rounded-full blur-2xl animate-pulse opacity-30 animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-chart-2/15 rounded-full blur-xl animate-ping opacity-20 animation-delay-4000"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        {/* Moving gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"></div>
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
        {/* Header section with animations */}
        <div className="mb-8 animate-fade-in-up">
          <div className="inline-flex items-center bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-6 hover:bg-primary/15 transition-all duration-300 hover:scale-105">
            <svg className="w-3.5 h-3.5 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            ADK-TS: Build AI Agents in TypeScript
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 animate-fade-in-up animation-delay-200">
            <span className="text-foreground">
              Build Sophisticated
            </span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              Multi-Agent AI Systems
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-400">
            Enterprise-grade framework for hierarchical agents, tool integration, memory management, and real-time streaming
          </p>

          {/* Action buttons with enhanced styling */}
          <div className="flex flex-row gap-3 justify-center mb-12 animate-fade-in-up animation-delay-600">
            <Link
              href="/docs/framework/get-started"
              className="group inline-flex items-center justify-center rounded-lg bg-primary px-4 sm:px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg hover:shadow-primary/25"
            >
              Get Started
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="/docs/framework/get-started/quickstart"
              className="group inline-flex items-center justify-center rounded-lg border border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-lg"
            >
              Quick Start
              <svg className="ml-2 h-4 w-4 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Code preview - centered container with left-aligned code */}
        <div className="relative w-full max-w-2xl mx-auto mb-12 animate-fade-in-up animation-delay-800">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-chart-1/20 rounded-lg blur opacity-25 animate-pulse"></div>
          <div className="relative bg-card border border-border rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-muted/30 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse animation-delay-300"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse animation-delay-600"></div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">multi-agent-system.ts</span>
            </div>
            <div className="p-3 sm:p-4 overflow-x-auto text-left">
              <div className="min-w-0">
                <DynamicCodeBlock
                  lang="typescript"
                  code={dedent`
                    const workflow = AgentBuilder
                      .asSequential([researchAgent, analysisAgent])
                      .withTools([GoogleSearch, DataProcessor])
                      .withMemory(vectorMemoryService);

                    const result = await workflow.ask(
                      "Analyze market trends in AI"
                    );
                  `}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced feature highlights at the end */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-in-up animation-delay-1000">
          <div className="flex items-center justify-center space-x-2 text-sm hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse"></div>
            <span className="text-muted-foreground">Multi-Agent</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-chart-1 rounded-full flex-shrink-0 animate-pulse animation-delay-200"></div>
            <span className="text-muted-foreground">Tool Integration</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-chart-2 rounded-full flex-shrink-0 animate-pulse animation-delay-400"></div>
            <span className="text-muted-foreground">Memory Services</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-chart-3 rounded-full flex-shrink-0 animate-pulse animation-delay-600"></div>
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