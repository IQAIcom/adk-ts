import { createSamplingHandler } from "@iqai/adk";
import { getRootAgent } from "./agents/agent";
import { getNameAgent } from "./agents/name-agent/agent";

async function main() {
	const { runner } = await getNameAgent();
	const samplingHandler = createSamplingHandler(runner.ask);
	const rootAgent = await getRootAgent(samplingHandler);

	rootAgent.runner.ask("Great user");
	rootAgent.runner.ask("What is the price of bitcoin?");
}

main().catch(console.error);
