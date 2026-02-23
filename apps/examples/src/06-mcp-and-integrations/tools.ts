import { McpCoinGecko, McpToolset, SamplingHandler } from "@iqai/adk";

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
	return { tools };
}

export async function getCoingeckoTools() {
	/**
	 * McpCoinGecko() is a built-in convenience wrapper around McpToolset.
	 * ADK ships similar wrappers for many popular services so you don't have to
	 * write the verbose transport config by hand. See all available wrappers at
	 * https://adk.iqai.com/docs/mcp-servers
	 * */

	const toolset = McpCoinGecko();
	const tools = await toolset.getTools();
	return { tools };
}
