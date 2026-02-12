import { BashTool, McpPlaywright } from "@iqai/adk";

// --- Playwright MCP approach ---
const playwrightToolset = McpPlaywright();

export async function getPlaywrightTools() {
	const tools = await playwrightToolset.getTools();
	return tools;
}

export async function cleanupPlaywright() {
	await playwrightToolset.close();
}

// --- Agent-Browser CLI approach (via BashTool) ---
export function getAgentBrowserTool() {
	return new BashTool({
		enabled: true,
		mode: "whitelist",
		allowedCommands: ["agent-browser", "npx"],
		maxTimeout: 60000,
	});
}
