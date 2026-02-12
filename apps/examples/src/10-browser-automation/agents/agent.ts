import { AgentBuilder } from "@iqai/adk";
import { getPlaywrightTools } from "./tools";

const MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";

export async function getBrowserAgent() {
	const playwrightTools = await getPlaywrightTools();

	return AgentBuilder.create("browser_agent")
		.withModel(MODEL)
		.withDescription("An agent that can browse the web and interact with pages")
		.withInstruction(
			`You are a browser automation agent. You can navigate to websites, interact with page elements, take screenshots, and extract information from web pages.

When asked to browse or interact with a website:
1. Navigate to the URL
2. Wait for the page to load
3. Perform the requested actions (click, type, scroll, etc.)
4. Extract and return the relevant information

Always describe what you see on the page and the actions you take.`,
		)
		.withTools(...playwrightTools)
		.build();
}
