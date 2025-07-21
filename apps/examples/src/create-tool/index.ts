import { env } from "node:process";
import { AgentBuilder, createTool } from "@iqai/adk";
import * as z from "zod/v4";

async function main() {
	console.log("🛠️ Simple createTool example");

	try {
		// Create tools with object syntax
		const calculatorTool = createTool({
			name: "calculator",
			description: "Adds two numbers",
			schema: z.object({
				a: z.number().describe("First number"),
				b: z.number().describe("Second number"),
			}),
			fn: ({ a, b }) => ({ result: a + b }),
		});

		const weatherTool = createTool({
			name: "weather",
			description: "Gets weather for a city",
			schema: z.object({
				city: z.string().describe("City name"),
			}),
			fn: ({ city }) => ({
				city,
				temperature: 22,
				conditions: "sunny",
			}),
		});

		// Create agent
		const { runner } = await AgentBuilder.create("simple_example")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("A simple agent with calculator and weather tools")
			.withInstruction(
				"You can add numbers and check weather. Be helpful and clear.",
			)
			.withTools(calculatorTool, weatherTool)
			.build();

		// Simple examples
		console.log("\n--- Calculator Example ---");
		const result1 = await runner.ask("What is 10 + 5?");
		console.log("Result:", result1);

		console.log("\n--- Weather Example ---");
		const result2 = await runner.ask("What's the weather in Paris?");
		console.log("Result:", result2);

		console.log("\n🎉 Example completed!");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

// Execute the main function
main().catch((error) => {
	console.error("💥 Error:", error);
	process.exit(1);
});
