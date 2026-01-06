import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	const { runner } = await getRootAgent();
	await ask(
		runner,
		`Implement the quicksort algorithm and test it with:
			1. A random unsorted list of 20 numbers
			2. An already sorted list
			3. A list with duplicate elements`,
	);
}

main().catch(console.error);
