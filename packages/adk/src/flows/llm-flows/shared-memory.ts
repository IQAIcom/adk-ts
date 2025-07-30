import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";
import type { Event } from "../../events/event";

class SharedMemoryRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const memoryService = invocationContext.memoryService;
		if (!memoryService) return;

		// Use the latest user message as the query
		const lastUserEvent = invocationContext.session.events.findLast(
			(e) => e.author === "user" && e.content?.parts?.length,
		);

		if (!lastUserEvent) return;

		const query = (lastUserEvent.content.parts ?? [])
			.map((p) => p.text || "")
			.join(" ");

		// Search shared memory
		const results = await memoryService.searchMemory({
			appName: invocationContext.appName,
			userId: invocationContext.userId,
			query,
		});

		// Deduplicate: skip memories already present in session context
		const sessionTexts = new Set(
			(llmRequest.contents || []).flatMap(
				(c) => c.parts?.map((p) => p.text) || [],
			),
		);

		for (const memory of results.memories) {
			const memoryText = (memory.content.parts ?? [])
				.map((p) => p.text || "")
				.join(" ");
			if (!sessionTexts.has(memoryText)) {
				llmRequest.contents = llmRequest.contents || [];
				llmRequest.contents.push({
					role: "user",
					parts: [
						{
							text: `[${memory.author}] said: ${memoryText}`,
						},
					],
				});
			}
		}
	}
}

export const sharedMemoryRequestProcessor = new SharedMemoryRequestProcessor();
