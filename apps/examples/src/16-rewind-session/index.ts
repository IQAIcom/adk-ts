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
		chat.push({
			q: question,
			a: await runner.ask(question),
			i: await getLatestInvocationId(sessionService, session),
		});
		console.log(chat[-1]);
	}

	async function rewindToQuestion(i: number) {
		console.log(`4️⃣ Rewind to ${i}th question`);
		runner.rewind({
			userId: session.userId,
			sessionId: session.id,
			rewindBeforeInvocationId: chat[1].i,
		});
		await ask(runner, "what is my last question?");
	}

	rewindToQuestion(3);
	rewindToQuestion(2);
	rewindToQuestion(1);
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

	const invocationId = currentSession.events[-1].invocationId;
	return invocationId;
}

main().catch(console.error);
