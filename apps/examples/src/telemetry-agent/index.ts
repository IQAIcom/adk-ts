import { env } from "node:process";
import { AgentBuilder, type EnhancedRunner, TelemetryService } from "@iqai/adk";

const APP_NAME = "telemetry-example";

function validateTelemetryEnvironment(): boolean {
	const hasLangfuseKeys = env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY;

	if (!hasLangfuseKeys) {
		console.log("⚠️  Note: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY not set");
		console.log("   Telemetry will use default configuration");
		return false;
	}

	return true;
}

/**
 * Initializes the global telemetry service if external configuration is available
 */
function initializeTelemetryService(): void {
	const hasExternalTelemetry = validateTelemetryEnvironment();

	if (hasExternalTelemetry) {
		console.log("📊 Configuring external telemetry with Langfuse...");
		const telemetryService = new TelemetryService();

		const authString = Buffer.from(
			`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`,
		).toString("base64");

		telemetryService.initialize({
			appName: APP_NAME,
			appVersion: "1.0.0",
			otlpEndpoint: `${env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"}/api/public/otel/v1/traces`,
			otlpHeaders: {
				Authorization: `Basic ${authString}`,
			},
		});

		console.log("✅ Telemetry initialized with Langfuse");
	} else {
		console.log("📊 Using default telemetry configuration...");
		console.log("✅ Telemetry ready (automatic tracing enabled)");
	}
}

async function main() {
	console.log("📈 Starting Telemetry Agent example...");

	try {
		/**
		 * Initialize telemetry service for monitoring
		 * This enables automatic tracing for all agent interactions
		 */
		initializeTelemetryService();

		/**
		 * Create agent using AgentBuilder
		 * All agent interactions will be automatically traced by the framework
		 */
		const { runner } = await AgentBuilder.create("telemetry_assistant")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("An assistant with automatic telemetry tracking")
			.withInstruction(`You are a helpful assistant with automatic telemetry tracking enabled.
Provide detailed and informative responses to user questions.
Your interactions are being monitored for performance and quality automatically.`)
			.build();

		/**
		 * Demonstrate telemetry-enabled agent interactions
		 * Each interaction will be automatically tracked and measured by the framework
		 */
		await demonstrateTrackedInteractions(runner);
		await demonstratePerformanceMonitoring(runner);

		console.log("\n✅ Telemetry Agent example completed!");
	} catch (error) {
		console.error("❌ Error in telemetry agent example:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates tracked agent interactions with automatic telemetry
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateTrackedInteractions(
	runner: EnhancedRunner,
): Promise<void> {
	console.log("\n=== Tracked Interactions ===");

	/**
	 * Interaction 1: Simple question
	 */
	console.log("\n--- Tracked Interaction 1 ---");
	const startTime1 = Date.now();

	const response1 = await runner.ask("What is machine learning?");

	const duration1 = Date.now() - startTime1;
	console.log("👤 User: What is machine learning?");
	console.log("🤖 Agent:", response1);
	console.log(`⏱️  Response time: ${duration1}ms`);

	/**
	 * Interaction 2: Complex question
	 */
	console.log("\n--- Tracked Interaction 2 ---");
	const startTime2 = Date.now();

	const response2 = await runner.ask(
		"Explain the differences between supervised and unsupervised learning, with examples",
	);

	const duration2 = Date.now() - startTime2;
	console.log(
		"👤 User: Explain the differences between supervised and unsupervised learning, with examples",
	);
	console.log("🤖 Agent:", response2);
	console.log(`⏱️  Response time: ${duration2}ms`);

	/**
	 * Interaction 3: Follow-up question
	 */
	console.log("\n--- Tracked Interaction 3 ---");
	const startTime3 = Date.now();

	const response3 = await runner.ask(
		"Can you give me a practical example of how I could use machine learning in my business?",
	);

	const duration3 = Date.now() - startTime3;
	console.log(
		"👤 User: Can you give me a practical example of how I could use machine learning in my business?",
	);
	console.log("🤖 Agent:", response3);
	console.log(`⏱️  Response time: ${duration3}ms`);
}

/**
 * Demonstrates performance monitoring capabilities
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstratePerformanceMonitoring(
	runner: EnhancedRunner,
): Promise<void> {
	console.log("\n=== Performance Monitoring ===");

	/**
	 * Run multiple interactions to gather performance data
	 */
	const interactions = [
		"What is artificial intelligence?",
		"How does neural networks work?",
		"What are the applications of AI in healthcare?",
	];

	const performanceData: Array<{ query: string; duration: number }> = [];

	for (const [index, query] of interactions.entries()) {
		console.log(`\n--- Performance Test ${index + 1} ---`);

		const startTime = Date.now();
		const response = await runner.ask(query);
		const duration = Date.now() - startTime;

		performanceData.push({ query, duration });

		console.log(`👤 User: ${query}`);
		console.log("🤖 Agent:", `${response.substring(0, 100)}...`);
		console.log(`⏱️  Duration: ${duration}ms`);
	}

	/**
	 * Display performance summary
	 */
	console.log("\n📊 Performance Summary:");
	const avgDuration =
		performanceData.reduce((sum, data) => sum + data.duration, 0) /
		performanceData.length;
	const minDuration = Math.min(...performanceData.map((data) => data.duration));
	const maxDuration = Math.max(...performanceData.map((data) => data.duration));

	console.log(`Average response time: ${avgDuration.toFixed(2)}ms`);
	console.log(`Fastest response: ${minDuration}ms`);
	console.log(`Slowest response: ${maxDuration}ms`);

	/**
	 * Log telemetry insights
	 */
	console.log("\n📈 Telemetry Insights:");
	console.log("- All interactions automatically tracked by the ADK framework");
	console.log("- Performance metrics collected at the framework level");
	console.log(
		"- Ready for analysis and optimization in observability platforms",
	);
	if (validateTelemetryEnvironment()) {
		console.log("- Traces sent to Langfuse for detailed analysis");
		console.log(
			`- Dashboard URL: ${env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"}`,
		);
	} else {
		console.log(
			"- Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY for external telemetry",
		);
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
