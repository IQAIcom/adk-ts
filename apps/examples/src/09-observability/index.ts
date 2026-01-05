import { env } from "node:process";
import {
	AgentBuilder,
	createTool,
	LlmAgent,
	telemetryService,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";

/**
 * 09 - Observability and Telemetry
 *
 * Comprehensive example showing nested agents, sub-agents, tools, and error handling with full telemetry.
 *
 * Concepts covered:
 * - Comprehensive telemetry setup (traces + metrics)
 * - Automatic tracking of nested agent interactions
 * - Tool usage monitoring with metrics
 * - LLM call tracking with token usage
 * - Privacy controls for sensitive data
 * - Integration with Jaeger (local) or Langfuse (cloud)
 *
 * Quick Start:
 * Option 1 - Local development with Jaeger:
 * 1. docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest
 * 2. pnpm run dev --name 09-observability
 * 3. View traces at http://localhost:16686
 *
 * Option 2 - Cloud observability with Langfuse:
 * 1. Set environment variables:
 *    export LANGFUSE_PUBLIC_KEY="pk-..."
 *    export LANGFUSE_SECRET_KEY="sk-..."
 *    export LANGFUSE_BASE_URL="https://cloud.langfuse.com" (optional)
 * 2. pnpm run dev --name 09-observability
 * 3. View traces at https://cloud.langfuse.com
 */

// === TOOLS (automatically traced) ===
const searchDatabaseTool = createTool({
	name: "search_database",
	description: "Search customer database for flight bookings",
	schema: z.object({ customerId: z.string() }),
	fn: async ({ customerId }) => {
		await new Promise((r) => setTimeout(r, 200));
		return JSON.stringify({
			id: customerId,
			name: "John Doe",
			upcomingFlights: ["NYC→LAX on Mar 15", "LAX→SFO on Mar 20"],
		});
	},
});

const checkWeatherTool = createTool({
	name: "check_weather",
	description: "Check weather forecast for a location",
	schema: z.object({ location: z.string(), days: z.number().default(5) }),
	fn: async ({ location, days }) => {
		await new Promise((r) => setTimeout(r, 300));
		if (location.toLowerCase().includes("unknown")) {
			throw new Error(`Weather service unavailable for ${location}`);
		}
		return `${location} forecast (${days} days): Sunny 22°C → Cloudy 18°C → Rainy 15°C`;
	},
});

const sendNotificationTool = createTool({
	name: "send_notification",
	description: "Send notification to customer",
	schema: z.object({ message: z.string(), priority: z.enum(["low", "high"]) }),
	fn: async ({ message, priority }) => {
		await new Promise((r) => setTimeout(r, 150));
		return `✓ ${priority.toUpperCase()} priority notification sent: ${message.slice(0, 50)}`;
	},
});

/**
 * Initialize telemetry with comprehensive configuration
 * Supports multiple backends: Jaeger (local), Langfuse (cloud), or any OTLP backend
 */
async function initializeTelemetryService() {
	// Check if Langfuse credentials are available
	const useLangfuse = !!(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);

	if (useLangfuse) {
		// Option 1: Cloud backend (Langfuse)
		console.log("🔍 Initializing telemetry with Langfuse...");

		const langfuseHost =
			env.LANGFUSE_BASE_URL ||
			env.LANGFUSE_HOST ||
			"https://cloud.langfuse.com";
		const authString = Buffer.from(
			`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		await telemetryService.initialize({
			appName: "travel-assistant",
			appVersion: "1.0.0",
			otlpEndpoint: `${langfuseHost}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
			environment: env.NODE_ENV || "production",
			enableTracing: true,
			enableMetrics: true,
			enableAutoInstrumentation: true,
			captureMessageContent: false, // Privacy for production
			samplingRatio: 1.0,
			metricExportIntervalMs: 30000,
			resourceAttributes: {
				"service.instance.id": `travel-assistant-${Date.now()}`,
			},
		});

		console.log("✅ Telemetry initialized with Langfuse");
		console.log(`📊 View traces at: ${langfuseHost}\n`);
	} else {
		// Option 2: Local development with Jaeger (default)
		console.log("🔍 Initializing telemetry with Jaeger (local)...");

		await telemetryService.initialize({
			appName: "travel-assistant",
			appVersion: "1.0.0",
			otlpEndpoint: "http://localhost:4318/v1/traces",
			environment: env.NODE_ENV || "development",
			enableTracing: true,
			enableMetrics: false, // Jaeger doesn't support metrics endpoint
			enableAutoInstrumentation: true,
			captureMessageContent: true, // Full visibility for development
			samplingRatio: 1.0,
			resourceAttributes: {
				"service.instance.id": `travel-assistant-${Date.now()}`,
			},
		});

		console.log("✅ Telemetry initialized with Jaeger");
		console.log("📊 View traces at: http://localhost:16686");
		console.log("   Select service: 'travel-assistant'\n");
	}

	return useLangfuse;
}

