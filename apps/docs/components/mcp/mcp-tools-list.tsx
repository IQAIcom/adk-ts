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
		<div className="space-y-6">
			{serverData.tools.map((tool) => (
				<ToolCard key={tool.name} tool={tool} />
			))}
		</div>
	);
}

function ToolCard({ tool }: { tool: McpTool }) {
	const properties = tool.inputSchema?.properties;
	const required = tool.inputSchema?.required;

	return (
		<div>
			<h3>
				<code>{tool.name}</code>
			</h3>
			<p>{tool.description}</p>
			{properties && Object.keys(properties).length > 0 && (
				<div>
					<strong>Parameters:</strong>
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Type</th>
								<th>Required</th>
								<th>Description</th>
							</tr>
						</thead>
						<tbody>
							{Object.entries(properties).map(([name, param]) => (
								<tr key={name}>
									<td>
										<code>{name}</code>
									</td>
									<td>
										<code>{param.type || "any"}</code>
									</td>
									<td>{required?.includes(name) ? "Yes" : "No"}</td>
									<td>{param.description || "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{(!properties || Object.keys(properties).length === 0) && (
				<p>
					<em>No parameters required.</em>
				</p>
			)}
		</div>
	);
}
