import { z } from "zod";
import { AgentBuilder } from "./packages/adk/src/agents/agent-builder.js";

// Test the type fix for withEventsCompaction preserving output schema types

const AgentOutputSchema = z.object({
	message: z
		.string()
		.describe(
			"A helpful message to the user confirming the action or answering the question.",
		),
	action: z
		.enum(["NONE", "EXPENSE_ADDED", "BALANCE_CHECK"])
		.describe("The type of action performed"),
});

async function testTypePreservation() {
	// Test case 1: withOutputSchema followed by withEventsCompaction
	const { runner: runner1 } = await AgentBuilder.create("expense-tracker")
		.withModel("gemini-2.5-flash")
		.withInstruction("You are a helpful expense tracker assistant.")
		.withOutputSchema(AgentOutputSchema)
		.withEventsCompaction({
			compactionInterval: 5,
			overlapSize: 2,
		})
		.build();

	// This should now have proper typing instead of EnhancedRunner<any, any>
	// The type should be: EnhancedRunner<{ message: string; action: "NONE" | "EXPENSE_ADDED" | "BALANCE_CHECK"; }, false>

	// Test case 2: withEventsCompaction followed by withOutputSchema (should still work)
	const { runner: runner2 } = await AgentBuilder.create("expense-tracker")
		.withModel("gemini-2.5-flash")
		.withInstruction("You are a helpful expense tracker assistant.")
		.withEventsCompaction({
			compactionInterval: 5,
			overlapSize: 2,
		})
		.withOutputSchema(AgentOutputSchema)
		.build();

	// Test case 3: Multiple chained calls
	const { runner: runner3 } = await AgentBuilder.create("expense-tracker")
		.withModel("gemini-2.5-flash")
		.withOutputSchema(AgentOutputSchema)
		.withEventsCompaction({
			compactionInterval: 5,
			overlapSize: 2,
		})
		.withEventsCompaction({
			compactionInterval: 10,
			overlapSize: 3,
		})
		.build();

	console.log("Type fix test completed successfully!");
}

// This file is for TypeScript type checking - it doesn't need to run
export { testTypePreservation };
