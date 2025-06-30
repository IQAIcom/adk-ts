import { env } from "node:process";
import {
	type BaseAgent,
	InMemorySessionService,
	LangGraphAgent,
	type LangGraphNode,
	LlmAgent,
	LoopAgent,
	ParallelAgent,
	Runner,
	SequentialAgent,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "specialized-agents-demo";
const USER_ID = uuidv4();

/**
 * Specialized Agents Example
 *
 * This example demonstrates how to use specialized agent types for complex
 * multi-agent orchestration and coordination. It shows different patterns
 * for combining multiple agents to achieve sophisticated behaviors.
 *
 * The example:
 * 1. Demonstrates SequentialAgent for pipeline processing
 * 2. Shows ParallelAgent for concurrent multi-perspective analysis
 * 3. Illustrates LoopAgent for iterative refinement
 * 4. Presents LangGraphAgent for complex workflow orchestration
 * 5. Compares different multi-agent coordination patterns
 *
 * Expected Output:
 * - Sequential pipeline processing (research → summarize)
 * - Parallel concurrent analysis (multiple perspectives)
 * - Iterative content refinement through loops
 * - Complex workflow orchestration with branching logic
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
	console.log("🎭 Starting Specialized Agents example...");

	try {
		/**
		 * Run specialized agent demonstrations
		 * Each example shows a different multi-agent coordination pattern
		 */
		await demonstrateSequentialAgent();
		await demonstrateParallelAgent();
		await demonstrateLoopAgent();
		await demonstrateLangGraphAgent();

		console.log("\n✅ Specialized Agents example completed!");
	} catch (error) {
		console.error("❌ Error in specialized agents example:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates SequentialAgent for pipeline processing
 */
async function demonstrateSequentialAgent(): Promise<void> {
	console.log("\n=== Example 1: Sequential Agent ===");

	/**
	 * Create component agents for the pipeline
	 * Research agent → Summary agent
	 */
	const researchAgent = createResearchAgent("researcher");
	const summaryAgent = createSummaryAgent("summarizer");

	const sequentialAgent = new SequentialAgent({
		name: "research_pipeline",
		description: "Researches a topic and then summarizes it",
		subAgents: [researchAgent, summaryAgent],
	});

	const response = await runAgentWithQuery(
		sequentialAgent,
		"Tell me about artificial intelligence.",
	);

	console.log("\nSequential Agent Response:");
	console.log(response);
}

/**
 * Demonstrates ParallelAgent for concurrent processing
 */
async function demonstrateParallelAgent(): Promise<void> {
	console.log("\n=== Example 2: Parallel Agent ===");

	/**
	 * Create component agents for parallel processing
	 * Weather agent and Analyzer agent run concurrently
	 */
	const weatherAgent = createWeatherAgent("weather_expert");
	const analyzerAgent = createAnalyzerAgent("analyzer");

	const parallelAgent = new ParallelAgent({
		name: "multi_perspective",
		description: "Provides multiple perspectives on a topic",
		subAgents: [weatherAgent, analyzerAgent],
	});

	const response = await runAgentWithQuery(
		parallelAgent,
		"How might climate change affect agriculture?",
	);

	console.log("\nParallel Agent Response:");
	console.log(response);
}

/**
 * Demonstrates LoopAgent for iterative processing
 */
async function demonstrateLoopAgent(): Promise<void> {
	console.log("\n=== Example 3: Loop Agent ===");

	/**
	 * Create component agent for iterative refinement
	 * Drafter agent refines content through multiple iterations
	 */
	const drafterAgent = createDrafterAgent("content_drafter");

	const loopAgent = new LoopAgent({
		name: "iterative_drafter",
		description: "Drafts content through multiple iterations",
		subAgents: [drafterAgent],
		maxIterations: 3,
	});

	const response = await runAgentWithQuery(
		loopAgent,
		"Draft a short blog post about machine learning.",
	);

	console.log("\nLoop Agent Response:");
	console.log(response);
}

/**
 * Demonstrates LangGraphAgent for complex workflow orchestration
 */
async function demonstrateLangGraphAgent(): Promise<void> {
	console.log("\n=== Example 4: LangGraph Agent ===");

	/**
	 * Create specialized agents for the graph workflow
	 * Must create new instances for LangGraph (can't reuse agents with parents)
	 */
	const graphResearchAgent = createResearchAgent("graph_researcher");
	const graphSummaryAgent = createSummaryAgent("graph_summarizer");
	const graphAnalyzerAgent = createAnalyzerAgent("graph_analyzer");
	const graphDrafterAgent = createDrafterAgent("graph_drafter");

	/**
	 * Define the workflow graph structure
	 * start → [analyze, summarize] → finalize
	 */
	const nodes: LangGraphNode[] = [
		{
			name: "start",
			agent: graphResearchAgent,
			targets: ["analyze", "summarize"],
		},
		{
			name: "analyze",
			agent: graphAnalyzerAgent,
			targets: ["finalize"],
		},
		{
			name: "summarize",
			agent: graphSummaryAgent,
			targets: ["finalize"],
		},
		{
			name: "finalize",
			agent: graphDrafterAgent,
			targets: [],
		},
	];

	const graphAgent = new LangGraphAgent({
		name: "complex_workflow",
		description: "Research, analyze, and summarize a topic with a final draft",
		nodes,
		rootNode: "start",
	});

	const response = await runAgentWithQuery(
		graphAgent,
		"Explain the concept of reinforcement learning.",
	);

	console.log("\nLangGraph Agent Response:");
	console.log(response);
}

/**
 * Runs an agent with a specific query and returns the response
 * @param agent The BaseAgent to execute
 * @param userMessage The message to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentWithQuery(
	agent: BaseAgent,
	userMessage: string,
): Promise<string> {
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	let agentResponse = "";

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId: session.id,
		newMessage: {
			parts: [{ text: userMessage }],
		},
	})) {
		if (event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");
			if (content) {
				agentResponse += content;
			}
		}
	}

	return agentResponse || "No response from agent";
}

/**
 * Creates a research agent with specified name
 * @param name The name for the research agent
 * @returns Configured LlmAgent for research tasks
 */
function createResearchAgent(name: string): LlmAgent {
	return new LlmAgent({
		name,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Conducts research on a topic",
		instruction:
			"You are a research assistant. Your job is to find information about topics.",
	});
}

/**
 * Creates a summary agent with specified name
 * @param name The name for the summary agent
 * @returns Configured LlmAgent for summarization tasks
 */
function createSummaryAgent(name: string): LlmAgent {
	return new LlmAgent({
		name,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Summarizes information",
		instruction:
			"You are a summarization expert. Your job is to create concise summaries.",
	});
}

/**
 * Creates an analyzer agent with specified name
 * @param name The name for the analyzer agent
 * @returns Configured LlmAgent for analysis tasks
 */
function createAnalyzerAgent(name: string): LlmAgent {
	return new LlmAgent({
		name,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Analyzes information",
		instruction:
			"You are an analytical assistant. Your job is to analyze information and provide insights.",
	});
}

/**
 * Creates a weather expert agent with specified name
 * @param name The name for the weather agent
 * @returns Configured LlmAgent for weather-related tasks
 */
function createWeatherAgent(name: string): LlmAgent {
	return new LlmAgent({
		name,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Provides information about weather",
		instruction:
			"You are a weather expert. Provide information about weather patterns.",
	});
}

/**
 * Creates a content drafter agent with specified name
 * @param name The name for the drafter agent
 * @returns Configured LlmAgent for content drafting tasks
 */
function createDrafterAgent(name: string): LlmAgent {
	return new LlmAgent({
		name,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Drafts content iteratively",
		instruction:
			"You are a content writer. Your job is to draft and refine content.",
	});
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
