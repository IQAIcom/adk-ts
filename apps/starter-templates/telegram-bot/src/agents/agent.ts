import { SequentialAgent } from "@iqai/adk";
import { calculatorAgent } from "./calculator/agent";
import { telegramSubAgent } from "./telegram/agent";
import { telegramTools } from "./telegram/tools";
import { weatherAgent } from "./weather/agent";

if (telegramTools.length) {
	(telegramSubAgent as any).tools = [
		...((telegramSubAgent as any).tools || []),
		...telegramTools,
	];
}

export const agent = new SequentialAgent({
	name: "telegram_super_agent",
	description: "Root orchestrator for Telegram interactions",
	subAgents: [telegramSubAgent, weatherAgent, calculatorAgent],
});
