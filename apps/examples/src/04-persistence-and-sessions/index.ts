import { BaseSessionService, Session } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 04. Persistence and Sessions
 *
 * This example builds upon previous concepts but introduces robust state management and persistence.
 * Instead of ephemeral in-memory sessions, we now use a database to store agent state and history.
 *
 * In agent.ts, notice these key changes:
 * 1. withSessionService: Replaces withQuickSession. We use createDatabaseSessionService (SQLite here) to persist state across runs.
 * 2. withArtifactService: Handles file generation and storage (artifacts), separate from the conversation history.
 * 3. withEventsCompaction: Configures how the agent manages long conversation histories by summarizing past events to save context window.
 * 4. Rewind Capability: The example demonstrates how to undo actions or state changes by rewinding to a previous invocation point in the persistent session.
 *
 * This setup mimics a production environment where user sessions needs to be saved and restored, and where long-running interactions need memory management.
 *
 */
async function main() {
	const { runner, sessionService, session } = await getRootAgent();

	// 1. Persistence: Counter stored in SQLite database
	console.log("\n📊 Persistence: Counter stored in DB...");
	await ask(runner, "Increment 'visits' counter by 1 and show its value");

	// 2. Artifacts: Save counter report to file
	console.log("\n📁 Artifacts: Saving counter report...");
	await ask(runner, 'Save current counter values to "counter-report.txt"');

	// 3. Rewind: Undo the last counter increment
	console.log("\n🔄 Rewind: Demonstrating time-travel...");

	// Show current state
	let currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);
	console.log("📍 State before big increment:", currentSession.state);

	// Make a big increment that we'll want to undo
	await ask(runner, "Increment 'visits' counter by 100");

	// Get the invocationId of the increment operation
	// We use getInvocationIdWithStateDelta() to find the last state-changing event
	// because events from different invocations can be interleaved
	const invocationId = await getInvocationIdWithStateDelta(
		sessionService,
		session,
	);

	// Show the state after the big increment
	currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);
	console.log("📍 State after +100 increment:", currentSession.state);

	// Rewind to before the +100 increment - undoing that change!
	if (invocationId) {
		await runner.rewind({
			userId: session.userId,
			sessionId: session.id,
			rewindBeforeInvocationId: invocationId,
		});

		// Show the state after rewind - it should be back to what it was before
		currentSession = await sessionService.getSession(
			session.appName,
			session.userId,
			session.id,
		);
		console.log("⏪ State after rewind:", currentSession.state);
		console.log("✨ Successfully rewound - the +100 never happened!");

		// Verify with the agent (it will use the restored state)
		await ask(runner, "Increment 'visits' by 1 and show the new value");
	}

	// 4. Compaction: Multiple counter ops trigger auto-summarization
	console.log("\n📦 Compaction: Multiple counter operations...");
	const counters = ["logins", "clicks", "views", "shares"];
	for (const counter of counters) {
		await runner.ask(`Increment '${counter}' counter by 1`);
		await logCompactions(sessionService, session);
	}
	await ask(runner, "Show all counters");

	console.log("\n✅ All features demonstrated with counters!");
}

/**
 * ================================
 * Helper Methods
 * ================================
 */

/**
 * Gets the invocationId of the last event that has a state delta.
 *
 * This is more reliable than simply getting the last event's invocationId
 * because events from different invocations can be interleaved in the session.
 * By finding the last event with a state change, we ensure we get the
 * invocationId of the operation that actually modified state (e.g., a tool call).
 */
async function getInvocationIdWithStateDelta(
	sessionService: BaseSessionService,
	session: Session,
): Promise<string | undefined> {
	const currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);

	// Search backwards through events to find the last state-changing event
	for (let i = currentSession.events.length - 1; i >= 0; i--) {
		const event = currentSession.events[i];
		if (
			event.actions?.stateDelta &&
			Object.keys(event.actions.stateDelta).length > 0
		) {
			return event.invocationId;
		}
	}

	return undefined;
}

async function logCompactions(
	sessionService: BaseSessionService,
	session: Session,
) {
	const updatedSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);

	const compactions = updatedSession.events
		.filter((e) => e.actions?.compaction)
		.map((e) => e.actions.compaction);

	if (compactions.length === 0) return;

	for (const [i, c] of compactions.entries()) {
		const parts = c.compactedContent?.parts ?? [];
		const text = parts.map((p: any) => p.text).join("\n");
		console.log(`📦 Compaction ${i + 1}: ${text.substring(0, 100)}...\n`);
	}
}

main().catch(console.error);
