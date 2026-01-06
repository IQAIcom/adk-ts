import { createSamplingHandler } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";
import { getNameAgent } from "./agents/name-agent/agent";

async function main() {
	const { runner: nameRunner } = await getNameAgent();
	const samplingHandler = createSamplingHandler(nameRunner.ask);
	const { runner: rootRunner } = await getRootAgent(samplingHandler);

	ask(rootRunner, "Great user");
	ask(rootRunner, "What is the price of bitcoin?");
}

main().catch(console.error);
