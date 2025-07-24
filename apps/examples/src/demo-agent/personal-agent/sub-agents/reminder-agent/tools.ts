import { createTool } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod/v4";

export const addReminder = createTool({
	name: "add_reminder",
	description:
		"Add a new reminder to the user's reminder list (for immediate/simple reminders without scheduling)",
	schema: z.object({
		reminder: z.string().describe("The reminder text to add"),
		scheduledTime: z
			.string()
			.optional()
			.describe("Optional ISO 8601 date string for when the reminder is due"),
	}),
	fn: ({ reminder, scheduledTime }, context) => {
		const reminders = context.state.get("reminders", []);

		const reminderObj = {
			text: reminder,
			createdAt: new Date().toISOString(),
			scheduledTime: scheduledTime || null,
			id: uuidv4(),
		};

		reminders.push(reminderObj);
		context.state.set("reminders", reminders);

		const timeInfo = scheduledTime
			? ` (due: ${new Date(scheduledTime).toLocaleString()})`
			: "";

		return {
			success: true,
			reminder: reminderObj,
			message: `Added reminder: ${reminder}${timeInfo}`,
			total_reminders: reminders.length,
		};
	},
});

export const viewReminders = createTool({
	name: "view_reminders",
	description: "View all current reminders",
	fn: (_, context) => {
		const reminders = context.state.get("reminders", []);
		return {
			reminders,
			count: reminders.length,
			message:
				reminders.length > 0
					? `Here are your ${reminders.length} reminder(s):`
					: "You don't have any reminders yet.",
		};
	},
});

export const updateReminder = createTool({
	name: "update_reminder",
	description: "Update an existing reminder by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to update (starting from 1)"),
		updated_text: z.string().describe("The new text for the reminder"),
		scheduledTime: z
			.string()
			.optional()
			.describe("Optional new scheduled time in ISO 8601 format"),
		recurring: z
			.object({
				type: z.enum(["daily", "weekly", "monthly"]),
				interval: z.number().optional().default(1),
			})
			.optional()
			.describe("Optional new recurring schedule"),
	}),
	fn: ({ index, updated_text, scheduledTime, recurring }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const oldReminder = reminders[index - 1];
		const updatedReminder = {
			...oldReminder,
			text: updated_text,
		};

		// Update scheduled time if provided
		if (scheduledTime) {
			const scheduledDate = new Date(scheduledTime);
			if (Number.isNaN(scheduledDate.getTime())) {
				return {
					success: false,
					message:
						"Invalid date format. Please use ISO 8601 format (e.g., 2024-01-15T14:30:00Z)",
				};
			}
			updatedReminder.scheduledTime = scheduledDate.toISOString();
		}

		// Update recurring schedule if provided
		if (recurring !== undefined) {
			updatedReminder.recurring = recurring;
		}

		reminders[index - 1] = updatedReminder;
		context.state.set("reminders", reminders);

		return {
			success: true,
			index,
			old_reminder: oldReminder,
			updated_reminder: updatedReminder,
			message: `Updated reminder ${index}: "${oldReminder.text}" → "${updated_text}"${
				scheduledTime
					? ` (new time: ${new Date(scheduledTime).toLocaleString()})`
					: ""
			}${recurring ? ` (recurring: ${recurring.type})` : ""}`,
		};
	},
});

export const deleteReminder = createTool({
	name: "delete_reminder",
	description: "Delete a reminder by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to delete (starting from 1)"),
	}),
	fn: ({ index }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const deletedReminder = reminders.splice(index - 1, 1)[0];
		context.state.set("reminders", reminders);

		const recurringInfo = deletedReminder.recurring
			? ` (was recurring: ${deletedReminder.recurring.type})`
			: "";

		return {
			success: true,
			index,
			deleted_reminder: deletedReminder,
			message: `Deleted reminder ${index}: "${deletedReminder.text}"${recurringInfo}`,
			remaining_count: reminders.length,
		};
	},
});

