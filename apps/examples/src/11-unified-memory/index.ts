import {
	MemoryBuilder,
	MemoryService,
	InMemoryStorageProvider,
} from "@iqai/adk";

export async function main() {
	console.log("🧠 Starting Unified Memory (MemoryBuilder) Example...\n");

	console.log("--- Example 1: Basic Usage ---\n");

	const memory = MemoryBuilder.create({
		appName: "my-chat-app",
		userId: "alice",
		workingMemory: {
			enabled: true,
			template: `# User Profile
- **Name**: Unknown
- **Preferences**: Not specified
- **Topics**: None recorded
`,
		},
	});

	const session = await memory.createSession(
		{ topic: "TypeScript" },
		"session-1",
	);

	console.log("📝 Created session:", {
		id: session.id,
		appName: session.appName,
		userId: session.userId,
	});

	await memory.addMessage(session, {
		role: "user",
		content: "Hi! My name is Alice.",
	});

	await memory.addMessage(session, {
		role: "assistant",
		content: "Hello Alice! How can I help you today?",
	});

	await memory.addMessage(session, {
		role: "user",
		content: "I want to learn about TypeScript generics.",
	});

	await memory.addMessage(session, {
		role: "assistant",
		content: "Generics allow you to write reusable, type-safe components.",
	});

	console.log(`💬 Added ${session.events.length} messages to session\n`);

	console.log("--- Example 2: Recall Messages ---\n");

	const messages = await memory.recall("session-1");

	console.log(`📚 Recalled ${messages.length} messages:\n`);
	for (const msg of messages) {
		const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
		console.log(`  ${role}: ${msg.content}`);
	}

	console.log("\n--- Example 3: Working Memory ---\n");

	const initialWm = await memory.getWorkingMemory("session-1");
	console.log("📋 Initial working memory (from template):");
	console.log(initialWm);

	await memory.updateWorkingMemory(
		session,
		`# User Profile
- **Name**: Alice
- **Preferences**: Formal learning style
- **Topics**: TypeScript, Programming
`,
	);

	const updatedWm = await memory.getWorkingMemory("session-1");
	console.log("✏️ Updated working memory:");
	console.log(updatedWm);

	console.log("\n--- Example 4: Limited Recall ---\n");

	const limitedMemory = MemoryBuilder.create({
		appName: "my-chat-app",
		userId: "alice",
		lastMessages: 2,
	});

	const limitedSession = await limitedMemory.createSession(
		undefined,
		"limited-session",
	);

	for (let i = 0; i < 5; i++) {
		await limitedMemory.addMessage(limitedSession, {
			role: i % 2 === 0 ? "user" : "assistant",
			content: `Message ${i + 1}`,
		});
	}

	const limitedMessages = await limitedMemory.recall("limited-session");
	console.log(
		`📉 With lastMessages: 2, only ${limitedMessages.length} messages recalled:`,
	);
	for (const msg of limitedMessages) {
		console.log(`  - ${msg.content}`);
	}

	console.log("\n--- Example 5: Multiple Sessions ---\n");

	const session2 = await memory.createSession(undefined, "session-2");

	await memory.addMessage(session2, {
		role: "user",
		content: "Can you explain async/await?",
	});

	await memory.addMessage(session2, {
		role: "assistant",
		content: "Async/await is syntactic sugar for working with Promises.",
	});

	const allSessions = await memory.listSessions();
	console.log(`📂 Alice has ${allSessions.sessions.length} sessions:`);
	for (const s of allSessions.sessions) {
		console.log(`  - Session: ${s.id}`);
	}

	console.log("\n--- Example 6: With MemoryService (Search) ---\n");

	const memoryWithSearch = MemoryBuilder.create({
		appName: "search-app",
		userId: "bob",
	}).withMemoryService(
		new MemoryService({
			storage: new InMemoryStorageProvider(),
		}),
	);

	const searchSession = await memoryWithSearch.createSession(
		undefined,
		"search-session",
	);

	await memoryWithSearch.addMessage(searchSession, {
		role: "user",
		content: "I love programming in TypeScript",
	});

	const searchResults = await memoryWithSearch.search("TypeScript");
	console.log(
		`🔍 Search results for "TypeScript": ${searchResults.length} found`,
	);

	console.log("\n--- Example 7: End Session ---\n");

	const ended = await memoryWithSearch.endSession("search-session");
	console.log(
		`✅ Session ended: ${ended?.id} (${ended?.events.length} events preserved)`,
	);

	console.log("\n--- Example 8: Session Cleanup ---\n");

	await memory.deleteSession("session-2");
	console.log("🗑️ Deleted session: session-2");

	const remaining = await memory.listSessions();
	console.log(`📂 Alice now has ${remaining.sessions.length} session(s)`);

	console.log("\n✨ Unified Memory (MemoryBuilder) Example Complete!");
	console.log("\nKey Features Demonstrated:");
	console.log(
		"  ✅ MemoryBuilder wraps existing SessionService + MemoryService",
	);
	console.log("  ✅ Simple message API (no need to construct Event objects)");
	console.log("  ✅ Working memory with templates (stored in session state)");
	console.log("  ✅ Recall returns simple {role, content} messages");
	console.log("  ✅ Configurable message history limits");
	console.log("  ✅ Optional MemoryService for semantic search");
	console.log("  ✅ Builder pattern with method chaining");
	console.log(
		"  ✅ Swap in DatabaseSessionService, VectorStorageProvider, etc.",
	);
}

main().catch(console.error);
