import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

/**
 * 01 - Simple Agent
 *
 * The simplest way to create and use an AI agent.
 *
 * Concepts covered:
 * - Basic AgentBuilder usage
 * - Model configuration
 * - Simple question-answer interaction
 * - Structured output with Zod schemas
 */
async function main() {
	console.log("🤖 Simple agent with structured output:");

	// Define the expected output structure
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

	const response = await ask(runner, "What is the capital of France?", true);

	console.log(
		dedent`
		🌍 Country:    ${response.country}
		📍 Capital:    ${response.capital}
		👥 Population: ${
			response.population ? response.population.toLocaleString() : "N/A"
		}
		🎉 Fun fact:   ${response.fun_fact}`,
	);
}

main().catch(console.error);
