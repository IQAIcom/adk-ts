import { randomUUID } from "node:crypto";
import { env } from "node:process";
import {
	AgentBuilder,
	InMemorySessionService,
	LangfusePlugin,
	createTool,
	telemetryService,
} from "@iqai/adk";
import dedent from "dedent";
import { z } from "zod";
import { ask } from "../utils";

const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({ city: z.string() }),
	fn: async ({ city }) => `The weather in ${city} is sunny and 72°F`,
});

async function demonstrateTelemetryService() {
	console.log("🔭 Part 1: Telemetry Service (Langfuse OTLP)\n");

	if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
		console.log(
			"⚠️  Skipping: Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY\n",
		);
		return;
	}

	try {
		const langfuseHost = env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
		const authString = Buffer.from(
			`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		await telemetryService.initialize({
			appName: "simple-weather-agent",
			otlpEndpoint: `${langfuseHost}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
			enableTracing: true,
			enableMetrics: true,
		});

		const { runner } = await AgentBuilder.create("weather_agent")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withTools(getWeatherTool)
			.withInstruction("You help users check the weather.")
			.build();

		const response = await runner.ask("What's the weather in San Francisco?");
		console.log(`🤖 Response: ${response}\n`);
		console.log(`📊 View traces at: ${langfuseHost}\n`);

		await telemetryService.shutdown(5000);
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

async function demonstrateLangfusePlugin() {
	console.log("🔌 Part 2: Langfuse Plugin\n");

	if (!env.DEV_LANGFUSE_PUBLIC_KEY || !env.DEV_LANGFUSE_SECRET_KEY) {
		console.log(
			"⚠️  Skipping: Set DEV_LANGFUSE_PUBLIC_KEY and DEV_LANGFUSE_SECRET_KEY\n",
		);
		return;
	}

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
			context.state.set("lastCountry", { country, capital, population });
			return { success: true, message: `Saved information about ${country}` };
		},
	});

	const langfusePlugin = new LangfusePlugin({
		name: "country-facts-agent",
		publicKey: env.DEV_LANGFUSE_PUBLIC_KEY,
		secretKey: env.DEV_LANGFUSE_SECRET_KEY,
		baseUrl: env.LANGFUSE_BASEURL,
	});

	const sessionService = new InMemorySessionService();

	const { runner } = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	)
		.withDescription("Country facts assistant with memory")
		.withInstruction(
			dedent`
			You answer questions about countries.
			If you provide country details, save them using the save_country_info tool.
		`,
		)
		.withOutputSchema(outputSchema)
		.withTools(saveCountryTool)
		.withSessionService(sessionService, { state: { lastCountry: null } })
		.withQuickSession({
			sessionId: randomUUID(),
			appName: "country-facts-demo",
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
		👥 Population: ${response.population ? response.population.toLocaleString() : "N/A"}
		🎉 Fun fact:   ${response.fun_fact}
		`,
	);

	await ask(runner, "What country did you last save? Use your memory.", true);
}

async function main() {
	console.log("🔭 Observability and Plugins\n");

	await demonstrateTelemetryService();
	await demonstrateLangfusePlugin();

	console.log("\n✅ Complete! All 8 examples finished.\n");
}

main().catch(console.error);
