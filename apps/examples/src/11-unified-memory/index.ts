import { createMemory, type Message } from "@iqai/adk";

export async function main() {
	console.log("🧠 Starting Unified Memory Example...\n");

	const memory = createMemory({
		config: {
			lastMessages: 10,
			workingMemory: {
				enabled: true,
				scope: "resource",
				template: `# User Profile
- **Name**: Unknown
- **Preferences**: Not specified
- **Topics of Interest**: None recorded
`,
			},
		},
	});

	console.log("--- Example 1: Thread and Message Management ---\n");

	const thread = await memory.createThread({
		resourceId: "user-alice",
		title: "Alice's First Conversation",
	});

	console.log("📝 Created thread:", {
		id: thread.id,
		resourceId: thread.resourceId,
		title: thread.title,
	});

	const messages = await memory.addMessages(thread.id, [
		{ role: "user", content: "Hi! My name is Alice.", type: "text" },
		{
			role: "assistant",
			content: "Hello Alice! Nice to meet you. How can I help you today?",
			type: "text",
		},
		{
			role: "user",
			content: "I'm interested in learning about TypeScript.",
			type: "text",
		},
		{
			role: "assistant",
			content:
				"TypeScript is a typed superset of JavaScript. Would you like to start with the basics?",
			type: "text",
		},
	]);

	console.log(`\n💬 Added ${messages.length} messages to thread\n`);

	console.log("--- Example 2: Recalling Messages ---\n");

	const recallResult = await memory.recall({
		threadId: thread.id,
		resourceId: "user-alice",
	});

	console.log(
		`📚 Recalled ${recallResult.messages.length} messages from thread:\n`,
	);
	for (const msg of recallResult.messages) {
		const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
		console.log(`  ${role}: ${msg.content}`);
	}

	console.log("\n--- Example 3: Working Memory ---\n");

	const initialWorkingMemory = await memory.getWorkingMemory({
		threadId: thread.id,
		resourceId: "user-alice",
	});

	console.log("📋 Initial working memory (from template):");
	console.log(initialWorkingMemory ?? recallResult.workingMemory);

	await memory.updateWorkingMemory({
		threadId: thread.id,
		resourceId: "user-alice",
		content: `# User Profile
- **Name**: Alice
- **Preferences**: Formal learning style
- **Topics of Interest**: TypeScript, Programming
`,
	});

	console.log("\n✏️ Updated working memory with user information");

	const updatedWorkingMemory = await memory.getWorkingMemory({
		threadId: thread.id,
		resourceId: "user-alice",
	});

	console.log("\n📋 Updated working memory:");
	console.log(updatedWorkingMemory);

	console.log("\n--- Example 4: Multiple Threads for Same User ---\n");

	const thread2 = await memory.createThread({
		resourceId: "user-alice",
		title: "Alice's Second Conversation",
	});

	await memory.addMessages(thread2.id, [
		{
			role: "user",
			content: "Can you explain generics in TypeScript?",
			type: "text",
		},
		{
			role: "assistant",
			content:
				"Generics allow you to write reusable components that work with any type.",
			type: "text",
		},
	]);

	const allThreads = await memory.listThreads({ resourceId: "user-alice" });

	console.log(`📂 Alice has ${allThreads.total} threads:`);
	for (const t of allThreads.threads) {
		console.log(`  - ${t.title} (ID: ${t.id})`);
	}

	console.log("\n--- Example 5: Recall with Working Memory ---\n");

	const fullRecall = await memory.recall({
		threadId: thread2.id,
		resourceId: "user-alice",
	});

	console.log("📚 Recall includes:");
	console.log(`  - ${fullRecall.messages.length} messages`);
	console.log(
		`  - Working memory: ${fullRecall.workingMemory ? "✅ Present" : "❌ Not set"}`,
	);

	if (fullRecall.workingMemory) {
		console.log(
			"\n📋 Working memory persists across threads (resource scope):",
		);
		console.log(fullRecall.workingMemory);
	}

	console.log("\n--- Example 6: Limited Message History ---\n");

	const limitedMemory = createMemory({
		config: { lastMessages: 2 },
	});

	const limitedThread = await limitedMemory.createThread({
		resourceId: "user-bob",
	});

	await limitedMemory.addMessages(limitedThread.id, [
		{ role: "user", content: "Message 1", type: "text" },
		{ role: "assistant", content: "Response 1", type: "text" },
		{ role: "user", content: "Message 2", type: "text" },
		{ role: "assistant", content: "Response 2", type: "text" },
		{ role: "user", content: "Message 3 (most recent)", type: "text" },
	]);

	const limitedRecall = await limitedMemory.recall({
		threadId: limitedThread.id,
	});

	console.log(
		`📉 With lastMessages: 2, only ${limitedRecall.messages.length} messages recalled:`,
	);
	for (const msg of limitedRecall.messages) {
		console.log(`  - ${msg.content}`);
	}

	console.log("\n--- Example 7: Thread Cleanup ---\n");

	await memory.deleteThread(thread2.id);
	console.log(`🗑️ Deleted thread: ${thread2.id}`);

	const remainingThreads = await memory.listThreads({
		resourceId: "user-alice",
	});
	console.log(`📂 Alice now has ${remainingThreads.total} thread(s)`);

	console.log("\n✨ Unified Memory Example Complete!");
	console.log("\nKey Features Demonstrated:");
	console.log("  ✅ Single Memory class for all conversation management");
	console.log("  ✅ Thread management (create, list, update, delete)");
	console.log("  ✅ Message storage and recall");
	console.log("  ✅ Working memory with template support");
	console.log("  ✅ Resource-scoped working memory (shared across threads)");
	console.log("  ✅ Configurable message history limits");
}

main().catch(console.error);
