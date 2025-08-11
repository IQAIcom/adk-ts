import { SequentialAgent } from "@iqai/adk";
import { calculatorAgent } from "../agents/calculator/agent";
import { weatherAgent } from "../agents/weather/agent";
import { honoSubAgent } from "./hono/agent";
import { honoTools } from "./hono/tools";

if (honoTools.length) {
	(honoSubAgent as any).tools = [
		...((honoSubAgent as any).tools || []),
		...honoTools,
	];
}

export const agent = new SequentialAgent({
	name: "hono_super_agent",
	description: "Root orchestrator for Hono server AI flows",
	subAgents: [honoSubAgent, weatherAgent, calculatorAgent],
});
