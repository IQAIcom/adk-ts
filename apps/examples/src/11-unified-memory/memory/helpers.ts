import {
	MemoryBuilder,
	MemoryService,
	InMemoryStorageProvider,
} from "@iqai/adk";

export function createBasicMemory() {
	return MemoryBuilder.create({
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
}

export function createLimitedMemory(count = 2) {
	return MemoryBuilder.create({
		appName: "my-chat-app",
		userId: "alice",
		lastMessages: count,
	});
}

export function createMemoryWithSearch() {
	return MemoryBuilder.create({
		appName: "search-app",
		userId: "bob",
	}).withMemoryService(
		new MemoryService({
			storage: new InMemoryStorageProvider(),
		}),
	);
}
