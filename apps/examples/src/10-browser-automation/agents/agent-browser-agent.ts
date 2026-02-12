import { AgentBuilder } from "@iqai/adk";
import { getAgentBrowserTool } from "./tools";

const MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";

export async function getAgentBrowserAgent() {
	const bashTool = getAgentBrowserTool();

	return AgentBuilder.create("agent_browser_agent")
		.withModel(MODEL)
		.withDescription(
			"A browser automation agent using Vercel's agent-browser CLI",
		)
		.withInstruction(
			`You are a browser automation agent that uses Vercel's agent-browser CLI.

IMPORTANT: Always prefix commands with "npx" since agent-browser is not globally installed.

Available commands (run via the bash tool):
- npx agent-browser open <url>        → Navigate to a URL
- npx agent-browser snapshot           → Get page content with @refs
- npx agent-browser click <@ref>       → Click an element by its @ref
- npx agent-browser type <@ref> <text> → Type text into an element
- npx agent-browser fill <@ref> <text> → Clear and fill an element
- npx agent-browser press <key>        → Press a key (Enter, Tab, etc.)
- npx agent-browser scroll <direction> → Scroll up/down/left/right
- npx agent-browser screenshot [path]  → Take a screenshot
- npx agent-browser get text <@ref>    → Get text content of an element
- npx agent-browser get url            → Get current page URL
- npx agent-browser get title          → Get current page title

Workflow:
1. Use "npx agent-browser open <url>" to navigate
2. Use "npx agent-browser snapshot" to see the page (returns element refs like @e1, @e2)
3. Use the @refs to interact with elements
4. Use "npx agent-browser snapshot" again after interactions

Always take a snapshot after navigating to see the current page state.`,
		)
		.withTools(bashTool)
		.build();
}
