import { AgentScheduler } from "@iqai/adk";
import { getReporterAgent } from "./agents/agent";

/**
 * 09. Scheduling
 *
 * This example shows how to use AgentScheduler to run agents on a recurring schedule.
 *
 * You will learn:
 * 1. How to schedule a job with a fixed interval
 * 2. How to use per-job callbacks (onTrigger, onComplete, onError)
 * 3. How to listen to global scheduler events
 * 4. How to check job status and trigger a job manually
 * 5. How to gracefully stop the scheduler
 *
 * The example schedules a reporter agent to run every 10 seconds, lets it run
 * a few times, triggers it manually once, then shuts down.
 */
async function main() {
	const { runner, session } = await getReporterAgent();
	const scheduler = new AgentScheduler();

	// Listen to all scheduler events
	scheduler.addEventListener((event) => {
		console.log(`[event] ${event.type} - job: ${event.scheduleId}`);
	});

	// Schedule the agent to run every 10 seconds.
	// We pass the session ID from build() so the runner can find the session.
	scheduler.schedule({
		id: "status-report",
		intervalMs: 10_000,
		runner,
		userId: session.userId,
		sessionId: session.id,
		input: "Give me a quick status update.",
		maxExecutions: 3,
		onTrigger: (jobId) => {
			console.log(`\n--- Job "${jobId}" triggered ---`);
		},
		onComplete: (jobId, events) => {
			for (const event of events) {
				const parts = event.content?.parts;
				if (!parts) continue;
				for (const part of parts) {
					if ("text" in part && part.text) {
						console.log(`Agent: ${part.text}`);
					}
				}
			}
			console.log(`--- Job "${jobId}" done ---\n`);
		},
		onError: (jobId, error) => {
			console.error(`Job "${jobId}" failed: ${error.message}`);
		},
	});

	console.log("Starting scheduler (3 runs, 10s interval)...\n");
	scheduler.start();

	// After 5 seconds, check status and trigger manually
	setTimeout(async () => {
		const status = scheduler.getJobStatus("status-report");
		console.log("\n[manual] Current job status:", status);

		console.log("[manual] Triggering job now...");
		const events = await scheduler.triggerNow("status-report");
		console.log(`[manual] Got ${events.length} events from manual trigger\n`);
	}, 5_000);

	// Wait for all scheduled runs to finish, then stop
	setTimeout(async () => {
		console.log("Stopping scheduler...");
		await scheduler.stop();
		console.log("Done.");
	}, 45_000);
}

main().catch(console.error);
