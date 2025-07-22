import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-16 px-4 bg-gradient-to-r from-primary/5 via-chart-1/5 to-chart-2/5">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to Build Your First Agent?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join developers building the future of AI with TypeScript. Get started with our comprehensive documentation and examples.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/docs/framework/get-started/installation"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg"
          >
            Start Building
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <Link
            href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-8 py-3 text-lg font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Examples
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}