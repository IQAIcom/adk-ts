export function Features() {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose ADK TypeScript?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build production-ready AI agents with TypeScript's type safety and modern tooling.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">AgentBuilder API</h3>
            <p className="text-muted-foreground">Fluent interface for rapid agent creation with zero boilerplate. Create agents in one line or build complex workflows.</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Multi-LLM Support</h3>
            <p className="text-muted-foreground">Seamlessly switch between OpenAI, Google Gemini, Anthropic Claude, AI SDK models and more with unified interface.</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Production Ready</h3>
            <p className="text-muted-foreground">Built-in session management, memory services, streaming, and artifact handling for enterprise deployment.</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Advanced Tooling</h3>
            <p className="text-muted-foreground">Custom tools, function integration, Google Cloud tools, MCP support, and automatic schema generation.</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-chart-5/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-chart-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Multi-Agent Workflows</h3>
            <p className="text-muted-foreground">Orchestrate complex workflows with parallel, sequential, and hierarchical agent architectures.</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Developer Experience</h3>
            <p className="text-muted-foreground">Excellent DX with TypeScript IntelliSense, comprehensive examples, and intuitive APIs.</p>
          </div>
        </div>
      </div>
    </section>
  );
}