async function main() {
	console.log("=".repeat(70));
	console.log(
		"🔭 Observability Example - Nested Agents & Comprehensive Tracing",
	);
	console.log("=".repeat(70));
	console.log();

	try {
		// Initialize telemetry system
		const useLangfuse = await initializeTelemetryService();

		// === SUB-AGENT 1: Weather Specialist (using LlmAgent) ===
		const weatherAgent = new LlmAgent({
			name: "weather_specialist",
			description: "Provides weather forecasts and travel weather advice",
			model: env.LLM_MODEL || "gemini-2.0-flash-exp",
			tools: [checkWeatherTool],
			instruction: "Check weather and provide brief travel advice. Be concise.",
		});

		// === SUB-AGENT 2: Customer Service (using LlmAgent) ===
		const customerAgent = new LlmAgent({
			name: "customer_service",
			description: "Handles customer queries and notifications",
			model: env.LLM_MODEL || "gemini-2.0-flash-exp",
			tools: [searchDatabaseTool, sendNotificationTool],
			instruction: dedent`
				Search customer data and send notifications.
				Always confirm actions taken. Keep responses under 2 sentences.
			`,
		});

		// === MAIN ORCHESTRATOR AGENT (uses sub-agents) ===
		const { runner: orchestrator } = await AgentBuilder.create(
			"travel_orchestrator",
		)
			.withModel(env.LLM_MODEL || "gemini-2.0-flash-exp")
			.withDescription(
				"Main travel assistant orchestrating specialized sub-agents",
			)
			.withSubAgents([weatherAgent, customerAgent])
			.withInstruction(
				dedent`
				You coordinate travel assistance by delegating to specialist agents:
				- Weather queries → transfer to weather_specialist
				- Customer/booking queries → transfer to customer_service
				Summarize results clearly. Be concise.
			`,
			)
			.build();

		console.log("🤖 Agents created: orchestrator + 2 sub-agents\n");
		console.log(
			"📊 Automatically traced: agent invocations, tool calls, LLM calls, sub-agent delegation\n",
		);

		if (useLangfuse) {
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

		console.log("-".repeat(70) + "\n");

		// === COMPLEX QUERY (triggers nested agent calls, multiple tools, error handling) ===
		console.log(
			"💬 Query: Help customer C123 with NYC flight + weather + notifications\n",
		);

		const result = await orchestrator.ask(
			"Customer C123 is flying to NYC. Check their bookings, get NYC weather forecast, " +
				"and send them a high priority notification with travel tips.",
		);

		console.log("✅ Response:", result.slice(0, 200), "...\n");

		// === TEST ERROR HANDLING (shows error traces) ===
		console.log("-".repeat(70) + "\n");
		console.log("💬 Testing error handling with invalid location...\n");

		try {
			await orchestrator.ask("What's the weather in UnknownCity123?");
		} catch (error) {
			console.log(
				"✓ Error handled and traced:",
				(error as Error).message,
				"\n",
			);
		}

		console.log("=".repeat(70));
		console.log("\n🔍 View traces in your observability platform:");

		if (useLangfuse) {
			const langfuseHost =
				env.LANGFUSE_BASE_URL ||
				env.LANGFUSE_HOST ||
				"https://cloud.langfuse.com";
			console.log(`   ${langfuseHost}`);
		} else {
			console.log("   http://localhost:16686");
			console.log("   Service: 'travel-assistant'");
		}

		console.log("\n📊 Trace shows:");
		console.log("   • Orchestrator → Sub-agent delegation");
		console.log(
			"   • Tool executions (search_database, check_weather, send_notification)",
		);
		console.log("   • LLM calls with token usage");
		console.log("   • Error spans with stack traces");
		console.log("   • Nested span hierarchy and timing");
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
			"   • Set captureMessageContent=false to disable content capture in production",
		);
		console.log(
			"   • Use samplingRatio < 1.0 to reduce overhead in high-traffic environments",
		);
		if (useLangfuse) {
			console.log("   • Metrics export every 30 seconds to Langfuse");
		}
		console.log();
	} catch (error) {
		console.error("❌ Fatal error:", error);
		telemetryService.recordError("agent", "travel_orchestrator");
	} finally {
		console.log("🔄 Shutting down telemetry...");
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry flushed and shutdown complete");
	}
}

main().catch(console.error);
