import { env } from "node:process";
import { telemetryService } from "@iqai/adk";
import { z } from "zod";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 08. Observability and Plugins
 *
 * This example demonstrates how to add visibility into your agent's execution using OpenTelemetry (OTLP).
 *
 * Concepts covered:
 * 1. Telemetry Initialization: We use `telemetryService.initialize()` to configure the OTLP exporter.
 * 2. Langfuse Integration: This specific example shows how to connect to Langfuse, but ADK-TS works with any OTLP-compatible observability platform (Jaeger, Honeycomb, etc.).
 * 3. Tracing & Metrics: By enabling `enableTracing` and `enableMetrics`, you automatically capture agent thoughts, tool calls, and performance data.
 *
 * Note: For this example we will be using https://langfuse.com, So you need `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` in your environment to run this full example, but the pattern applies to any OTLP backend.
 *
 */
async function main() {
	await setupLangfuseTelementry();

	const { runner } = await getRootAgent();

	await ask(runner, "What's the weather in San Francisco?");
}

async function setupLangfuseTelementry() {
	const config = z
		.object({
			LANGFUSE_PUBLIC_KEY: z.string().min(1, "LANGFUSE_PUBLIC_KEY is required"),
			LANGFUSE_SECRET_KEY: z.string().min(1, "LANGFUSE_SECRET_KEY is required"),
			LANGFUSE_BASE_URL: z.string().url().default("https://cloud.langfuse.com"),
		})
		.parse({
			LANGFUSE_PUBLIC_KEY: env.LANGFUSE_PUBLIC_KEY,
			LANGFUSE_SECRET_KEY: env.LANGFUSE_SECRET_KEY,
			LANGFUSE_BASE_URL: env.LANGFUSE_BASE_URL,
		});

	await telemetryService.initialize({
		appName: "simple-weather-agent",
		otlpEndpoint: `${config.LANGFUSE_BASE_URL}/api/public/otel/v1/traces`,
		otlpHeaders: {
			Authorization: `Basic ${Buffer.from(`${config.LANGFUSE_PUBLIC_KEY}:${config.LANGFUSE_SECRET_KEY}`).toString("base64")}`,
		},
		enableTracing: true,
		enableMetrics: true,
	});
}

main()
	.catch(console.error)
	.finally(async () => {
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry shutdown complete");
	});
