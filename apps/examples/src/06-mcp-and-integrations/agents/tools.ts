import { McpToolset, SamplingHandler } from "@iqai/adk";

export async function getGreetingTools(samplingHandler: SamplingHandler) {
	const greetingToolset = new McpToolset({
		name: "Greeting Server",
		description: "Custom MCP server with sampling capabilities",
		samplingHandler,
		transport: {
			mode: "stdio",
			command: "npx",
			args: [
				"tsx",
				"apps/examples/src/06-mcp-and-integrations/greeting-server.ts",
			],
		},
	});
	const tools = await greetingToolset.getTools();
	return tools;
}

export function getCoingeckoTools() {
	/**
	 * Here we are using McpToolset for demonstration purposes to use any mcp server with adk,
	 * but we can also directly use McpCoingecko() to get toolset without this verbose
	 * configuration. for more such wrapped MCPs check out https://adk.iqai.com/docs/mcp-servers
	 */
	const toolset = new McpToolset({
		name: "Coingecko MCP",
		description: "Client for Coingecko",
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "mcp-remote@latest", "https://mcp.api.coingecko.com/mcp"],
		},
	});
	return toolset.getTools();
}
