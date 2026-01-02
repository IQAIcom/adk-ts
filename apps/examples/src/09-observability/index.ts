import { env } from "node:process";
import { AgentBuilder, createTool, telemetryService } from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";
import { ask } from "../utils";

/**
 * 09 - Observability and Telemetry
 *
 * Learn how to monitor your AI agents with comprehensive OpenTelemetry integration.
 *
 * Concepts covered:
 * - Comprehensive telemetry setup (traces + metrics)
 * - Automatic tracking of agent interactions
 * - Tool usage monitoring with metrics
 * - LLM call tracking with token usage
 * - Privacy controls for sensitive data
 * - Integration with Jaeger, Langfuse, or any OTLP backend
 *
 * Quick Start:
 * 1. Start Jaeger (local development):
 *    docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest
 *
 * 2. Run this example:
 *    pnpm run dev --name 09-observability
 *
 * 3. View traces at http://localhost:16686
 */

// Weather tool - automatically traced with detailed metrics
const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a location",
	schema: z.object({
		location: z.string().describe("The city and state/country"),
	}),
	fn: async ({ location }) => {
		// Simulate weather API call with realistic delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		const weather = ["sunny", "cloudy", "rainy", "snowy"];
		const temp = Math.floor(Math.random() * 30) + 10;
		const condition = weather[Math.floor(Math.random() * weather.length)];

		return `The weather in ${location} is ${condition} with a temperature of ${temp}°C`;
	},
});

// Forecast tool - demonstrates multiple tool calls
const getForecastTool = createTool({
	name: "get_forecast",
	description: "Get 5-day weather forecast for a location",
	schema: z.object({
		location: z.string().describe("The city and state/country"),
	}),
	fn: async ({ location }) => {
		await new Promise((resolve) => setTimeout(resolve, 500));

		return `5-day forecast for ${location}:\n- Day 1: Sunny, 25°C\n- Day 2: Cloudy, 22°C\n- Day 3: Rainy, 18°C\n- Day 4: Partly cloudy, 23°C\n- Day 5: Sunny, 26°C`;
	},
});

/**
 * Initialize telemetry with comprehensive configuration
 * Supports multiple backends: Jaeger (local), Langfuse, Datadog, New Relic, etc.
 */
async function initializeTelemetryService() {
	// Option 1: Local development with Jaeger (default)
	// Start Jaeger: docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest
	const useJaeger = !env.LANGFUSE_PUBLIC_KEY;

	if (useJaeger) {
		console.log("🔍 Initializing telemetry with Jaeger (local)...");
		await telemetryService.initialize({
			appName: "observability-example",
			appVersion: "1.0.0",
			otlpEndpoint: "http://localhost:4318/v1/traces",
			environment: env.NODE_ENV || "development",

			// Enable features (Jaeger only supports traces, not metrics)
			enableTracing: true,
			enableMetrics: false, // Jaeger doesn't support metrics endpoint
			enableAutoInstrumentation: true,

			// Privacy: disable content capture for production
			captureMessageContent: true, // Set to false in production

			// Performance tuning
			samplingRatio: 1.0, // 100% sampling for development
			metricExportIntervalMs: 30000, // 30 seconds

			// Custom resource attributes
			resourceAttributes: {
				"service.instance.id": `example-${Date.now()}`,
			},
		});

		console.log("✅ Telemetry initialized");
		console.log("📊 View traces at: http://localhost:16686");
		console.log("   Select service: 'observability-example'\n");
	} else {
		// Option 2: Cloud backend (Langfuse)
		console.log("🔍 Initializing telemetry with Langfuse...");

		const langfuseHost =
			env.LANGFUSE_BASE_URL ||
			env.LANGFUSE_HOST ||
			"https://cloud.langfuse.com";
		const authString = Buffer.from(
			`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		await telemetryService.initialize({
			appName: "observability-example",
			appVersion: "1.0.0",
			otlpEndpoint: `${langfuseHost}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
			environment: "production",
			enableTracing: true,
			enableMetrics: true,
			captureMessageContent: false, // Privacy for production
		});

		console.log("✅ Telemetry initialized with Langfuse");
		console.log(`📊 View traces at: ${langfuseHost}\n`);
	}

	return useJaeger;
}

