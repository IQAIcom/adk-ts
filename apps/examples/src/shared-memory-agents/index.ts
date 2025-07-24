import {
	InMemoryMemoryService,
	AgentBuilder,
	InMemorySessionService,
} from "@iqai/adk";

async function createAgentRunner(
	name: string,
	description: string,
	instruction: string,
	memory: InMemoryMemoryService,
	session: any,
	sessionService: InMemorySessionService,
	sessionOptions: { userId: string; appName: string },
) {
	const { runner } = await AgentBuilder.create(name)
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(description)
		.withInstruction(instruction)
		.withMemory(memory)
		.withSession(session)
		.withSessionService(sessionService, sessionOptions)
		.build();
	return runner;
}

async function main() {
	const appName = "SharedMemoryDemo";
	const userId = "alice-bob-user";
	const sharedMemory = new InMemoryMemoryService();
	const sessionService = new InMemorySessionService();
	const sharedSession = await sessionService.createSession(appName, userId);

	// Agent Alice: answers about books, can recall Bob's movie
	const alice = await createAgentRunner(
		"alice",
		"Alice is a book lover. Bob is her friend and loves movies.",
		`You are Alice. Bob is your friend.
		You love books and answer questions about your favorite books.
		Attribute facts to your friend Bob if you recall them.
		DO NOT ADD EXTRA INFORMATION UNLESS ASKED. KEEP RESPONSES SHORT AND CONCISE.
		 `,
		sharedMemory,
		sharedSession,
		sessionService,
		{ userId, appName },
	);

	// Agent Bob: answers about movies, can recall Alice's book
	const bob = await createAgentRunner(
		"bob",
		"Bob is a movie lover. Alice is his friend and loves books.",
		`You are Bob. Alice is your friend.
		You love movies and answer questions about your favorite movies.
		Attribute facts to your friend Alice if you recall them.
		DO NOT ADD EXTRA INFORMATION UNLESS ASKED. KEEP RESPONSES SHORT AND CONCISE.
		`,
		sharedMemory,
		sharedSession,
		sessionService,
		{ userId, appName },
	);

	// Simulate a conversation between Alice and Bob
	const conversation = [
		{ to: "alice", text: "Hi Alice, what is your favorite book?" },
		{ to: "bob", text: "Hi Bob, what is your favorite movie?" },
		{ to: "alice", text: "Alice, do you know what Bob's favorite movie is?" },
		{ to: "bob", text: "Bob, do you know what Alice's favorite book is?" },
	];

	for (const message of conversation) {
		if (message.to === "alice") {
			const response = await alice.ask(message.text);
			console.log(`[Alice] Q: ${message.text}`);
			console.log(`[Alice] A: ${response}`);
		} else {
			const response = await bob.ask(message.text);
			console.log(`[Bob] Q: ${message.text}`);
			console.log(`[Bob] A: ${response}`);
		}
	}
}

main().catch(console.error);
