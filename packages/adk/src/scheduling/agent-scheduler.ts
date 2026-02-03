import type { Event } from "@adk/events";
import { Logger } from "@adk/logger";
import type { Content } from "@google/genai";
import type { EnhancedRunner } from "../agents/agent-builder";

/**
 * Events emitted by the scheduler
 */
export type SchedulerEventType =
	| "schedule:triggered"
	| "schedule:completed"
	| "schedule:failed"
	| "schedule:paused"
	| "schedule:resumed";

export interface SchedulerEvent {
	type: SchedulerEventType;
	scheduleId: string;
	timestamp: number;
	data?: Record<string, unknown>;
}

/**
 * Scheduled job configuration
 */
export interface ScheduledJob {
	/** Unique identifier for this job */
	id: string;
	/** Cron expression (e.g., "0 9 * * *" for daily at 9 AM) */
	cron?: string;
	/** Interval in milliseconds (alternative to cron) */
	intervalMs?: number;
	/** The runner to execute */
	runner: EnhancedRunner<any, any>;
	/** User ID for the session */
	userId: string;
	/** Session ID (optional - creates new session each run if not provided) */
	sessionId?: string;
	/** Input message to send on each scheduled run */
	input: string | Content;
	/** Whether the job is enabled (default: true) */
	enabled?: boolean;
	/** Maximum number of executions (undefined = unlimited) */
	maxExecutions?: number;
	/** Callback when job triggers */
	onTrigger?: (jobId: string) => void;
	/** Callback when execution completes */
	onComplete?: (jobId: string, events: Event[]) => void;
	/** Callback on execution error */
	onError?: (jobId: string, error: Error) => void;
	/** Callback for each event as it streams in during execution */
	onEvent?: (jobId: string, event: Event) => void;
}

/**
 * Internal job state
 */
interface JobState {
	config: ScheduledJob;
	timerId?: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
	executionCount: number;
	isRunning: boolean;
	lastRunTime?: number;
	nextRunTime?: number;
	lastError?: Error;
}

/**
 * AgentScheduler - Manages scheduled execution of ADK agents.
 *
 * Provides cron-based and interval-based scheduling for agent runs with
 * support for multiple concurrent schedules, execution tracking, and
 * lifecycle callbacks.
 *
 * @example
 * ```typescript
 * // Create scheduler
 * const scheduler = new AgentScheduler();
 *
 * // Build an agent
 * const { runner } = await AgentBuilder
 *   .create("daily-reporter")
 *   .withModel("gemini-2.5-flash")
 *   .withInstruction("Generate a daily summary report")
 *   .build();
 *
 * // Schedule the agent
 * scheduler.schedule({
 *   id: "daily-report",
 *   cron: "0 9 * * *", // Daily at 9 AM
 *   runner,
 *   userId: "system",
 *   input: "Generate today's report",
 *   onComplete: (id, events) => console.log(`Job ${id} completed`),
 * });
 *
 * // Start the scheduler
 * scheduler.start();
 *
 * // Later: stop the scheduler
 * await scheduler.stop();
 * ```
 */
export class AgentScheduler {
	private readonly logger = new Logger({ name: "AgentScheduler" });
	private readonly jobs: Map<string, JobState> = new Map();
	private readonly eventListeners: ((event: SchedulerEvent) => void)[] = [];
	private isRunning = false;

	/**
	 * Schedule a new job
	 */
	schedule(config: ScheduledJob): void {
		if (this.jobs.has(config.id)) {
			throw new Error(`Job with id '${config.id}' already exists`);
		}

		if (!config.cron && !config.intervalMs) {
			throw new Error("Either 'cron' or 'intervalMs' must be provided");
		}

		const state: JobState = {
			config: { ...config, enabled: config.enabled ?? true },
			executionCount: 0,
			isRunning: false,
		};

		if (config.cron) {
			state.nextRunTime = this.calculateNextRunTime(config.cron);
		}

		this.jobs.set(config.id, state);

		this.logger.info(`Job scheduled: ${config.id}`, {
			cron: config.cron,
			intervalMs: config.intervalMs,
			enabled: state.config.enabled,
		});

		// If scheduler is already running, start this job
		if (this.isRunning && state.config.enabled) {
			this.startJob(config.id);
		}
	}

