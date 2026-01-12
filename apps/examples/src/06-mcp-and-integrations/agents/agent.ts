import { AgentBuilder, SamplingHandler } from "@iqai/adk";
import { getCoingeckoTools, getGreetingTools } from "./tools";

export async function getRootAgent(samplingHandler: SamplingHandler) {
	const greetingTools = await getGreetingTools(samplingHandler);
	const coingeckoTools = await getCoingeckoTools();

	return AgentBuilder.withModel(
		process.env.LLM_MODEL || "gemini-3-flash-preview",
	)
		.withTools(...greetingTools, ...coingeckoTools)
		.build();
}
