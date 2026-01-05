import { AgentBuilder, LangfusePlugin, createTool } from "@iqai/adk";
import { z } from "zod";

const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({ city: z.string() }),
	fn: async ({ city }) => `The weather in ${city} is sunny and 72°F`,
});

export async function agent() {
	if (
		!process.env.DEV_LANGFUSE_PUBLIC_KEY ||
		!process.env.DEV_LANGFUSE_SECRET_KEY
	) {
		throw new Error("Langfuse environment variables must be set.");
	}

	const langfusePlugin = new LangfusePlugin({
		name: "observability-agent",
		publicKey: process.env.DEV_LANGFUSE_PUBLIC_KEY,
		secretKey: process.env.DEV_LANGFUSE_SECRET_KEY,
		baseUrl: process.env.LANGFUSE_BASEURL,
	});

	const { runner } = await AgentBuilder.create("weather_agent")
		.withModel("gemini-2.5-flash")
		.withTools(getWeatherTool)
		.withInstruction("You help users check the weather.")
		.withPlugins(langfusePlugin)
		.build();

	return runner;
}
