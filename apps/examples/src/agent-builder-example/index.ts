import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	createDatabaseSessionService,
	GoogleSearch,
	HttpRequestTool,
	InMemoryMemoryService,
} from "@iqai/adk";
import dedent from "dedent";

/**
 * Application configuration constants
 */
const APP_NAME = "AgentBuilderDemo";
const USER_ID = "demo-user";

/**
 * AgentBuilder Example
 *
 * This example demonstrates the various ways to use AgentBuilder for creating
 * and managing AI agents. It showcases different patterns from simple one-off
 * questions to complex multi-agent workflows with persistence.
 *
 * The example demonstrates:
 * 1. Simple question-answer pattern
 * 2. Agent with tools and instructions
 * 3. Session management and persistence
 * 4. Multi-agent workflows (sequential, parallel)
 * 5. Memory and artifact integration
 *
 * Expected Output:
 * - Various agent responses demonstrating different capabilities
 * - Session persistence across runs
 * - Tool usage and multi-agent coordination
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 * - Internet connection for web search tool
 */
async function main() {
	console.log("🏗️  Starting AgentBuilder comprehensive example...\n");

	try {
		// 1. Simplest possible usage - direct question
		await demonstrateSimpleUsage();

		// 2. Agent with tools and instructions
		await demonstrateToolsAndInstructions();

		// 3. Session management and persistence
		await demonstrateSessionManagement();

		// 4. Multi-agent workflows
		await demonstrateMultiAgentWorkflows();

		console.log("\n✅ AgentBuilder comprehensive example completed!");
	} catch (error) {
		console.error("❌ Error in AgentBuilder example:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates the simplest AgentBuilder usage pattern
 */
async function demonstrateSimpleUsage(): Promise<void> {
	console.log("1️⃣ Simple Usage Pattern");
	console.log("═══════════════════════");

	const question = "What is the capital of France?";
	console.log(`📝 Question: ${question}`);

	const response = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash"
	).ask(question);

	console.log(`🤖 Response: ${response}\n`);
}

/**
 * Demonstrates AgentBuilder with tools and custom instructions
 */
async function demonstrateToolsAndInstructions(): Promise<void> {
	console.log("2️⃣ Agent with Tools and Instructions");
	console.log("═══════════════════════════════════");

	const query =
		"Search for recent news about artificial intelligence and summarize the findings";
	console.log(`📝 Query: ${query}`);

	const response = await AgentBuilder.create("research_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("A research agent specializing in information gathering")
		.withInstruction(dedent`
			You are a research assistant. Use available tools to gather information
			and provide comprehensive, well-structured summaries. Always cite your
			sources and present findings in a clear, organized manner.
		`)
		.withTools(new GoogleSearch(), new HttpRequestTool())
		.ask(query);

	console.log(`🤖 Research Agent: ${response}\n`);
}

/**
 * Demonstrates session management and persistence with AgentBuilder
 */
async function demonstrateSessionManagement(): Promise<void> {
	console.log("3️⃣ Session Management and Persistence");
	console.log("════════════════════════════════════");

	// Create agent with persistent session
	const { agent, runner, session } = await AgentBuilder.create(
		"persistent_agent"
	)
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that remembers our conversation")
		.withInstruction(dedent`
			You are a helpful assistant that maintains context across our conversation.
			Remember important details from our discussion and reference them when relevant.
			Be conversational and personable while staying helpful and accurate.
		`)
		.withSession(
			createDatabaseSessionService(getSqliteConnectionString("agentbuilder")),
			USER_ID,
			APP_NAME,
			new InMemoryMemoryService()
		)
		.build();

	if (!(runner && session)) {
		throw new Error("Failed to create runner and session");
	}

	// First interaction
	console.log("💬 First interaction:");
	await runConversation(
		runner,
		session.id,
		"My name is Alice. Remember this for our conversation."
	);

	// Second interaction - testing memory
	console.log("\n💬 Second interaction (testing memory):");
	await runConversation(
		runner,
		session.id,
		"What was my name that I told you earlier?"
	);

	console.log(
		"💡 Run this example multiple times to see session persistence!\n"
	);
}

/**
 * Demonstrates multi-agent workflows using AgentBuilder
 */
async function demonstrateMultiAgentWorkflows(): Promise<void> {
	console.log("4️⃣ Multi-Agent Workflows");
	console.log("═══════════════════════");

	// Create specialized sub-agents
	const researchAgent = AgentBuilder.create("researcher")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Specializes in research and fact-finding")
		.withInstruction(dedent`
			You are a research specialist. Focus on gathering accurate information
			about the topic. Use your tools to find current, reliable sources and
			provide factual, detailed research findings with proper attribution.
		`)
		.withTools(new GoogleSearch())
		.build();

	const summaryAgent = AgentBuilder.create("summarizer")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Specializes in creating concise summaries")
		.withInstruction(dedent`
			You are a summary specialist. Take research findings and create clear,
			concise, well-structured summaries. Focus on key points and insights,
			organizing information in a logical flow with proper headings and bullet points.
		`)
		.build();

	// Create and execute sequential workflow
	console.log("📋 Sequential Workflow (Research → Summarize):");
	console.log("   Creating and executing sequential workflow...");

	const { runner: sequentialRunner, session: sequentialSession } =
		await AgentBuilder.create("sequential_workflow")
			.withDescription("A workflow that researches and then summarizes")
			.asSequential([(await researchAgent).agent, (await summaryAgent).agent])
			.withQuickSession(APP_NAME, USER_ID)
			.build();

	if (!(sequentialRunner && sequentialSession)) {
		throw new Error("Failed to create sequential workflow runner and session");
	}

	// Execute the actual sequential workflow
	console.log("🔬 Executing: Research → Summarize workflow");
	await runConversation(
		sequentialRunner,
		sequentialSession.id,
		"Research the latest developments in TypeScript 5.0 and provide a summary of the key features"
	);

	// Demonstrate parallel workflow execution
	console.log("\n🔀 Parallel Workflow Execution:");
	console.log("   Executing parallel analysis with specialized agents...");

	// Execute parallel analysis with concurrent async calls
	console.log("⚡ Executing parallel analysis...");
	const topic = "artificial intelligence in healthcare";

	const [technicalResult, businessResult] = await Promise.all([
		AgentBuilder.create("tech_runner")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withInstruction(dedent`
				Analyze the technical aspects of artificial intelligence in healthcare.
				Focus on algorithms, implementation challenges, technical innovations,
				and engineering considerations. Include details about:
				- Machine learning models and architectures
				- Data processing and integration challenges
				- Performance and scalability requirements
				- Technical implementation barriers
			`)
			.ask(`Provide a technical analysis of ${topic}`),

		AgentBuilder.create("business_runner")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withInstruction(dedent`
				Analyze the business aspects of artificial intelligence in healthcare.
				Focus on market impact, adoption rates, and business opportunities.
				Cover these key areas:
				- Market size and growth projections
				- Adoption barriers and drivers
				- ROI and cost-benefit analysis
				- Regulatory and compliance considerations
				- Competitive landscape and opportunities
			`)
			.ask(`Provide a business analysis of ${topic}`),
	]);

	console.log("🔧 Technical Analysis:");
	console.log(technicalResult);
	console.log("\n💼 Business Analysis:");
	console.log(businessResult);

	// Create final synthesis
	console.log("\n🎯 Synthesis Agent - Combining Insights:");
	const synthesisResult = await AgentBuilder.create("synthesis_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction(dedent`
			You are a synthesis specialist. Combine technical and business insights
			into a comprehensive overview. Create a unified analysis that:
			- Identifies key connections between technical and business factors
			- Highlights potential synergies and conflicts
			- Provides strategic recommendations
			- Presents a balanced, holistic perspective
		`)
		.ask(dedent`
			Combine these analyses into a comprehensive overview:

			Technical Analysis:
			${technicalResult}

			Business Analysis:
			${businessResult}

			Provide a unified perspective on ${topic}.
		`);

	console.log("🎯 Synthesized Overview:");
	console.log(synthesisResult);
	console.log("\n✅ Multi-agent workflow execution completed!\n");
}

/**
 * Helper function to run a conversation and display results
 */
async function runConversation(
	runner: any,
	sessionId: string,
	message: string
): Promise<void> {
	console.log(`👤 User: ${message}`);

	let response = "";
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: {
			parts: [{ text: message }],
		},
	})) {
		if (event.content?.parts && !event.partial) {
			const content = event.content.parts.map((p) => p.text).join("");
			if (content) {
				response += content;
			}
		}
	}

	console.log(`🤖 Agent: ${response}`);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});

/**
 * Get SQLite connection string for the given database name
 * Creates the directory if it doesn't exist
 * @param dbName Name of the database file (without extension)
 * @returns SQLite connection string
 */
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);

	// Ensure the directory exists
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}

	return `sqlite://${dbPath}`;
}