	/**
	 * Unschedule a job
	 */
	unschedule(jobId: string): boolean {
		const state = this.jobs.get(jobId);
		if (!state) {
			return false;
		}

		this.stopJob(jobId);
		this.jobs.delete(jobId);
		this.logger.info(`Job unscheduled: ${jobId}`);
		return true;
	}

	/**
	 * Pause a job
	 */
	pause(jobId: string): boolean {
		const state = this.jobs.get(jobId);
		if (!state) {
			return false;
		}

		state.config.enabled = false;
		this.stopJob(jobId);
		this.emitEvent({
			type: "schedule:paused",
			scheduleId: jobId,
			timestamp: Date.now(),
		});
		this.logger.info(`Job paused: ${jobId}`);
		return true;
	}

	/**
	 * Resume a paused job
	 */
	resume(jobId: string): boolean {
		const state = this.jobs.get(jobId);
		if (!state) {
			return false;
		}

		state.config.enabled = true;
		if (this.isRunning) {
			this.startJob(jobId);
		}
		this.emitEvent({
			type: "schedule:resumed",
			scheduleId: jobId,
			timestamp: Date.now(),
		});
		this.logger.info(`Job resumed: ${jobId}`);
		return true;
	}

	/**
	 * Trigger a job immediately (outside of schedule)
	 */
	async triggerNow(jobId: string): Promise<Event[]> {
		const state = this.jobs.get(jobId);
		if (!state) {
			throw new Error(`Job '${jobId}' not found`);
		}

		return this.executeJob(state);
	}

	/**
	 * Trigger a job immediately and stream events as they arrive.
	 * Uses the same AsyncGenerator pattern as runner.runAsync().
	 */
	async *triggerNowStream(jobId: string): AsyncGenerator<Event> {
		const state = this.jobs.get(jobId);
		if (!state) {
			throw new Error(`Job '${jobId}' not found`);
		}

		const { config } = state;

		// Check max executions
		if (
			config.maxExecutions !== undefined &&
			state.executionCount >= config.maxExecutions
		) {
			this.logger.info(
				`Job ${config.id} reached max executions (${config.maxExecutions})`,
			);
			this.pause(config.id);
			return;
		}

		// Mark as running
		state.isRunning = true;
		state.lastRunTime = Date.now();

		// Emit trigger event
		config.onTrigger?.(config.id);
		this.emitEvent({
			type: "schedule:triggered",
			scheduleId: config.id,
			timestamp: Date.now(),
		});

		const events: Event[] = [];

		try {
			// Prepare input message
			const inputMessage: Content =
				typeof config.input === "string"
					? { parts: [{ text: config.input }] }
					: config.input;

			// Stream events from the runner
			for await (const event of config.runner.runAsync({
				userId: config.userId,
				sessionId: config.sessionId || `scheduled-${config.id}-${Date.now()}`,
				newMessage: inputMessage,
			})) {
				events.push(event);
				yield event;
			}

			// Mark as completed
			state.isRunning = false;
			state.executionCount++;
			state.lastError = undefined;

			// Emit completion
			config.onComplete?.(config.id, events);
			this.emitEvent({
				type: "schedule:completed",
				scheduleId: config.id,
				timestamp: Date.now(),
				data: { eventCount: events.length },
			});

			this.logger.info(`Job ${config.id} completed`, {
				eventCount: events.length,
				executionCount: state.executionCount,
			});
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));

			// Mark as failed
			state.isRunning = false;
			state.lastError = err;

			// Emit failure
			config.onError?.(config.id, err);
			this.emitEvent({
				type: "schedule:failed",
				scheduleId: config.id,
				timestamp: Date.now(),
				data: { error: err.message },
			});

