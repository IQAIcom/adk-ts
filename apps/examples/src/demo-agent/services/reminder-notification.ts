import {
	AgentBuilder,
	type BaseSessionService,
	type BaseTool,
	Event,
	EventActions,
	type Session,
} from "@iqai/adk";
import dedent from "dedent";
import { env } from "../env";
import type { PersonalAgentState, Reminder } from "../types";

export interface ReminderNotificationService {
	start(): void;
	stop(): void;
}

/**
 * Service for handling reminder notifications
 */
export class ReminderNotificationServiceImpl
	implements ReminderNotificationService
{
	private intervalId: NodeJS.Timeout | null = null;
	private isRunning = false;
	private readonly checkIntervalMs: number;

	constructor(
		private readonly session: Session,
		private readonly sessionService: BaseSessionService,
		private readonly telegramTools: BaseTool[],
		checkIntervalMs = 30000, // Check every 30 seconds instead of every second
	) {
		this.checkIntervalMs = checkIntervalMs;
	}

	/**
	 * Start the reminder notification service
	 */
	start(): void {
		if (this.isRunning) {
			console.log("⚠️ Reminder notification service is already running");
			return;
		}

		this.isRunning = true;
		console.log("🔔 Starting reminder notification service...");

		this.intervalId = setInterval(async () => {
			try {
				await this.checkAndSendReminders();
			} catch (error) {
				console.error("❌ Error checking reminders:", error);
			}
		}, this.checkIntervalMs);

		console.log("✅ Reminder notification service started");
	}

	/**
	 * Stop the reminder notification service
	 */
	stop(): void {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		console.log("🛑 Reminder notification service stopped");
	}

	/**
	 * Check for due reminders and send notifications
	 */
	private async checkAndSendReminders(): Promise<void> {
		try {
			const activeSession = await this.sessionService.getSession(
				this.session.appName,
				this.session.userId,
				this.session.id,
			);

			const state = activeSession?.state as PersonalAgentState;
			const { reminders = [] } = state;

			if (reminders.length === 0) {
				return;
			}

			const now = new Date();
			const dueReminders = reminders.filter((reminder) => {
				if (!reminder.scheduledTime) {
					return false;
				}

				const scheduledTime = new Date(reminder.scheduledTime);

				// Check if the reminder is due (within the last check interval)
				const timeDiff = now.getTime() - scheduledTime.getTime();
				return timeDiff >= 0 && timeDiff < this.checkIntervalMs;
			});

			if (dueReminders.length === 0) {
				return;
			}

			console.log(`🔔 Found ${dueReminders.length} due reminder(s)`);

			// Send notifications for due reminders
			for (const reminder of dueReminders) {
				await this.sendReminderNotification(reminder);
			}

			// Remove sent reminders from the state (unless they're recurring)
			const updatedReminders = reminders.filter((reminder) => {
				const isDue = dueReminders.some((due) => due.id === reminder.id);
				if (!isDue) {
					return true;
				}

				// Keep recurring reminders but schedule the next occurrence
				if (reminder.recurring) {
					return this.scheduleNextRecurrence(reminder);
				}

				return false;
			});

			// Update the session state by creating a state update event
			const updateEvent = new Event({
				author: "system",
				actions: new EventActions({
					stateDelta: {
						reminders: updatedReminders,
					},
				}),
			});

			if (activeSession)
				await this.sessionService.appendEvent(activeSession, updateEvent);
		} catch (error) {
			console.error("❌ Error in checkAndSendReminders:", error);
		}
	}

	/**
	 * Send a reminder notification via Telegram
	 */
	private async sendReminderNotification(reminder: Reminder): Promise<void> {
		try {
			const { runner } = await AgentBuilder.create("reminder_notify_agent")
				.withModel("gemini-2.5-flash")
				.withTools(...this.telegramTools)
				.build();

			const message = dedent`
				🔔 Reminder Alert!

				${reminder.text}

				Scheduled for: ${reminder.scheduledTime ? new Date(reminder.scheduledTime).toLocaleString() : "None"}
			`;

			await runner.ask(dedent`
				Send this reminder notification via telegram: "${message} to channel id: ${env.TELEGRAM_CHANNEL_ID}"
			`);

			console.log(`✅ Sent reminder: ${reminder.text}`);
		} catch (error) {
			console.error(`❌ Failed to send reminder: ${reminder.text}`, error);
		}
	}

	/**
	 * Schedule the next occurrence for recurring reminders
	 */
	private scheduleNextRecurrence(reminder: Reminder): boolean {
		if (!reminder.recurring || !reminder.scheduledTime) {
			return false;
		}

		const currentDate = new Date(reminder.scheduledTime);
		const { type, interval = 1 } = reminder.recurring;

		switch (type) {
			case "daily":
				currentDate.setDate(currentDate.getDate() + interval);
				break;
			case "weekly":
				currentDate.setDate(currentDate.getDate() + 7 * interval);
				break;
			case "monthly":
				currentDate.setMonth(currentDate.getMonth() + interval);
				break;
			default:
				console.warn(`Unknown recurring type: ${type}`);
				return false;
		}

		reminder.scheduledTime = currentDate.toISOString();
		console.log(
			`📅 Scheduled next occurrence for recurring reminder: ${reminder.text} at ${currentDate.toLocaleString()}`,
		);

		return true;
	}
}

/**
 * Factory function to create a reminder notification service
 */
export function createReminderNotificationService(
	session: Session,
	sessionService: BaseSessionService,
	telegramTools: BaseTool[],
	checkIntervalMs?: number,
): ReminderNotificationService {
	return new ReminderNotificationServiceImpl(
		session,
		sessionService,
		telegramTools,
		checkIntervalMs,
	);
}
