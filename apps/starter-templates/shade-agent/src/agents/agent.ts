import { AgentBuilder } from "@iqai/adk";
// Root agent need not impose its own schema; sub-agents produce structured output
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
export const getRootAgent = () => {
	const ethPriceAgent = getEthPriceAgent();
	const ethSentimentAgent = getEthSentimentAgent();

	return AgentBuilder.create("root_agent")
		.withDescription(
			"Root agent that delegates tasks to sub-agents for fetching Ethereum price and sentiment information.",
		)
		.withInstruction(
			"Use the ETH price sub-agent for price requests and the ETH sentiment sub-agent for sentiment-related queries. Route user requests to the appropriate sub-agent.",
		)
		.withModel(env.LLM_MODEL)
		.asSequential([ethPriceAgent, ethSentimentAgent])
		.build();
};
