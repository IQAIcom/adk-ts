"use server";

import { getRootAgent } from "@/agents";

let agentRunner: Awaited<ReturnType<typeof getRootAgent>>["runner"];

async function getAgentRunner() {
	if (!agentRunner) {
		const { runner } = await getRootAgent();
		agentRunner = runner;
	}
	return agentRunner;
}

export async function askAgent(message: string) {
	const runner = await getAgentRunner();
	const result = await runner.ask(message);
	return result;
}
