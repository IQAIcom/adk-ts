import dedent from "dedent";
import {
	createBasicMemory,
	createLimitedMemory,
	createMemoryWithSearch,
} from "./memory/helpers";

/**
 * 11. Unified Memory
 *
 * This example introduces the `MemoryBuilder`, which provides a high-level,
 * unified interface for managing both short-term (sessions) and long-term (indexed) memory.
 *
 * In this example, you will learn:
 * 1. How to use `MemoryBuilder` for simplified message and session management.
 * 2. How to implement "Working Memory" using custom templates.
 * 3. How to recall conversation history with message limits.
 * 4. How to integrate `MemoryService` for semantic search capabilities.
 * 5. Lifecycle management of sessions (creation, listing, ending, and deletion).
 *
 * The `MemoryBuilder` is the recommended way to handle agent state and memory in ADK-TS applications.
 */
async function main() {
	console.log(dedent`
		🧠 Starting Unified Memory (MemoryBuilder) Example...
	`);

	// --- Example 1: Basic Usage ---
	console.log(dedent`
		\n\n--- Example 1: Basic Usage ---\n
	`);

	const memory = createBasicMemory();

	const session = await memory.createSession(
		{ topic: "TypeScript" },
		"session-1",
	);

	console.log(dedent`
		📝 Created session:
		   ID:      ${session.id}
		   App:     ${session.appName}
		   User:    ${session.userId}
	`);

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

	console.log(dedent`
		💬 Added ${session.events.length} messages to session
	`);

	// --- Example 2: Recall Messages ---
	console.log(dedent`
		\n\n--- Example 2: Recall Messages ---\n
	`);

	const messages = await memory.recall("session-1");

	console.log(dedent`
		📚 Recalled ${messages.length} messages:
	`);
	for (const msg of messages) {
		const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
		console.log(`  ${role}: ${msg.content}`);
	}

	// --- Example 3: Working Memory ---
	console.log(dedent`
		\n\n--- Example 3: Working Memory ---\n
	`);

	const initialWm = await memory.getWorkingMemory("session-1");
	console.log(dedent`
		📋 Initial working memory (from template):
		${initialWm}
	`);

	await memory.updateWorkingMemory(
		session,
		dedent`
			# User Profile
			- **Name**: Alice
			- **Preferences**: Formal learning style
			- **Topics**: TypeScript, Programming
		`,
	);

	const updatedWm = await memory.getWorkingMemory("session-1");
	console.log(dedent`
		✏️ Updated working memory:
		${updatedWm}
	`);

	// --- Example 4: Limited Recall ---
	console.log(dedent`
		\n\n--- Example 4: Limited Recall ---\n
	`);

	const limitedMemory = createLimitedMemory(2);

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
	console.log(dedent`
		📉 With lastMessages: 2, only ${limitedMessages.length} messages recalled:
	`);
	for (const msg of limitedMessages) {
		console.log(`  - ${msg.content}`);
	}

	// --- Example 5: Multiple Sessions ---
	console.log(dedent`
		\n\n--- Example 5: Multiple Sessions ---\n
	`);

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
	console.log(dedent`
		📂 Alice has ${allSessions.sessions.length} sessions:
	`);
	for (const s of allSessions.sessions) {
		console.log(`  - Session: ${s.id}`);
	}

	// --- Example 6: With MemoryService (Search) ---
	console.log(dedent`
		\n\n--- Example 6: With MemoryService (Search) ---\n
	`);

	const memoryWithSearch = createMemoryWithSearch();

	const searchSession = await memoryWithSearch.createSession(
		undefined,
		"search-session",
	);

	await memoryWithSearch.addMessage(searchSession, {
		role: "user",
		content: "I love programming in TypeScript",
	});

	const searchResults = await memoryWithSearch.search("TypeScript");
	console.log(dedent`
		🔍 Search results for "TypeScript": ${searchResults.length} found
	`);

	// --- Example 7: End Session ---
	console.log(dedent`
		\n\n--- Example 7: End Session ---\n
	`);

	const ended = await memoryWithSearch.endSession("search-session");
	console.log(dedent`
		✅ Session ended: ${ended?.id} (${ended?.events.length} events preserved)
	`);

	// --- Example 8: Session Cleanup ---
	console.log(dedent`
		\n\n--- Example 8: Session Cleanup ---\n
	`);

	await memory.deleteSession("session-2");
	console.log(dedent`
		🗑️ Deleted session: session-2
	`);

	const remaining = await memory.listSessions();
	console.log(dedent`
		📂 Alice now has ${remaining.sessions.length} session(s)
	`);

	console.log(dedent`
		✨ Unified Memory (MemoryBuilder) Example Complete!

		Key Features Demonstrated:
		  ✅ MemoryBuilder wraps existing SessionService + MemoryService
		  ✅ Simple message API (no need to construct Event objects)
		  ✅ Working memory with templates (stored in session state)
		  ✅ Recall returns simple {role, content} messages
		  ✅ Configurable message history limits
		  ✅ Optional MemoryService for semantic search
		  ✅ Builder pattern with method chaining
		  ✅ Swap in DatabaseSessionService, VectorStorageProvider, etc.
	`);
}

main().catch(console.error);
