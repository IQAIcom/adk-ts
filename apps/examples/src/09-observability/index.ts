import { env } from "node:process";
import {
	AgentBuilder,
	LlmAgent,
	createTool,
	telemetryService,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";

/**
 * 09 - Observability and Telemetry
 *
 * Comprehensive example showing nested agents, sub-agents, tools, and error handling with full telemetry.
 *
 * Quick Start:
 * 1. docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest
 * 2. pnpm run dev --name 09-observability
 * 3. View traces at http://localhost:16686
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

async function main() {
	console.log(
		"🔭 Observability Example - Nested Agents & Comprehensive Tracing\n",
	);

	try {
		// Initialize telemetry
		await telemetryService.initialize({
			appName: "travel-assistant",
			appVersion: "1.0.0",
			otlpEndpoint: "http://localhost:4318/v1/traces",
			enableTracing: true,
			enableMetrics: false,
			captureMessageContent: true,
			samplingRatio: 1.0,
		});

		console.log("✅ Telemetry initialized → http://localhost:16686\n");

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
			"📊 Tracing: agent invocations, tool calls, LLM calls, sub-agent delegation\n",
		);
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
		console.log("\n🔍 View in Jaeger: http://localhost:16686");
		console.log("   Service: 'travel-assistant'");
		console.log("\n📊 Trace shows:");
		console.log("   • Orchestrator → Sub-agent delegation");
		console.log(
			"   • Tool executions (search_database, check_weather, send_notification)",
		);
		console.log("   • LLM calls with token usage");
		console.log("   • Error spans with stack traces");
		console.log("   • Nested span hierarchy and timing\n");
	} catch (error) {
		console.error("❌ Fatal error:", error);
		telemetryService.recordError("agent", "travel_orchestrator");
	} finally {
		await telemetryService.shutdown(5000);
		console.log("✅ Telemetry flushed and shutdown complete");
	}
}

main().catch(console.error);
