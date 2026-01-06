import { env } from "node:process";
import { telemetryService } from "@iqai/adk";
import { z } from "zod";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

const langfuseEnvSchema = z.object({
	LANGFUSE_PUBLIC_KEY: z.string().min(1, "LANGFUSE_PUBLIC_KEY is required"),
	LANGFUSE_SECRET_KEY: z.string().min(1, "LANGFUSE_SECRET_KEY is required"),
	LANGFUSE_BASE_URL: z
		.url()
		.default("https://cloud.langfuse.com")
		.optional()
		.transform((val) => val || "https://cloud.langfuse.com"),
});

async function main() {
	try {
		// Parse and validate environment variables
		const config = langfuseEnvSchema.parse({
			LANGFUSE_PUBLIC_KEY: env.LANGFUSE_PUBLIC_KEY,
			LANGFUSE_SECRET_KEY: env.LANGFUSE_SECRET_KEY,
			LANGFUSE_BASE_URL: env.LANGFUSE_BASE_URL,
		});

		const authString = Buffer.from(
			`${config.LANGFUSE_PUBLIC_KEY}:${config.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		console.log("🔍 Initializing Langfuse telemetry...");

		await telemetryService.initialize({
			appName: "simple-weather-agent",
			otlpEndpoint: `${config.LANGFUSE_BASE_URL}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
			enableTracing: true,
			enableMetrics: true,
		});

		console.log("✅ Telemetry initialized\n");

		const { runner } = await getRootAgent();

		await ask(runner, "What's the weather in San Francisco?");
	} catch (error) {
		console.error("❌ Error:", error);
	} finally {
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry shutdown complete");
	}
}

main().catch(console.error);
