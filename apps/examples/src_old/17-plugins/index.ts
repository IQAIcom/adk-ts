import { randomUUID } from "node:crypto";
import { env } from "node:process";
import {
	AgentBuilder,
	createTool,
	InMemorySessionService,
	LangfusePlugin,
} from "@iqai/adk";
import { openrouter } from "@openrouter/ai-sdk-provider";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

/**
 * Simple Agent with:
 * - Langfuse plugin
 * - Tools
 * - State management
 * - Structured output
 */

const outputSchema = z.object({
	country: z.string(),
	capital: z.string(),
	population: z.number().optional(),
	fun_fact: z.string(),
});

const saveCountryTool = createTool({
	name: "save_country_info",
	description: "Save country information to agent state",
	schema: z.object({
		country: z.string(),
		capital: z.string(),
		population: z.number().optional(),
	}),
	fn: ({ country, capital, population }, context) => {
		context.state.set("lastCountry", {
			country,
			capital,
			population,
		});

		return {
			success: true,
			message: `Saved information about ${country}`,
		};
	},
});

const viewLastCountryTool = createTool({
	name: "view_last_country",
	description: "View the last saved country information",
	schema: z.object({}),
	fn: (_, context) => {
		const data = context.state.get("lastCountry", null);

		return data
			? { found: true, ...data }
			: { found: false, message: "No country saved yet" };
	},
});

async function main() {
	console.log("🤖 Agent with plugin + tools + structured output:");

	if (!env.DEV_LANGFUSE_PUBLIC_KEY || !env.DEV_LANGFUSE_SECRET_KEY) {
		throw new Error("Langfuse environment variables must be set.");
	}

	const langfusePlugin = new LangfusePlugin({
		name: "simple-agent-with-tools",
		publicKey: env.DEV_LANGFUSE_PUBLIC_KEY!,
		secretKey: env.DEV_LANGFUSE_SECRET_KEY!,
		baseUrl: env.LANGFUSE_BASEURL,
	});

	const sessionService = new InMemorySessionService();

	const { runner } = await AgentBuilder.withModel(
		openrouter("openai/gpt-4.1-mini"),
	)
		.withDescription("Country facts assistant with memory")
		.withInstruction(
			dedent`
			You answer questions about countries.

			If you provide country details, save them using the save_country_info tool.
			You can recall previously saved country data if asked.
		`,
		)
		.withOutputSchema(outputSchema)
		.withTools(saveCountryTool, viewLastCountryTool)
		.withSessionService(sessionService, {
			state: { lastCountry: null },
		})
		.withQuickSession({
			sessionId: randomUUID(),
			appName: "simple-agent-tools-demo",
		})
		.withPlugins(langfusePlugin)
		.build();

	const response = await ask(
		runner,
		"What is the capital of France? Include population and a fun fact.",
		true,
	);

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

	const secondResponse = await ask(
		runner,
		"What country did you last save? Use your memory.",
		true,
	);

	console.log(dedent`${JSON.stringify(secondResponse)}`);
}

main().catch(console.error);
