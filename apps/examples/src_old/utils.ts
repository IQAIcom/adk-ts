import { EnhancedRunner } from "@iqai/adk";

/**
 * A reusable function to handle asking questions to an agent runner.
 * It logs the question, gets the response, logs the response, and returns it.
 *
 * @param runner The agent runner function that takes a string question and returns a promise
 * @param question The question to ask the agent
 * @param skipResponseLog Optional flag to skip automatic response logging for custom formatting
 * @returns The agent's response
 */
export async function ask<T>(
	runner: EnhancedRunner<T>,
	question: string,
	skipResponseLog = false,
): Promise<T> {
	console.log(`👤 User:  ${question}`);
	const response = await runner.ask(question);

	if (!skipResponseLog) {
		// Handle different response types appropriately
		if (typeof response === "object" && response !== null) {
			console.log(`🤖 Agent: ${JSON.stringify(response, null, 2)}`);
		} else {
			console.log(`🤖 Agent: ${response}\n`);
		}
	}

	return response;
}
