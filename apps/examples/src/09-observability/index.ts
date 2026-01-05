import { env } from "node:process";
import { AgentBuilder, createTool, telemetryService } from "@iqai/adk";
import * as z from "zod";

/**
 * 09 - Observability with Langfuse
 *
 * Simple example showing how to track agent interactions with Langfuse.
 *
 * Setup:
 * 1. Set environment variables:
 *    export LANGFUSE_PUBLIC_KEY="pk-..."
 *    export LANGFUSE_SECRET_KEY="sk-..."
 *    export LANGFUSE_BASE_URL="https://cloud.langfuse.com" (optional)
 * 2. pnpm run dev --name 09-observability
 * 3. View traces at https://cloud.langfuse.com
 */

const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({ city: z.string() }),
	fn: async ({ city }) => {
		return `The weather in ${city} is sunny and 72°F`;
	},
});

async function main() {
	console.log("🔭 Simple Langfuse Observability Example\n");

	if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
		console.error("❌ Error: Missing Langfuse credentials");
		console.log("Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY");
		return;
	}

	try {
		const langfuseHost = env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
		const authString = Buffer.from(
			`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		console.log("🔍 Initializing Langfuse telemetry...");

		await telemetryService.initialize({
			appName: "simple-weather-agent",
			otlpEndpoint: `${langfuseHost}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
			enableTracing: true,
			enableMetrics: true,
		});

		console.log("✅ Telemetry initialized\n");

		const { runner } = await AgentBuilder.create("weather_agent")
			.withModel(env.LLM_MODEL || "gemini-2.0-flash-exp")
			.withTools(getWeatherTool)
			.withInstruction("You help users check the weather.")
			.build();

		console.log("💬 Asking: What's the weather in San Francisco?\n");

		const response = await runner.ask("What's the weather in San Francisco?");

		console.log("✅ Response:", response, "\n");
		console.log(`📊 View traces at: ${langfuseHost}`);
	} catch (error) {
		console.error("❌ Error:", error);
	} finally {
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry shutdown complete");
	}
}

main().catch(console.error);
