import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 01. Tools and State
 *
 * You can notice we have tools.ts file along with agent.ts file in agents folder.
 * This is where we export all our tools required for the agent.
 *
 * In agent.ts you can see we are adding more fields
 * 1. withInstruction: this is where we have system instructions. Further, we are having state variables inside the prompt itself which will be decoded to real values during runtime
 * 2. withTools: where we pass the tools we have
 * 3. withQuickSession: this creates in memory session and uses the initial state we passed to create it
 *
 * In tools.ts you can notice
 * 1. input schema:  where the agent is required to pass the data in that format to tool for proper execution
 * 2. name and description: to let agent know the tools we are passing and how to access them.
 * 3. fn: which is a callback for agent to call when the ai decides to call.
 *
 * Also note how we are getting and updating the state inside the tools which would update the internal state inside inMemorySessionService and then the system prompt for subsequent runs
 *
 */
async function main() {
	const { runner } = await getRootAgent();

	const questions = [
		"Add 2 apples to my cart at $1.50 each",
		"Add 1 banana for $0.75",
		"Show me my complete cart with total",
	];

	for (const question of questions) {
		ask(runner, question);
	}
}

main().catch(console.error);
