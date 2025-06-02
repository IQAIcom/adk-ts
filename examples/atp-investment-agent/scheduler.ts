import { GoogleLLM, LLMRegistry } from "@adk";
import * as dotenv from "dotenv";
import { AtpScheduler, type AtpSchedulerConfig } from "./services";

dotenv.config();
LLMRegistry.registerLLM(GoogleLLM);

/**
 * ATP Investment Agent Scheduler
 * Runs the investment workflow on a scheduled basis using node-cron
 */

// Configuration
const cronSchedule = process.env.ATP_CRON_SCHEDULE || "0 */3 * * *"; // Every 3 hours
const dryRun = process.env.ATP_DRY_RUN === "true" || false;
const debug = process.env.DEBUG === "true" || false;

async function main() {
	console.log("🕐 ATP Investment Agent Scheduler");
	console.log("==================================");
	console.log(`⏰ Schedule: ${cronSchedule} (every 3 hours)`);
	console.log(`🧪 Dry Run: ${dryRun ? "ENABLED" : "DISABLED"}`);
	console.log(`🔧 Debug: ${debug ? "ENABLED" : "DISABLED"}`);
	console.log("==================================");

	// Environment variables are checked by index.ts, so we don't duplicate that logic here
	console.log("ℹ️  Environment validation will be handled by the main process");

	// Create scheduler configuration (simplified)
	const schedulerConfig: AtpSchedulerConfig = {
		cronSchedule,
		debug,
		dryRun,
	};

	// Initialize and start scheduler
	const scheduler = new AtpScheduler(schedulerConfig);

	// Handle graceful shutdown
	const shutdown = () => {
		console.log("\n🛑 Shutting down ATP Investment Scheduler...");
		scheduler.stop();
		console.log("✅ Scheduler stopped gracefully");
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Check if user wants to run once or start scheduler
	const runMode = process.argv[2];

	if (runMode === "--once" || runMode === "-1") {
		console.log("🏃 Running ATP investment cycle once...");
		try {
			await scheduler.executeOnce();
			console.log("✅ One-time execution completed");
		} catch (error) {
			console.error("❌ One-time execution failed:", error);
			process.exit(1);
		}
	} else {
		console.log("🚀 Starting scheduled ATP investment agent...");
		scheduler.start();

		// Keep the process alive
		console.log("📡 Scheduler is running... Press Ctrl+C to stop");
		console.log(`📊 Status: ${JSON.stringify(scheduler.getStatus(), null, 2)}`);

		// Optional: Print status updates every hour
		setInterval(
			() => {
				const status = scheduler.getStatus();
				console.log(`\n⏰ Scheduler Status - ${new Date().toISOString()}`);
				console.log(`   Running: ${status.isRunning ? "✅" : "⏸️"}`);
				console.log(`   Next: ${status.nextExecution}`);
			},
			60 * 60 * 1000,
		); // Every hour
	}
}

main().catch((error) => {
	console.error("💥 Fatal error in scheduler:", error);
	process.exit(1);
});
