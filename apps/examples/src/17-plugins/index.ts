import { randomUUID } from "node:crypto";
import { env } from "node:process";
import { AgentBuilder, LangfusePlugin } from "@iqai/adk";
import { openrouter } from "@openrouter/ai-sdk-provider";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

/**
 * 02 - Simple Agent with Plugin
 *
 * Concepts covered:
 * - AgentBuilder with plugins
 * - Langfuse observability
 * - Structured output (Zod)
 * - Single-step Q&A
 */
async function main() {
	console.log("🤖 Simple agent with plugin + structured output:");

	// Define structured output
	const outputSchema = z.object({
		capital: z.string(),
		country: z.string(),
		population: z.number().optional(),
		fun_fact: z.string(),
	});

	if (!env.DEV_LANGFUSE_PUBLIC_KEY || !env.DEV_LANGFUSE_SECRET_KEY) {
		throw new Error(
			"Langfuse environment variables DEV_LANGFUSE_PUBLIC_KEY and DEV_LANGFUSE_SECRET_KEY must be set to run this example.",
		);
	}

	const langfusePlugin = new LangfusePlugin({
		name: "simple-agent",
		publicKey: env.DEV_LANGFUSE_PUBLIC_KEY!,
		secretKey: env.DEV_LANGFUSE_SECRET_KEY!,
		baseUrl: env.LANGFUSE_BASEURL,
	});

	// Build agent
	const { runner } = await AgentBuilder.withModel(
		openrouter("openai/gpt-4.1-mini"),
	)
		.withOutputSchema(outputSchema)
		.withQuickSession({
			sessionId: randomUUID(),
			appName: "simple-agent-demo",
		})
		.withPlugins(langfusePlugin)
		.build();

	// Ask question
	const response = await ask(runner, "What is the capital of France?", true);

	console.log(
		dedent`
		🌍 Country:    ${response.country}
		📍 Capital:    ${response.capital}
		👥 Population: ${
			response.population ? response.population.toLocaleString() : "N/A"
		}
		🎉 Fun fact:   ${response.fun_fact}
		`,
	);
}

main().catch(console.error);
