import { ask } from "../utils";
import { getBrowserAgent } from "./agents/agent";
import { getAgentBrowserAgent } from "./agents/agent-browser-agent";
import { cleanupPlaywright } from "./agents/tools";

/**
 * 10. Browser Automation
 *
 * This example demonstrates two approaches to browser automation:
 *
 * 1. Playwright MCP (McpPlaywright) - Full MCP server with rich tool set
 * 2. Agent-Browser CLI (BashTool) - Vercel's lightweight CLI with compressed snapshots
 *
 * Toggle the APPROACH variable below to switch between them.
 */

const APPROACH = (process.env.BROWSER_APPROACH || "playwright") as
	| "playwright"
	| "agent-browser";

async function main() {
	if (APPROACH === "playwright") {
		console.log("Using: Playwright MCP\n");
		const { runner } = await getBrowserAgent();
		await ask(
			runner,
			"Go to dora hacks website and tell me the top BIULDs on the BUILDs page right now.",
		);
		await cleanupPlaywright();
	} else {
		console.log("Using: Agent-Browser CLI (via BashTool)\n");
		const { runner } = await getAgentBrowserAgent();
		await ask(
			runner,
			"Go to dora hacks website and tell me the top BIULDs on the BUILDs page right now.",
		);
	}
}

main().catch(console.error);
