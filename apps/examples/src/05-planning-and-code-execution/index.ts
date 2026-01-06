import dedent from "dedent";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	const { runner } = await getRootAgent();

	const question = dedent`
		Implement the quicksort algorithm and test it with:
			1. A random unsorted list of 20 numbers
			2. An already sorted list
			3. A list with duplicate elements`;

	await ask(runner, question);
}

main().catch(console.error);
