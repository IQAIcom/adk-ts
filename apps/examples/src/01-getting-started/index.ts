import dedent from "dedent";
import { getRootAgent } from "./agents/agent";

/**
 * 01. Get Started
 *
 * If you are looking for hello world here it is: AgentBuilder.model("gemini-2.5-flash").ask("Say Hi!")
 *
 * But this example shows more than that. Every example in this series of examples show one or more concepts
 * all in recommended folder structure. in this example, you will learn
 * 1. how to structure agents, which is in agents folder with root agent in agents/agent.ts.
 * 2. how to consume the created agents in agent folder, which you can learn by reading index.ts files
 * 3. how to get structured response by using zod schemas
 *
 * The response type is fully typed because of the type inference from zod schema
 *
 */
async function main() {
	const { runner } = await getRootAgent();

	const response = await runner.ask("Give me stats about France");

	console.log(
		dedent`
		🌍 Country:    ${response.country}
		📍 Capital:    ${response.capital}
		👥 Population: ${response.population ? response.population.toLocaleString() : "N/A"}
		🎉 Fun fact:   ${response.funFact}
		`,
	);
}

main().catch(console.error);
