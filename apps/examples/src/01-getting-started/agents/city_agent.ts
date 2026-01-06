import { AgentBuilder } from "@iqai/adk";
import z from "zod";

export function getCityAgent() {
	const outputSchema = z.object({
		capital: z.string().describe("The capital city name"),
		country: z.string().describe("The country name"),
		population: z
			.number()
			.optional()
			.describe("Population of the capital city"),
		fun_fact: z.string().describe("An interesting fact about the city"),
	});

	return AgentBuilder.withModel("gemini-2.5-flash")
		.withOutputSchema(outputSchema)
		.build();
}
