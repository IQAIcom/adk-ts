import mcpToolsData from "@/data/mcp-tools.json";
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

interface McpToolsListProps {
	serverId: string;
}

function ToolTile({ tool }: { tool: McpTool }) {
	const properties = tool.inputSchema?.properties;
	const required = tool.inputSchema?.required || [];

	return (
		<details className="not-prose group rounded-lg border border-fd-border bg-fd-card transition-colors hover:border-fd-primary/30 [&[open]]:border-fd-primary/40 [&[open]]:bg-fd-card">
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
						<code className="rounded-md bg-fd-primary/10 px-2 py-0.5 text-sm font-semibold text-fd-primary">
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
										className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
											isRequired
												? "bg-fd-primary/10 text-fd-primary"
												: "bg-fd-secondary text-fd-secondary-foreground"
										}`}
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
			<div className="border-t border-fd-border px-4 py-3 pl-11">
				<p className="text-sm leading-relaxed text-fd-muted-foreground">
					{tool.description}
				</p>
			</div>
		</details>
	);
}

export function McpToolsList({ serverId }: McpToolsListProps) {
	const serverData = (
		mcpToolsData.servers as unknown as Record<string, ServerData | undefined>
	)[serverId];

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
			<Callout type="info" title="Dynamic Tools">
				{serverData.error}
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
