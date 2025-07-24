import {
	AgentBuilder,
	InMemorySessionService,
	LlmAgent,
	createTool,
} from "@iqai/adk";
import * as z from "zod/v4";

const main = async () => {
	const firstPasswordAgent = new LlmAgent({
		name: "first_password",
		description: "Agent that has first password",
		model: "gemini-2.5-flash",
		tools: [
			createTool({
				name: "getFirstPassword",
				description: "Returns the first password for the user",
				fn: () => "First password is eamt2CXOlJ3F0Dq",
			}),
		],
	});

	const secondPasswordAgent = new LlmAgent({
		name: "second_password",
		description: "Agent that has second password",
		model: "gemini-2.5-flash",
		tools: [
			createTool({
				name: "getSecondPassword",
				description: "Returns the second password for the user",
				schema: z.object({}),
				fn: () => "p84ylYk_9G6xlE8",
			}),
		],
	});

	const thirdPasswordAgent = new LlmAgent({
		name: "third_password",
		description: "Agent that has third password",
		model: "gemini-2.5-flash",
		tools: [
			createTool({
				name: "getThirdPassword",
				description: "Returns the third password for the user",
				schema: z.object({}),
				fn: () => "UnKfArgJ2gF0TtN",
			}),
		],
	});

	const fullPasswordAgent = new LlmAgent({
		name: "full_password",
		description: "Agent that combines passwords from other agents",
		model: "gemini-2.5-flash",
		tools: [
			createTool({
				name: "getFullPassword",
				description: "Combines passwords from other agents",
				schema: z.object({
					firstPassword: z.string().describe("First password"),
					secondPassword: z.string().describe("Second password"),
					thirdPassword: z.string().describe("Third password"),
				}),
				fn: async ({ firstPassword, secondPassword, thirdPassword }) => {
					return `${firstPassword}-${secondPassword}-${thirdPassword}`;
				},
			}),
		],
	});

	const response = await AgentBuilder.create("langgraph_agent")
		.withDescription("Agent that uses LangGraph to combine passwords")
		.withInstruction(
			"You will be asked to provide passwords from different agents. Combine them to form the full password.",
		)
		.asLangGraph(
			[
				{
					name: "getFirstPassword",
					condition: () => true,
					agent: firstPasswordAgent,
					targets: ["getSecondPassword"],
				},
				{
					name: "getSecondPassword",
					condition: () => true,
					agent: secondPasswordAgent,
					targets: ["getThirdPassword"],
				},
				{
					name: "getThirdPassword",
					condition: () => true,
					agent: thirdPasswordAgent,
					targets: ["getFullPassword"],
				},
				{
					name: "getFullPassword",
					condition: () => true,
					agent: fullPasswordAgent,
				},
			],
			"getFirstPassword",
		)
		.ask("What is the full password?");

	console.log("Full password:", response);
};

main()
	.then(() => {
		console.log("Agent started successfully.");
	})
	.catch((error) => {
		console.error("Error starting agent:", error);
	});
