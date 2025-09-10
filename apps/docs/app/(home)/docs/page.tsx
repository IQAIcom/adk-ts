import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, Server, Terminal } from 'lucide-react';
import Link, { type LinkProps } from 'next/link';

export default function DocsPage(): React.ReactElement {
  return (
    <main className="container flex flex-col items-center py-16 text-center z-2">
      <div className="absolute inset-0 z-[-1] overflow-hidden duration-1000 animate-in fade-in [perspective:2000px]">
        <div
          className="absolute bottom-[20%] left-1/2 size-[1200px] origin-bottom bg-fd-primary/30 opacity-30"
          style={{
            transform: 'rotateX(75deg) translate(-50%, 400px)',
            backgroundImage:
              'radial-gradient(50% 50% at center,transparent,var(--color-fd-background)), repeating-linear-gradient(to right,var(--color-fd-primary),var(--color-fd-primary) 1px,transparent 2px,transparent 100px), repeating-linear-gradient(to bottom,var(--color-fd-primary),var(--color-fd-primary) 2px,transparent 3px,transparent 100px)',
          }}
        />
      </div>
      <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
        ADK TS
      </h1>
      <p className="text-fd-muted-foreground">
        Build powerful AI agents with our comprehensive framework and MCP server integrations.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/docs/framework/get-started"
          className={cn(buttonVariants(), 'px-6')}
        >
          Get Started
        </Link>
        <Link
          href="/docs/framework/get-started/quickstart"
          className={cn(buttonVariants({ variant: 'outline' }), 'ml-4 px-6')}
        >
          Quickstart Guide
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-6 text-left md:grid-cols-3 max-w-4xl mx-auto">
        <Item href="/docs/framework/get-started">
          <Icon>
            <Building2 className="size-full" />
          </Icon>
          <h2 className="mb-2 text-lg font-semibold">Docs</h2>
          <p className="text-sm text-fd-muted-foreground">
            Build intelligent AI agents with our comprehensive TypeScript framework featuring tools, sessions, and runtime management.
          </p>
        </Item>
        <Item href="/docs/mcp-servers">
          <Icon>
            <Server className="size-full" />
          </Icon>
          <h2 className="mb-2 text-lg font-semibold">MCP Servers</h2>
          <p className="text-sm text-fd-muted-foreground">
            Pre-built MCP server integrations for blockchain, social media, and data services to enhance your agents.
          </p>
        </Item>
        <Item href="/docs/cli">
          <Icon>
            <Terminal className="size-full" />
          </Icon>
          <h2 className="mb-2 text-lg font-semibold">CLI</h2>
          <p className="text-sm text-fd-muted-foreground">
            Command-line tooling to scaffold projects, run agents, and launch web/API.
          </p>
        </Item>
      </div>
    </main>
  );
}

function Icon({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
      {children}
    </div>
  );
}

function Item(
  props: LinkProps & { children: React.ReactNode },
): React.ReactElement {
  return (
    <Link
      {...props}
      className="group relative rounded-xl border border-fd-border bg-fd-card p-6 transition-all duration-200 hover:shadow-lg hover:border-fd-primary/30 hover:-translate-y-1"
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-fd-primary/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative">
        {props.children}
      </div>
    </Link>
  );
}