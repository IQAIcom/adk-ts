import { createTool } from "@iqai/adk";
import z from "zod";

export const counterTool = createTool({
	name: "increment_counter",
	description: "Increment a named counter",
	schema: z.object({
		counterName: z.string().describe("Name of the counter"),
		amount: z.number().default(1).describe("Amount to increment"),
	}),
	fn: ({ counterName, amount }, context) => {
		const counters = context.state.get("counters", {});
		const oldValue = counters[counterName] || 0;
		const newValue = oldValue + amount;
		const newCounters = { ...counters, [counterName]: newValue };
		context.state.set("counters", newCounters);
		return {
			counterName,
			oldValue,
			newValue,
			increment: amount,
		};
	},
});
