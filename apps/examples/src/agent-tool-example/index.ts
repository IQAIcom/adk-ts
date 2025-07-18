import { env } from "node:process";
import {
	LlmAgent,
	InMemorySessionService,
	InvocationContext,
	ToolContext,
	AgentTool,
	FunctionTool,
	RunConfig,
} from "@iqai/adk";

function calculateBasic(expression: string): string {
	console.log(`🧮 Calculating: ${expression}`);
	try {
		// Simple calculator for basic expressions
		// In a real implementation, you'd use a proper math parser like mathjs
		// For demo purposes, using Function constructor as a safer alternative to eval
		const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
		const result = new Function(`return ${sanitized}`)();
		return `The result of ${expression} is ${result}`;
	} catch (error) {
		return `Error calculating ${expression}: ${error}`;
	}
}

/**
 * Helper function to create a tool context for testing
 */
async function createToolContext(
	sessionService: InMemorySessionService,
	state: Record<string, any> = {},
): Promise<ToolContext> {
	const session = await sessionService.createSession(
		"AgentToolDemo",
		"demo_user",
		state,
	);

	// Create a dummy agent for the invocation context
	const dummyAgent = new LlmAgent({
		name: "dummy",
		model: env.LLM_MODEL || "gemini-2.0-flash",
		description: "Dummy agent",
	});

	const invocationContext = new InvocationContext({
		invocationId: "demo_invocation",
		agent: dummyAgent,
		session: session,
		sessionService: sessionService,
		runConfig: new RunConfig(),
	});

	return new ToolContext(invocationContext);
}

