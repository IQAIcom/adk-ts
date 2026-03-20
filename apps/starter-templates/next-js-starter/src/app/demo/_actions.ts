"use server";

import { getRootAgent } from "@/agents";

export async function askAgent(message: string) {
	const { runner } = await getRootAgent();
	const result = await runner.ask(message);
	return result;
}
