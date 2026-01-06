import dedent from "dedent";
import { getCityAgent } from "./agents/city_agent";

async function main() {
	const { runner } = await getCityAgent();

	const response = await runner.ask("Give me stats about France");

	console.log(
		dedent`
		🌍 Country:    ${response.country}
		📍 Capital:    ${response.capital}
		👥 Population: ${response.population ? response.population.toLocaleString() : "N/A"}
		🎉 Fun fact:   ${response.fun_fact}
		`,
	);
}

main().catch(console.error);
