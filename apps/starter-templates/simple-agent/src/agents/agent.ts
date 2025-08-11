import { SequentialAgent } from "@iqai/adk";
import { calculatorAgent } from "./calculator/agent";
import { weatherAgent } from "./weather/agent";

// Root super agent now only orchestrates weather + calculator
export const agent = new SequentialAgent({
	name: "root_super_agent",
	description: "Root agent orchestrating weather and calculator agents",
	subAgents: [weatherAgent, calculatorAgent],
});
// If you prefer a single agent export, you could export weatherAgent directly.