async function main() {
	console.log("=".repeat(60));
	console.log("🔭 Observability Example - Comprehensive Telemetry");
	console.log("=".repeat(60));
	console.log();

	try {
		// Initialize telemetry system
		const useJaeger = await initializeTelemetryService();

		// Create weather agent with automatic telemetry
		const { runner } = await AgentBuilder.create("weather_agent")
			.withModel(env.LLM_MODEL || "gemini-2.0-flash-exp")
			.withDescription(
				"A weather assistant with comprehensive telemetry tracking",
			)
			.withTools(getWeatherTool, getForecastTool)
			.withInstruction(
				dedent`
				You are a helpful weather assistant. When users ask about weather:
				- Use get_weather tool for current conditions
				- Use get_forecast tool for multi-day forecasts
				- Be friendly and provide helpful tips based on the weather
			`,
			)
			.build();

		console.log("🤖 Agent created with telemetry enabled");
		console.log();
		console.log("📊 The following will be automatically traced:");
		console.log("   • Agent invocations (duration, status)");
		console.log("   • Tool executions (args, results, duration)");
		console.log("   • LLM calls (tokens, model, parameters)");
		console.log("   • HTTP requests (auto-instrumented)");
		console.log();

		if (!useJaeger) {
			console.log("📈 Metrics collected:");
			console.log("   • adk.agent.invocations (counter)");
			console.log("   • adk.agent.duration (histogram)");
			console.log("   • adk.tool.executions (counter)");
			console.log("   • adk.tool.duration (histogram)");
			console.log("   • adk.llm.calls (counter)");
			console.log("   • adk.llm.tokens (histogram - input/output/total)");
			console.log();
		} else {
			console.log("ℹ️  Note: Metrics disabled (Jaeger only supports traces)");
			console.log();
		}

		console.log("-".repeat(60));
		console.log();

		// Example 1: Simple weather query (1 tool call)
		console.log("💬 Example 1: Current weather");
		await ask(runner, "What's the weather like in San Francisco?");
		console.log();

		// Example 2: Complex query (multiple tool calls)
		console.log("-".repeat(60));
		console.log();
		console.log("💬 Example 2: Weather + Forecast");
		await ask(
			runner,
			"Can you tell me the current weather in Tokyo and also give me the 5-day forecast?",
		);
		console.log();

		// Example 3: Query with reasoning (LLM-only, no tools)
		console.log("-".repeat(60));
		console.log();
		console.log("💬 Example 3: General advice");
		await ask(runner, "What should I pack for a trip to a rainy location?");
		console.log();

		console.log("=".repeat(60));
		console.log();
		console.log("✅ Examples complete!");
		console.log();
		console.log("🔍 What to explore in your traces:");
		console.log("   1. Agent hierarchy and execution flow");
		console.log("   2. Tool call details (arguments, responses, timing)");
		console.log("   3. LLM interactions (prompts, completions, token counts)");
		console.log("   4. Auto-instrumented HTTP calls to LLM APIs");
		console.log("   5. Performance metrics and latencies");
		console.log();
		console.log("📊 Trace attributes to look for:");
		console.log("   • gen_ai.agent.name - Agent identification");
		console.log("   • gen_ai.tool.name - Tool names");
		console.log("   • gen_ai.operation.name - Operation types");
		console.log("   • gen_ai.request.model - LLM model used");
		console.log("   • gen_ai.usage.input_tokens - Input token count");
		console.log("   • gen_ai.usage.output_tokens - Output token count");
		console.log("   • adk.session.id - Session tracking");
		console.log();
		console.log("💡 Tips:");
		console.log(
			"   • Set ADK_CAPTURE_MESSAGE_CONTENT=false to disable content capture",
		);
		console.log(
			"   • Use samplingRatio < 1.0 to reduce overhead in production",
		);
		console.log("   • Metrics export every 30 seconds (configurable)");
		console.log();
		console.log("=".repeat(60));
	} catch (error) {
		console.error("❌ Error:", error);
		telemetryService.recordError("agent", "weather_agent");
	} finally {
		// Always shutdown gracefully to flush all telemetry
		console.log("\n🔄 Shutting down telemetry...");
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry shutdown complete");
	}
}

main().catch(console.error);
