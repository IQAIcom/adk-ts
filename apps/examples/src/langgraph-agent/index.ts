import { AgentBuilder, InMemorySessionService, createTool } from "@iqai/adk";
import * as z from "zod/v4";

const main = async () => {
	const session = new InMemorySessionService();
	const sessionConfig = { userId: "default_user", appName: "langgraph_agent" };

	const firstPasswordAgent = await AgentBuilder.create("first_password")
		.withDescription("Agent that has first password")
		.withModel("gemini-2.5-flash")
		.withTools(
			createTool({
				name: "getFirstPassword",
				description: "Returns the first password for the user",
				fn: () => "First password is eamt2CXOlJ3F0Dq",
			}),
		)
		.withSession(session, sessionConfig)
		.build();

	const secondPasswordAgent = await AgentBuilder.create("second_password")
		.withDescription("Agent that has second password")
		.withModel("gemini-2.5-flash")
		.withTools(
			createTool({
				name: "getSecondPassword",
				description: "Returns the second password for the user",
				schema: z.object({}),
				fn: () => "Second password is p84ylYk_9G6xlE8",
			}),
		)
		.withSession(session, sessionConfig)
		.build();

	const thirdPasswordAgent = await AgentBuilder.create("third_password")
		.withDescription("Agent that has third password")
		.withModel("gemini-2.5-flash")
		.withTools(
			createTool({
				name: "getThirdPassword",
				description: "Returns the third password for the user",
				schema: z.object({}),
				fn: () => "Third password is UnKfArgJ2gF0TtN",
			}),
		)
		.withSession(session, sessionConfig)
		.build();

	const fullPasswordAgent = await AgentBuilder.create("full_password")
		.withDescription("Agent that combines passwords from other agents")
		.withModel("gemini-2.5-flash")
		.withSession(session, sessionConfig)
		.withTools(
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
		)
		.build();

	const response = await AgentBuilder.create("langgraph_agent")
		.withDescription("Agent that uses LangGraph to combine passwords")
		.withInstruction(
			"You will be asked to provide passwords from different agents. Combine them to form the full password.",
		)
		.withSession(session, sessionConfig)
		.asLangGraph(
			[
				{
					name: "getFirstPassword",
					condition: () => true,
					agent: firstPasswordAgent.agent,
					targets: ["getSecondPassword"],
				},
				{
					name: "getSecondPassword",
					condition: () => true,
					agent: secondPasswordAgent.agent,
					targets: ["getThirdPassword"],
				},
				{
					name: "getThirdPassword",
					condition: () => true,
					agent: thirdPasswordAgent.agent,
					targets: ["getFullPassword"],
				},
				{
					name: "getFullPassword",
					condition: () => true,
					agent: fullPasswordAgent.agent,
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
