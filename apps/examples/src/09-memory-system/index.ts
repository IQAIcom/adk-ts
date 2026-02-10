import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 09. Memory System
 *
 * Demonstrates semantic memory search with embeddings across sessions.
 * Session 1: User shares info → stored to memory
 * Session 2: Agent recalls via semantic search
 */

const SESSION_1_MESSAGES = [
	"Hi! My name is Alex and I'm a software engineer at a startup.",
	"I have a pet African Grey parrot named Einstein. He can say over 50 words!",
	"I'm allergic to shellfish, so I avoid seafood restaurants.",
	"My favorite programming language is TypeScript, I love the type safety.",
	"I'm planning a trip to Japan next spring to see the cherry blossoms.",
];

const SESSION_2_QUESTIONS = [
	"What's my name and what do I do for work?",
	"Do I have any pets? What kind?",
	"Are there any foods I need to avoid?",
	"What language do I prefer coding in?",
	"Do you remember any travel plans I mentioned?",
];

async function main() {
	console.log("\n🧠 Memory System Example\n");

	const { runner, sessionService, memoryService } = await getRootAgent();

	// Session 1: Share information
	console.log("── Session 1: Sharing Information ──\n");
	for (const message of SESSION_1_MESSAGES) {
		await ask(runner, message);
	}

	// Store to memory
	const session1 = runner.getSession();
	console.log("\n💾 Storing session to memory...");
	const currentSession = await sessionService.getSession(
		session1.appName,
		session1.userId,
		session1.id,
	);
	if (currentSession) {
		await memoryService!.addSessionToMemory(currentSession);
	}

	// Session 2: Test recall
	const session2 = await sessionService.createSession(
		session1.appName,
		session1.userId,
	);
	runner.setSession(session2);

	console.log("\n── Session 2: Testing Recall ──\n");
	for (const question of SESSION_2_QUESTIONS) {
		await ask(runner, question);
	}
}

main().catch(console.error);
