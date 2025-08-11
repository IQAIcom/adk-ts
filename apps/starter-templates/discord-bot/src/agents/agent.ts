import { SequentialAgent } from "@iqai/adk";
import { calculatorAgent } from "./calculator/agent";
import { discordSubAgent } from "./discord/agent";
import { discordTools } from "./discord/tools";
import { weatherAgent } from "./weather/agent";

if (discordTools.length) {
	(discordSubAgent as any).tools = [
		...((discordSubAgent as any).tools || []),
		...discordTools,
	];
}

export const agent = new SequentialAgent({
	name: "discord_super_agent",
	description: "Root orchestrator for Discord interactions",
	subAgents: [discordSubAgent, weatherAgent, calculatorAgent],
});