			this.logger.error(`Job ${config.id} failed:`, err);
			throw err;
		}
	}

	/**
	 * Get status of a job
	 */
	getJobStatus(jobId: string):
		| {
				enabled: boolean;
				isRunning: boolean;
				executionCount: number;
				lastRunTime?: number;
				nextRunTime?: number;
				lastError?: string;
		  }
		| undefined {
		const state = this.jobs.get(jobId);
		if (!state) {
			return undefined;
		}

		return {
			enabled: state.config.enabled ?? true,
			isRunning: state.isRunning,
			executionCount: state.executionCount,
			lastRunTime: state.lastRunTime,
			nextRunTime: state.nextRunTime,
			lastError: state.lastError?.message,
		};
	}

	/**
	 * Get all job IDs
	 */
	getJobIds(): string[] {
		return Array.from(this.jobs.keys());
	}

	/**
	 * Start the scheduler
	 */
	start(): void {
		if (this.isRunning) {
			this.logger.warn("Scheduler is already running");
			return;
		}

		this.isRunning = true;
		this.logger.info("Scheduler started");

		// Start all enabled jobs
		for (const [jobId, state] of this.jobs) {
			if (state.config.enabled) {
				this.startJob(jobId);
			}
		}
	}

	/**
	 * Stop the scheduler
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;

		// Stop all jobs
		for (const jobId of this.jobs.keys()) {
			this.stopJob(jobId);
		}

		// Wait for any running executions to complete
		const runningJobs = Array.from(this.jobs.values()).filter(
			(s) => s.isRunning,
		);
		if (runningJobs.length > 0) {
			this.logger.info(
				`Waiting for ${runningJobs.length} running jobs to complete...`,
			);
			await new Promise<void>((resolve) => {
				const checkInterval = setInterval(() => {
					const stillRunning = Array.from(this.jobs.values()).filter(
						(s) => s.isRunning,
					);
					if (stillRunning.length === 0) {
						clearInterval(checkInterval);
						resolve();
					}
				}, 100);
			});
		}

		this.logger.info("Scheduler stopped");
	}

	/**
	 * Add an event listener
	 */
	addEventListener(listener: (event: SchedulerEvent) => void): void {
		this.eventListeners.push(listener);
	}

	/**
	 * Remove an event listener
	 */
	removeEventListener(listener: (event: SchedulerEvent) => void): void {
		const index = this.eventListeners.indexOf(listener);
		if (index > -1) {
			this.eventListeners.splice(index, 1);
		}
	}

	/**
	 * Start a specific job's timer
	 */
	private startJob(jobId: string): void {
		const state = this.jobs.get(jobId);
		if (!state || state.timerId) {
			return;
		}

		const { config } = state;

		if (config.intervalMs) {
			// Interval-based scheduling
			state.timerId = setInterval(() => {
				this.executeJob(state).catch((err) => {
					this.logger.error(`Error executing job ${jobId}:`, err);
				});
			}, config.intervalMs);
			this.logger.debug(
				`Job ${jobId} started with interval: ${config.intervalMs}ms`,
			);
		} else if (config.cron) {
			// Cron-based scheduling - use timeout to next run
			this.scheduleNextCronRun(state);
		}
	}

	/**
	 * Schedule the next cron run
	 */
	private scheduleNextCronRun(state: JobState): void {
		if (!state.config.cron || !state.config.enabled) {
			return;
		}

		const nextRunTime = this.calculateNextRunTime(state.config.cron);
		const delay = nextRunTime - Date.now();

		if (delay < 0) {
			// Run immediately if we're past the scheduled time
			this.executeJob(state).catch((err) => {
				this.logger.error(`Error executing job ${state.config.id}:`, err);
			});
			return;
		}

		state.nextRunTime = nextRunTime;
		state.timerId = setTimeout(async () => {
			try {
				await this.executeJob(state);
			} catch (err) {
				this.logger.error(`Error executing job ${state.config.id}:`, err);
			}

			// Schedule next run
			if (this.isRunning && state.config.enabled) {
				this.scheduleNextCronRun(state);
			}
		}, delay);

		this.logger.debug(
			`Job ${state.config.id} scheduled for ${new Date(nextRunTime).toISOString()}`,
		);
	}

	/**
	 * Stop a specific job's timer
	 */
	private stopJob(jobId: string): void {
		const state = this.jobs.get(jobId);
		if (!state || !state.timerId) {
			return;
		}

		clearTimeout(state.timerId);
		clearInterval(state.timerId);
		state.timerId = undefined;
	}

	/**
	 * Execute a job
	 */
	private async executeJob(state: JobState): Promise<Event[]> {
		const { config } = state;

		// Check max executions
		if (
			config.maxExecutions !== undefined &&
			state.executionCount >= config.maxExecutions
		) {
			this.logger.info(
				`Job ${config.id} reached max executions (${config.maxExecutions})`,
			);
			this.pause(config.id);
			return [];
		}

		// Mark as running
		state.isRunning = true;
		state.lastRunTime = Date.now();

		// Emit trigger event
		config.onTrigger?.(config.id);
		this.emitEvent({
			type: "schedule:triggered",
			scheduleId: config.id,
			timestamp: Date.now(),
		});

		const events: Event[] = [];

		try {
			// Prepare input message
			const inputMessage: Content =
				typeof config.input === "string"
					? { parts: [{ text: config.input }] }
					: config.input;

			// Execute the runner and stream events
			for await (const event of config.runner.runAsync({
				userId: config.userId,
				sessionId: config.sessionId || `scheduled-${config.id}-${Date.now()}`,
				newMessage: inputMessage,
			})) {
				events.push(event);
				config.onEvent?.(config.id, event);
			}

			// Mark as completed
			state.isRunning = false;
			state.executionCount++;
			state.lastError = undefined;

			// Emit completion
			config.onComplete?.(config.id, events);
			this.emitEvent({
				type: "schedule:completed",
				scheduleId: config.id,
				timestamp: Date.now(),
				data: { eventCount: events.length },
			});

			this.logger.info(`Job ${config.id} completed`, {
				eventCount: events.length,
				executionCount: state.executionCount,
			});

			return events;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));

			// Mark as failed
			state.isRunning = false;
			state.lastError = err;

			// Emit failure
			config.onError?.(config.id, err);
			this.emitEvent({
				type: "schedule:failed",
				scheduleId: config.id,
				timestamp: Date.now(),
				data: { error: err.message },
			});

			this.logger.error(`Job ${config.id} failed:`, err);
			throw err;
		}
	}

	/**
	 * Calculate next run time from cron expression
	 * Simplified implementation - production should use a library like 'croner'
	 */
	private calculateNextRunTime(cronExpression: string): number {
		const parts = cronExpression.trim().split(/\s+/);
		if (parts.length !== 5) {
			this.logger.warn(`Invalid cron expression: ${cronExpression}`);
			return Date.now() + 60000;
		}

		const now = new Date();
		const next = new Date(now);

		const [minute, hour, _dayOfMonth, _month, dayOfWeek] = parts;

		// Handle common patterns
		if (minute === "*" && hour === "*") {
			// Every minute
			next.setSeconds(0);
			next.setMilliseconds(0);
			next.setMinutes(next.getMinutes() + 1);
		} else if (minute !== "*" && hour === "*") {
			// Every hour at specific minute
			const targetMinute = Number.parseInt(minute, 10);
			next.setMinutes(targetMinute);
			next.setSeconds(0);
			next.setMilliseconds(0);

			if (next <= now) {
				next.setHours(next.getHours() + 1);
			}
		} else if (minute !== "*" && hour !== "*") {
			// Specific time
			const targetHour = Number.parseInt(hour, 10);
			const targetMinute = Number.parseInt(minute, 10);

			next.setHours(targetHour);
			next.setMinutes(targetMinute);
			next.setSeconds(0);
			next.setMilliseconds(0);

			if (next <= now) {
				// Handle day of week
				if (dayOfWeek !== "*") {
					const targetDow = Number.parseInt(dayOfWeek, 10);
					const currentDow = next.getDay();
					let daysUntil = targetDow - currentDow;
					if (daysUntil <= 0) {
						daysUntil += 7;
					}
					next.setDate(next.getDate() + daysUntil);
				} else {
					next.setDate(next.getDate() + 1);
				}
			}
		} else {
			// Fallback: next minute
			next.setSeconds(0);
			next.setMilliseconds(0);
			next.setMinutes(next.getMinutes() + 1);
		}

		return next.getTime();
	}

	/**
	 * Emit an event to all listeners
	 */
	private emitEvent(event: SchedulerEvent): void {
		for (const listener of this.eventListeners) {
			try {
				listener(event);
			} catch (err) {
				this.logger.warn("Error in scheduler event listener", { error: err });
			}
		}
	}
}
