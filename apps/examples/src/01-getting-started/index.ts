import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

async function demonstrateBasicAgent() {
	console.log("🤖 Basic Agent\n");

	const { runner } = await AgentBuilder.create("basic_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction(
			"You are a helpful assistant that answers questions concisely.",
		)
		.build();

	await ask(runner, "What is the capital of France?");
	await ask(runner, "What are three interesting facts about it?");
}

async function demonstrateStructuredOutput() {
	console.log("\n📋 Structured Output\n");

	const outputSchema = z.object({
		capital: z.string().describe("The capital city name"),
		country: z.string().describe("The country name"),
		population: z
			.number()
			.optional()
			.describe("Population of the capital city"),
		fun_fact: z.string().describe("An interesting fact about the city"),
	});

	const { runner } = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	)
		.withOutputSchema(outputSchema)
		.build();

	const response = await ask(runner, "What is the capital of Japan?", true);

	console.log(
		dedent`
		🌍 Country:    ${response.country}
		📍 Capital:    ${response.capital}
		👥 Population: ${response.population ? response.population.toLocaleString() : "N/A"}
		🎉 Fun fact:   ${response.fun_fact}
		`,
	);
}

async function main() {
	console.log("🚀 Getting Started with ADK\n");
	await demonstrateBasicAgent();
	await demonstrateStructuredOutput();
	console.log("\n✅ Complete! Next: 02-tools-and-state\n");
}

main().catch(console.error);
