import { BaseSessionService, Session } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	const { runner, sessionService, session } = await getRootAgent();

	// 1. Persistence: Counter stored in SQLite database
	console.log("\n📊 Persistence: Counter stored in DB...");
	await ask(runner, "Increment 'visits' counter by 1 and show its value");

	// 2. Artifacts: Save counter report to file
	console.log("\n📁 Artifacts: Saving counter report...");
	await ask(runner, 'Save current counter values to "counter-report.txt"');

	// 3. Rewind: Undo the last counter increment
	console.log("\n🔄 Rewind: Undoing last increment...");
	await ask(runner, "Increment 'visits' counter by 5");
	const invocationId = await getLatestInvocationId(sessionService, session);
	await ask(runner, "What is the current value of 'visits'?");

	await runner.rewind({
		userId: session.userId,
		sessionId: session.id,
		rewindBeforeInvocationId: invocationId,
	});
	console.log("⏪ Rewound to before +5 increment");
	await ask(runner, "What is the current value of 'visits'?");

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

async function getLatestInvocationId(
	sessionService: BaseSessionService,
	session: Session,
) {
	const currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);
	return currentSession.events[currentSession.events.length - 1]?.invocationId;
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
