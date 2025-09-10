import { AgentBuilder, InMemorySessionService } from "@iqai/adk";
import { env } from "../env";
import { getEthPriceAgent } from "./eth-price-agent/agent";
import { getEthSentimentAgent } from "./eth-sentiment-agent/agent";

/**
 * Creates and configures the root agent for the simple agent demonstration.
 *
 * This agent serves as the main orchestrator that routes user requests to
 * specialized sub-agents based on the request type. It demonstrates the
 * basic ADK pattern of using a root agent to coordinate multiple specialized
 * agents for different domains (jokes and weather).
 *
 * @returns The fully constructed root agent instance ready to process requests
 */
export const getRootAgent = async () => {
	const ethPriceAgent = getEthPriceAgent();
	const ethSentimentAgent = getEthSentimentAgent();

	return await AgentBuilder.create("root_agent")
		.withDescription(
			"Delegates tasks to sub-agents for Ethereum price and sentiment.",
		)
		.withInstruction("Check Ethereum price, then sentiment when asked.")
		.withModel(env.LLM_MODEL)
		.asParallel([ethSentimentAgent, ethPriceAgent])
		.withQuickSession({
			state: {
				headlines: "",
				price: "",
				sentiment: "",
			},
		})
		.build();
};