export const scheduleReminder = createTool({
	name: "schedule_reminder",
	description: "Schedule a reminder to be triggered at a specific time",
	schema: z.object({
		reminder: z.string().describe("The reminder text"),
		scheduledTime: z
			.string()
			.describe("ISO 8601 date string for when to trigger the reminder"),
		recurring: z
			.object({
				type: z.enum(["daily", "weekly", "monthly"]),
				interval: z.number().optional().default(1),
			})
			.optional()
			.describe("Optional recurring schedule"),
	}),
	fn: ({ reminder, scheduledTime, recurring }, context) => {
		try {
			const id = uuidv4();
			const scheduledDate = new Date(scheduledTime);

			if (Number.isNaN(scheduledDate.getTime())) {
				return {
					success: false,
					message:
						"Invalid date format. Please use ISO 8601 format (e.g., 2024-01-15T14:30:00Z)",
				};
			}

			// Add to regular reminders list
			const reminders = context.state.get("reminders", []);
			reminders.push({
				text: reminder,
				scheduledTime: scheduledDate.toISOString(),
				id,
				recurring,
				createdAt: new Date().toISOString(),
			});
			context.state.set("reminders", reminders);

			return {
				success: true,
				reminder,
				scheduledTime: scheduledDate.toISOString(),
				id,
				recurring: recurring || null,
				message: `Scheduled reminder: ${reminder} for ${scheduledDate.toLocaleString()}`,
				total_reminders: reminders.length,
			};
		} catch (error) {
			console.error("Failed to schedule reminder:", error);
			return {
				success: false,
				message: "Failed to schedule reminder",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});

export const scheduleReminderWithTime = createTool({
	name: "schedule_reminder_with_time",
	description:
		"Schedule a reminder with flexible time input (handles relative times like 'in 2 hours', 'tomorrow at 3pm', etc.)",
	schema: z.object({
		reminder: z.string().describe("The reminder text"),
		timeInput: z
			.string()
			.describe(
				"Time specification - can be ISO string, relative time (e.g., 'in 2 hours', 'tomorrow at 3pm'), or absolute time",
			),
		recurring: z
			.object({
				type: z.enum(["daily", "weekly", "monthly"]),
				interval: z.number().optional().default(1),
			})
			.optional()
			.describe("Optional recurring schedule"),
	}),
	fn: ({ reminder, timeInput, recurring }, context) => {
		try {
			const id = uuidv4();
			let scheduledDate: Date;

			// Try to parse different time formats
			scheduledDate = parseTimeInput(timeInput);

			if (Number.isNaN(scheduledDate.getTime())) {
				return {
					success: false,
					message: `Could not parse time input: "${timeInput}". Try formats like "2024-01-15T14:30:00Z", "in 2 hours", "tomorrow at 3pm", "next Monday at 9am"`,
				};
			}

			// Check if the time is in the past
			const now = new Date();
			if (scheduledDate < now) {
				return {
					success: false,
					message: `Cannot schedule reminder in the past. The time ${scheduledDate.toLocaleString()} has already passed.`,
				};
			}

			// Add to regular reminders list
			const reminders = context.state.get("reminders", []);
			reminders.push({
				text: reminder,
				scheduledTime: scheduledDate.toISOString(),
				id,
				recurring,
				type: "scheduled",
				createdAt: new Date().toISOString(),
			});
			context.state.set("reminders", reminders);

			return {
				success: true,
				reminder,
				scheduledTime: scheduledDate.toISOString(),
				localTime: scheduledDate.toLocaleString(),
				id,
				recurring: recurring || null,
				message: `Scheduled reminder: "${reminder}" for ${scheduledDate.toLocaleString()}`,
				total_reminders: reminders.length,
			};
		} catch (error) {
			console.error("Failed to schedule reminder:", error);
			return {
				success: false,
				message: "Failed to schedule reminder",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});

/**
 * Parse various time input formats
 */
function parseTimeInput(timeInput: string): Date {
	const now = new Date();
	const lowercaseInput = timeInput.toLowerCase().trim();

	// Try ISO 8601 format first
	if (timeInput.includes("T") || timeInput.includes("Z")) {
		const isoDate = new Date(timeInput);
		if (!Number.isNaN(isoDate.getTime())) {
			return isoDate;
		}
	}

	// Handle relative times
	if (lowercaseInput.startsWith("in ")) {
		return parseRelativeTime(lowercaseInput.substring(3), now);
	}

	// Handle "tomorrow" cases
	if (lowercaseInput.includes("tomorrow")) {
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Check if there's a time specified
		const timeMatch = lowercaseInput.match(
			/at (\d{1,2}):?(\d{0,2})\s*(am|pm)?/,
		);
		if (timeMatch) {
			let hours = Number.parseInt(timeMatch[1]);
			const minutes = Number.parseInt(timeMatch[2] || "0");
			const ampm = timeMatch[3];

			if (ampm === "pm" && hours !== 12) hours += 12;
			if (ampm === "am" && hours === 12) hours = 0;

			tomorrow.setHours(hours, minutes, 0, 0);
		} else {
			tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
		}
		return tomorrow;
	}

	// Handle "next [day]" cases
	const nextDayMatch = lowercaseInput.match(
		/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
	);
	if (nextDayMatch) {
		const dayName = nextDayMatch[1];
		const targetDay = [
			"sunday",
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		].indexOf(dayName);
		const currentDay = now.getDay();

		let daysUntil = targetDay - currentDay;
		if (daysUntil <= 0) daysUntil += 7; // Next week

		const nextDate = new Date(now);
		nextDate.setDate(nextDate.getDate() + daysUntil);

		// Check for time specification
		const timeMatch = lowercaseInput.match(
			/at (\d{1,2}):?(\d{0,2})\s*(am|pm)?/,
		);
		if (timeMatch) {
			let hours = Number.parseInt(timeMatch[1]);
			const minutes = Number.parseInt(timeMatch[2] || "0");
			const ampm = timeMatch[3];

			if (ampm === "pm" && hours !== 12) hours += 12;
			if (ampm === "am" && hours === 12) hours = 0;

			nextDate.setHours(hours, minutes, 0, 0);
		} else {
			nextDate.setHours(9, 0, 0, 0); // Default to 9 AM
		}
		return nextDate;
	}

	// Handle simple time formats like "3pm", "15:30"
	const timeOnlyMatch = lowercaseInput.match(
		/^(\d{1,2}):?(\d{0,2})\s*(am|pm)?$/,
	);
	if (timeOnlyMatch) {
		let hours = Number.parseInt(timeOnlyMatch[1]);
		const minutes = Number.parseInt(timeOnlyMatch[2] || "0");
		const ampm = timeOnlyMatch[3];

		if (ampm === "pm" && hours !== 12) hours += 12;
		if (ampm === "am" && hours === 12) hours = 0;

		const today = new Date(now);
		today.setHours(hours, minutes, 0, 0);

		// If the time has passed today, schedule for tomorrow
		if (today <= now) {
			today.setDate(today.getDate() + 1);
		}
		return today;
	}

	// Fallback: try standard Date parsing
	const fallbackDate = new Date(timeInput);
	if (!Number.isNaN(fallbackDate.getTime())) {
		return fallbackDate;
	}

	// If all else fails, throw an error
	throw new Error(`Unable to parse time input: ${timeInput}`);
}

/**
 * Parse relative time expressions like "2 hours", "30 minutes", "1 day"
 */
function parseRelativeTime(relativeInput: string, baseTime: Date): Date {
	const result = new Date(baseTime);

	// Match patterns like "2 hours", "30 minutes", "1 day"
	const match = relativeInput.match(
		/(\d+)\s*(minute|minutes|min|hour|hours|hr|day|days|week|weeks)/,
	);

	if (!match) {
		throw new Error(`Unable to parse relative time: ${relativeInput}`);
	}

	const amount = Number.parseInt(match[1]);
	const unit = match[2];

	switch (unit) {
		case "minute":
		case "minutes":
		case "min":
			result.setMinutes(result.getMinutes() + amount);
			break;
		case "hour":
		case "hours":
		case "hr":
			result.setHours(result.getHours() + amount);
			break;
		case "day":
		case "days":
			result.setDate(result.getDate() + amount);
			break;
		case "week":
		case "weeks":
			result.setDate(result.getDate() + amount * 7);
			break;
		default:
			throw new Error(`Unknown time unit: ${unit}`);
	}

	return result;
}

export const getCurrentTime = createTool({
	name: "get_current_time",
	description: "Get the current date and time information",
	fn: () => {
		const now = new Date();
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

		return {
			success: true,
			currentTime: now.toISOString(),
			localTime: now.toLocaleString(),
			timeZone,
			timestamp: now.getTime(),
			formatted: {
				date: now.toLocaleDateString(),
				time: now.toLocaleTimeString(),
				dateTime: now.toLocaleString(),
			},
			message: `Current time: ${now.toLocaleString()} (${timeZone})`,
		};
	},
});

export const viewRemindersByType = createTool({
	name: "view_reminders_by_type",
	description:
		"View reminders filtered by type (scheduled, recurring, or immediate)",
	schema: z.object({
		type: z
			.enum(["scheduled", "recurring", "immediate", "all"])
			.optional()
			.default("all")
			.describe("Filter reminders by type"),
	}),
	fn: ({ type }, context) => {
		const allReminders = context.state.get("reminders", []);

		let filteredReminders = allReminders;

		if (type !== "all") {
			filteredReminders = allReminders.filter((reminder) => {
				switch (type) {
					case "recurring":
						return (
							reminder.recurring !== undefined && reminder.recurring !== null
						);
					case "scheduled":
						return (
							reminder.scheduledTime !== undefined &&
							reminder.scheduledTime !== null &&
							!reminder.recurring
						);
					case "immediate":
						return (
							reminder.scheduledTime === undefined ||
							reminder.scheduledTime === null
						);
					default:
						return true;
				}
			});
		}

		return {
			reminders: filteredReminders,
			count: filteredReminders.length,
			total_count: allReminders.length,
			type_filter: type,
			message:
				filteredReminders.length > 0
					? `Found ${filteredReminders.length} ${type === "all" ? "" : `${type} `}reminder(s):`
					: `No ${type === "all" ? "" : `${type} `}reminders found.`,
		};
	},
});

export const stopRecurringReminder = createTool({
	name: "stop_recurring_reminder",
	description:
		"Stop a recurring reminder by converting it to a one-time reminder",
	schema: z.object({
		index: z
			.number()
			.describe(
				"The position of the recurring reminder to stop (starting from 1)",
			),
	}),
	fn: ({ index }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const reminder = reminders[index - 1];

		if (!reminder.recurring) {
			return {
				success: false,
				message: `Reminder ${index} is not a recurring reminder.`,
			};
		}

		const oldRecurring = reminder.recurring;
		reminder.recurring = undefined;

		context.state.set("reminders", reminders);

		return {
			success: true,
			index,
			reminder,
			old_recurring: oldRecurring,
			message: `Stopped recurring schedule for reminder ${index}: "${reminder.text}". It will now only trigger once${
				reminder.scheduledTime
					? ` at ${new Date(reminder.scheduledTime).toLocaleString()}`
					: ""
			}.`,
		};
	},
});

export const modifyRecurringSchedule = createTool({
	name: "modify_recurring_schedule",
	description: "Modify the recurring schedule of an existing reminder",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to modify (starting from 1)"),
		recurring: z
			.object({
				type: z.enum(["daily", "weekly", "monthly"]),
				interval: z.number().optional().default(1),
			})
			.describe("New recurring schedule"),
	}),
	fn: ({ index, recurring }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const reminder = reminders[index - 1];
		const oldRecurring = reminder.recurring;

		reminder.recurring = recurring;
		context.state.set("reminders", reminders);

		const oldRecurringText = oldRecurring
			? `${oldRecurring.type}${oldRecurring.interval > 1 ? ` (every ${oldRecurring.interval})` : ""}`
			: "none";

		const newRecurringText = `${recurring.type}${recurring.interval > 1 ? ` (every ${recurring.interval})` : ""}`;

		return {
			success: true,
			index,
			reminder,
			old_recurring: oldRecurring,
			new_recurring: recurring,
			message: `Updated recurring schedule for reminder ${index}: "${reminder.text}". Changed from ${oldRecurringText} to ${newRecurringText}.`,
		};
	},
});

export const getUpcomingReminders = createTool({
	name: "get_upcoming_reminders",
	description:
		"Get reminders that are scheduled to trigger within a specified time period",
	schema: z.object({
		hours: z
			.number()
			.optional()
			.default(24)
			.describe("Number of hours to look ahead for upcoming reminders"),
	}),
	fn: ({ hours }, context) => {
		const reminders = context.state.get("reminders", []);
		const now = new Date();
		const cutoffTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

		const upcomingReminders = reminders
			.filter((reminder) => {
				if (!reminder.scheduledTime) return false;

				const scheduledTime = new Date(reminder.scheduledTime);
				return scheduledTime >= now && scheduledTime <= cutoffTime;
			})
			.sort((a, b) => {
				const timeA = new Date(a.scheduledTime).getTime();
				const timeB = new Date(b.scheduledTime).getTime();
				return timeA - timeB;
			});

		return {
			upcoming_reminders: upcomingReminders,
			count: upcomingReminders.length,
			time_window_hours: hours,
			message:
				upcomingReminders.length > 0
					? `Found ${upcomingReminders.length} reminder(s) scheduled in the next ${hours} hour(s):`
					: `No reminders scheduled in the next ${hours} hour(s).`,
		};
	},
});

export const getNextRecurringTime = createTool({
	name: "get_next_recurring_time",
	description:
		"Calculate when a recurring reminder will next trigger based on its schedule",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to check (starting from 1)"),
	}),
	fn: ({ index }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const reminder = reminders[index - 1];

		if (!reminder.recurring) {
			return {
				success: false,
				message: `Reminder ${index} is not a recurring reminder.`,
				reminder: reminder,
			};
		}

		if (!reminder.scheduledTime) {
			return {
				success: false,
				message: `Reminder ${index} has no scheduled time to calculate from.`,
				reminder: reminder,
			};
		}

		try {
			const lastScheduledTime = new Date(reminder.scheduledTime);
			const now = new Date();
			const nextTime = new Date(lastScheduledTime);

			// Calculate next occurrence based on recurring type
			const { type, interval = 1 } = reminder.recurring;

			// Keep adding intervals until we get a future time
			while (nextTime <= now) {
				switch (type) {
					case "daily":
						nextTime.setDate(nextTime.getDate() + interval);
						break;
					case "weekly":
						nextTime.setDate(nextTime.getDate() + interval * 7);
						break;
					case "monthly":
						nextTime.setMonth(nextTime.getMonth() + interval);
						break;
				}
			}

			return {
				success: true,
				reminder: reminder,
				current_scheduled_time: reminder.scheduledTime,
				next_occurrence: nextTime.toISOString(),
				next_occurrence_local: nextTime.toLocaleString(),
				recurring_info: reminder.recurring,
				message: `Next occurrence of recurring reminder ${index}: "${reminder.text}" will be at ${nextTime.toLocaleString()}`,
			};
		} catch (error) {
			return {
				success: false,
				message: "Failed to calculate next occurrence time",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},
});