async function demonstrateAgentTool() {
	console.log("🤖 Agent Tool Demo - Using Specialized Agents as Tools\n");

	if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY required for this example");
		process.exit(1);
	}

	try {
		const sessionService = new InMemorySessionService();

		// Create a specialized math agent
		const mathAgent = new LlmAgent({
			name: "math_specialist",
			model: env.LLM_MODEL || "gemini-2.0-flash",
			description:
				"Expert mathematician who solves complex mathematical problems",
			instruction: `You are an expert mathematician. When given a mathematical problem:
1. Break down the problem step by step
2. Use the calculator tool for computations
3. Explain your reasoning clearly
4. Provide the final answer`,
			tools: [
				new FunctionTool(calculateBasic, {
					name: "calculate",
					description: "Performs basic mathematical calculations",
					parameterTypes: { expression: "string" },
				}),
			],
		});

		// Create a writing specialist agent
		const writingAgent = new LlmAgent({
			name: "writing_specialist",
			model: env.LLM_MODEL || "gemini-2.0-flash",
			description: "Expert writer who creates clear, engaging content",
			instruction: `You are an expert writer. When given a writing task:
1. Understand the audience and purpose
2. Create clear, engaging content
3. Use proper structure and flow
4. Ensure the tone matches the request`,
		});

		// Create tools from the specialist agents
		const mathTool = new AgentTool({
			name: "solve_math_problem",
			description:
				"Solves complex mathematical problems with step-by-step explanations",
			agent: mathAgent,
			outputKey: "math_result", // Store result in session state
		});

		const writingTool = new AgentTool({
			name: "create_content",
			description: "Creates high-quality written content for various purposes",
			agent: writingAgent,
			outputKey: "written_content",
		});

		// Demo scenarios showing different AgentTool capabilities
		const scenarios = [
			{
				title: "Mathematics Tool Demo",
				tool: mathTool,
				input:
					"Calculate the compound interest on $10,000 invested at 5% annually for 3 years",
				description: "Using math specialist agent as a tool",
			},
			{
				title: "Writing Tool Demo",
				tool: writingTool,
				input: "Write a brief explanation of compound interest for a beginner",
				description: "Using writing specialist agent as a tool",
			},
			{
				title: "Custom Function Declaration Demo",
				tool: new AgentTool({
					name: "custom_math_tool",
					description: "A math tool with custom schema",
					agent: mathAgent,
					functionDeclaration: {
						name: "custom_math_tool",
						description: "Performs advanced mathematical calculations",
						parameters: {
							type: "object",
							properties: {
								problem: {
									type: "string",
									description: "The mathematical problem to solve",
								},
								complexity: {
									type: "string",
									enum: ["basic", "intermediate", "advanced"],
									description: "Complexity level of the problem",
								},
							},
							required: ["problem"],
						},
					},
				}),
				input: { problem: "Solve x² - 5x + 6 = 0", complexity: "intermediate" },
				description: "Using custom function declaration schema",
			},
		];

		// Execute demo scenarios
		for (const scenario of scenarios) {
			console.log(`\n🔹 ${scenario.title}`);
			console.log(`📝 Description: ${scenario.description}`);
			console.log(
				`💬 Input: ${typeof scenario.input === "string" ? scenario.input : JSON.stringify(scenario.input)}\n`,
			);

			// Create fresh context for each scenario
			const context = await createToolContext(sessionService);

			// Execute the agent tool
			const result = await scenario.tool.runAsync(
				typeof scenario.input === "string"
					? { input: scenario.input }
					: scenario.input,
				context,
			);

			console.log("✅ Result:");
			console.log(
				typeof result === "string" ? result : JSON.stringify(result, null, 2),
			);

			// Show state if outputKey was used
			if (scenario.tool.outputKey && context.state) {
				const stateValue = (context.state as any)[scenario.tool.outputKey];
				if (stateValue) {
					console.log(
						`\n📊 Stored in session state [${scenario.tool.outputKey}]:`,
					);
					console.log(
						typeof stateValue === "string"
							? stateValue
							: JSON.stringify(stateValue, null, 2),
					);
				}
			}

			console.log(`\n${"=".repeat(80)}`);
		}

		// Combined workflow demonstration
		console.log("\n🔹 Combined Workflow Demo");
		console.log(
			"📝 Description: Using multiple agent tools in sequence with shared state",
		);
		console.log("💬 Workflow: Math calculation → Content creation\n");

		const workflowContext = await createToolContext(sessionService);

		console.log("📋 Step 1: Mathematical Analysis");
		const mathResult = await mathTool.runAsync(
			{
				input: "Calculate monthly savings needed to reach $50,000 in 2 years",
			},
			workflowContext,
		);
		console.log(
			"✅ Math Result:",
			typeof mathResult === "string"
				? mathResult
				: JSON.stringify(mathResult, null, 2),
		);

		console.log("\n📋 Step 2: Content Creation");
		const writingResult = await writingTool.runAsync(
			{
				input:
					"Create a motivational savings plan document based on the mathematical calculation",
			},
			workflowContext,
		);
		console.log(
			"✅ Writing Result:",
			typeof writingResult === "string"
				? writingResult
				: JSON.stringify(writingResult, null, 2),
		);

		console.log("\n📊 Final Session State:");
		console.log(
			"Math result stored:",
			(workflowContext.state as any).math_result ? "✅" : "❌",
		);
		console.log(
			"Writing result stored:",
			(workflowContext.state as any).written_content ? "✅" : "❌",
		);

		console.log(`\n${"=".repeat(80)}`);
		console.log("\n🎉 Agent Tool Demo Complete!");
		console.log("\n💡 Key Benefits Demonstrated:");
		console.log("   • Agents can be used as reusable tools");
		console.log("   • Results can be stored in session state with outputKey");
		console.log("   • Custom function declarations provide flexible schemas");
		console.log("   • Multiple agent tools can work together in workflows");
		console.log("   • Specialized expertise becomes modular and composable");
	} catch (error) {
		console.error("❌ Failed to run demo:", error.message);
		console.error("Full error:", error);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	demonstrateAgentTool().catch(console.error);
}
