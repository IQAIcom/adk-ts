import clsx from "clsx";
import { Callout } from "fumadocs-ui/components/callout";

interface ToolParameter {
	type?: string;
	description?: string;
	enum?: string[];
}

interface ToolInputSchema {
	type: string;
	properties?: Record<string, ToolParameter>;
	required?: string[];
}

interface McpTool {
	name: string;
	description: string;
	inputSchema: ToolInputSchema;
}

interface ServerData {
	name: string;
	package: string;
	tools: McpTool[];
	error: string | null;
}

interface McpToolsData {
	generatedAt: string;
	servers: Record<string, ServerData>;
}

interface McpToolsListProps {
	serverId: string;
}

import rawMcpToolsData from "@/data/mcp-tools.json";

const mcpToolsData = rawMcpToolsData as unknown as McpToolsData;

function ToolTile({ tool }: { tool: McpTool }) {
	const properties = tool.inputSchema?.properties;
	const required = tool.inputSchema?.required || [];

	return (
		<details className="not-prose group rounded-lg border border-fd-border bg-fd-card transition-colors hover:bg-fd-muted dark:hover:bg-fd-muted/50 [&[open]]:bg-fd-muted dark:[&[open]]:bg-fd-muted/50">
			<summary className="flex cursor-pointer items-start gap-3 px-4 py-3 select-none list-none [&::-webkit-details-marker]:hidden">
				<svg
					className="mt-1 size-4 shrink-0 text-fd-muted-foreground transition-transform group-open:rotate-90"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<title>Toggle</title>
					<path
						fillRule="evenodd"
						d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
						clipRule="evenodd"
					/>
				</svg>
				<div className="flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<code className="rounded-md bg-fd-muted px-2 py-0.5 text-sm font-semibold text-fd-foreground">
							{tool.name}
						</code>
					</div>
					{properties && Object.keys(properties).length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1.5">
							{Object.entries(properties).map(([name, param]) => {
								const isRequired = required.includes(name);
								return (
									<span
										key={name}
										className={clsx(
											"inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
											isRequired
												? "border-fd-primary/30 bg-fd-primary/5 text-fd-primary"
												: "border-fd-border bg-fd-card text-fd-muted-foreground",
										)}
									>
										{name}
										<span className="opacity-50">:{param.type || "any"}</span>
									</span>
								);
							})}
						</div>
					)}
					{(!properties || Object.keys(properties).length === 0) && (
						<p className="mt-1 text-xs text-fd-muted-foreground italic">
							No parameters
						</p>
					)}
				</div>
			</summary>
			<div className="border-t border-fd-border bg-fd-muted/30 px-4 py-3 pl-11">
				<p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fd-muted-foreground/60">
					Description
				</p>
				<p className="text-sm leading-relaxed text-fd-foreground/80">
					{tool.description}
				</p>
			</div>
		</details>
	);
}

export function McpToolsList({ serverId }: McpToolsListProps) {
	const serverData = mcpToolsData.servers[serverId];

	if (!serverData) {
		return (
			<Callout type="warn" title="Tools Unavailable">
				No tool data available for this MCP server. Run{" "}
				<code>pnpm run fetch-tools</code> to generate tool data.
			</Callout>
		);
	}

	if (serverData.error) {
		return (
			<Callout type="info" title="Remote MCP Endpoint">
				This MCP server is hosted remotely and tools are discovered dynamically
				at runtime. For the full list of available tools and endpoints, see the{" "}
				<a
					href="https://docs.coingecko.com/docs/mcp-server"
					target="_blank"
					rel="noopener noreferrer"
				>
					official CoinGecko MCP documentation
				</a>
				.
			</Callout>
		);
	}

	if (serverData.tools.length === 0) {
		return (
			<Callout type="info" title="No Tools">
				No tools were discovered for this server.
			</Callout>
		);
	}

	return (
		<div className="not-prose space-y-2">
			{serverData.tools.map((tool) => (
				<ToolTile key={tool.name} tool={tool} />
			))}
		</div>
	);
}
