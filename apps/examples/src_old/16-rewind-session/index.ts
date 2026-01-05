import { AgentBuilder, BaseSessionService, Session } from "@iqai/adk";
import { ask } from "../utils";

async function main() {
	const { runner, sessionService, session } = await AgentBuilder.withModel(
		process.env.LLM_MODEL || "gemini-2.5-flash",
	).build();

	const questions = [
		"What is a function in JavaScript?",
		"How do you declare a variable in TypeScript?",
		"How do you create and iterate over an array of numbers?",
		"What is an interface in TypeScript used for?",
	];

	const chat: { q: string; a: string; i: string }[] = [];

	for (const question of questions) {
		const answer = await runner.ask(question);
		const invocationId = await getLatestInvocationId(sessionService, session);
		chat.push({ q: question, a: answer, i: invocationId });
		console.log(
			"💬 new chat: ",
			JSON.stringify(chat[chat.length - 1], null, 2),
		);
	}

	// Check context for what is the last question
	await ask(runner, "what is my last question?");

	async function rewindToQuestion(i: number) {
		console.log(`4️⃣ Rewind to ${i}th question`);
		await runner.rewind({
			userId: session.userId,
			sessionId: session.id,
			rewindBeforeInvocationId: chat[i - 1].i,
		});
		await ask(runner, "what is my last question?");
	}

	// Rewind to past and then check what are my last questions
	await rewindToQuestion(3);
	await rewindToQuestion(2);
	await rewindToQuestion(1);
}

async function getLatestInvocationId(
	sessionService: BaseSessionService,
	session: Session,
) {
	const currentSession = await sessionService.getSession(
		session.appName,
		session.userId,
		session.id,
	);

	const invocationId =
		currentSession.events[currentSession.events.length - 1]?.invocationId;
	return invocationId;
}

main().catch(console.error);
