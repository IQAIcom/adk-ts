import * as cron from "node-cron";
import { spawn } from "node:child_process";
import path from "node:path";

export interface AtpSchedulerConfig {
	cronSchedule: string;
	debug?: boolean;
	dryRun?: boolean;
}

export class AtpScheduler {
	private scheduledTask?: cron.ScheduledTask;
	private config: AtpSchedulerConfig;
	private isRunning = false;

	constructor(config: AtpSchedulerConfig) {
		this.config = config;
	}

	/**
	 * Starts the ATP investment scheduler
	 */
	start(): void {
		console.log("⏰ Starting ATP Investment Scheduler...");
		console.log(`📅 Schedule: ${this.config.cronSchedule}`);
		console.log(
			`🔒 Dry Run Mode: ${this.config.dryRun ? "ENABLED" : "DISABLED"}`,
		);

		this.scheduledTask = cron.schedule(
			this.config.cronSchedule,
			async () => {
				await this.executeInvestmentCycle();
			},
			{
				timezone: "UTC",
			},
		);

		console.log("✅ ATP Investment Scheduler started successfully");
		console.log("📊 Next execution:", this.getNextExecutionTime());
	}

	/**
	 * Stops the scheduler
	 */
	stop(): void {
		if (this.scheduledTask) {
			this.scheduledTask.stop();
			this.scheduledTask.destroy();
			console.log("🛑 ATP Investment Scheduler stopped");
		}
	}

	/**
	 * Gets the next scheduled execution time
	 */
	private getNextExecutionTime(): string {
		if (!this.scheduledTask) return "Not scheduled";

		try {
			const now = new Date();
			return `Next check in ~3 hours from ${now.toISOString()}`;
		} catch {
			return "Unable to calculate next execution time";
		}
	}

	/**
	 * Executes a single investment cycle by running the main index.ts process
	 */
	private async executeInvestmentCycle(): Promise<void> {
		if (this.isRunning) {
			console.log(
				"⚠️ Investment cycle already running, skipping this execution",
			);
			return;
		}

		this.isRunning = true;
		const startTime = new Date();
		console.log(`\n${"=".repeat(60)}`);
		console.log(`🔄 ATP Investment Cycle Started - ${startTime.toISOString()}`);
		console.log("=".repeat(60));

		try {
			await this.runMainProcess();
		} catch (error) {
			console.error("❌ Investment cycle failed:", error);
		} finally {
			const endTime = new Date();
			const duration = (
				(endTime.getTime() - startTime.getTime()) /
				1000
			).toFixed(2);
			console.log("=".repeat(60));
			console.log(`✅ ATP Investment Cycle Completed - Duration: ${duration}s`);
			console.log(`📅 Next execution: ${this.getNextExecutionTime()}`);
			console.log(`${"=".repeat(60)}\n`);

			this.isRunning = false;
		}
	}

	/**
	 * Runs the main ATP investment process
	 */
	private async runMainProcess(): Promise<void> {
		return new Promise((resolve, reject) => {
			const indexPath = path.join(__dirname, "..", "index.ts");

			// Set environment variables for the child process
			const env = {
				...process.env,
				...(this.config.dryRun && { ATP_DRY_RUN: "true" }),
				...(this.config.debug && { DEBUG: "true" }),
			};

			console.log("🚀 Starting ATP investment process...");

			const child = spawn("npx", ["tsx", indexPath], {
				env,
				stdio: this.config.debug ? "inherit" : "pipe",
			});

			let output = "";
			let errorOutput = "";

			if (!this.config.debug) {
				child.stdout?.on("data", (data) => {
					const text = data.toString();
					output += text;
					// Show important messages even in non-debug mode
					if (
						text.includes("✅") ||
						text.includes("❌") ||
						text.includes("🎯")
					) {
						process.stdout.write(text);
					}
				});

				child.stderr?.on("data", (data) => {
					const text = data.toString();
					errorOutput += text;
					process.stderr.write(text);
				});
			}

			child.on("close", (code) => {
				if (code === 0) {
					console.log("✅ ATP investment process completed successfully");
					resolve();
				} else {
					console.error(`❌ ATP investment process exited with code ${code}`);
					if (errorOutput) {
						console.error("Error output:", errorOutput);
					}
					reject(new Error(`Process exited with code ${code}`));
				}
			});

			child.on("error", (error) => {
				console.error("❌ Failed to start ATP investment process:", error);
				reject(error);
			});
		});
	}

	/**
	 * Executes one investment cycle (for external use)
	 */
	async executeOnce(): Promise<void> {
		await this.executeInvestmentCycle();
	}

	/**
	 * Gets the current status of the scheduler
	 */
	getStatus(): {
		isScheduled: boolean;
		isRunning: boolean;
		schedule: string;
		nextExecution: string;
	} {
		return {
			isScheduled: !!this.scheduledTask,
			isRunning: this.isRunning,
			schedule: this.config.cronSchedule,
			nextExecution: this.getNextExecutionTime(),
		};
	}
}
