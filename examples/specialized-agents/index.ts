import {
	Agent,
	GoogleLLM,
	LLMRegistry,
	LangGraphAgent,
	type LangGraphNode,
	LoopAgent,
	ParallelAgent,
	SequentialAgent,
} from "@adk";
import * as dotenv from "dotenv";

// Load environment variables from .env file if it exists
dotenv.config();

// Use the provided OpenAI API key as in the simple-agent example

// Explicitly register Google providers
LLMRegistry.registerLLM(GoogleLLM);

// Debug: Log registered models
LLMRegistry.logRegisteredModels();

// Example of using specialized agents
async function runSpecializedAgentExamples() {
	console.log("==== Specialized Agents Examples ====");

	// Create component agents - using gemini-2.0-flash which works in the simple-agent example
	const researchAgent = new Agent({
		name: "researcher",
		model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
		description: "Conducts research on a topic",
		instructions:
			"You are a research assistant. Your job is to find information about topics.",
	});

	const summaryAgent = new Agent({
		name: "summarizer",
		model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
		description: "Summarizes information",
		instructions:
			"You are a summarization expert. Your job is to create concise summaries.",
	});

	const analyzerAgent = new Agent({
		name: "analyzer",
		model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
		description: "Analyzes information",
		instructions:
			"You are an analytical assistant. Your job is to analyze information and provide insights.",
	});

	const weatherAgent = new Agent({
		name: "weather_expert",
		model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
		description: "Provides information about weather",
		instructions:
			"You are a weather expert. Provide information about weather patterns.",
	});

	const drafterAgent = new Agent({
		name: "content_drafter",
		model: "gemini-2.0-flash", // This will use the LLMRegistry to get the right provider
		description: "Drafts content iteratively",
		instructions:
			"You are a content writer. Your job is to draft and refine content.",
	});

	// Example 1: Sequential Agent (Research -> Summarize)
	console.log("\n=== Example 1: Sequential Agent ===");
	const sequentialAgent = new SequentialAgent({
		name: "research_pipeline",
		description: "Researches a topic and then summarizes it",
		agents: [researchAgent, summaryAgent],
	});

	const sequentialResponse = await sequentialAgent.run({
		messages: [
			{ role: "user", content: "Tell me about artificial intelligence." },
		],
	});
	console.log("\nSequential Agent Response:");
	console.log(sequentialResponse.content);

	// Example 2: Parallel Agent (Weather + Analysis in parallel)
	console.log("\n=== Example 2: Parallel Agent ===");
	const parallelAgent = new ParallelAgent({
		name: "multi_perspective",
		description: "Provides multiple perspectives on a topic",
		agents: [weatherAgent, analyzerAgent],
	});

	const parallelResponse = await parallelAgent.run({
		messages: [
			{ role: "user", content: "How might climate change affect agriculture?" },
		],
	});
	console.log("\nParallel Agent Response:");
	console.log(parallelResponse.content);

	// Example 3: Loop Agent (Iterative Content Drafting)
	console.log("\n=== Example 3: Loop Agent ===");
	const loopAgent = new LoopAgent({
		name: "iterative_drafter",
		description: "Drafts content through multiple iterations",
		agent: drafterAgent,
		maxIterations: 3,
	});

	const loopResponse = await loopAgent.run({
		messages: [
			{
				role: "user",
				content: "Draft a short blog post about machine learning.",
			},
		],
	});
	console.log("\nLoop Agent Response:");
	console.log(loopResponse.content);

	// Example 4: LangGraph Agent (Complex Workflow)
	console.log("\n=== Example 4: LangGraph Agent ===");

	// Create new agents for LangGraph (can't reuse agents that already have parents)
	const graphResearchAgent = new Agent({
		name: "graph_researcher",
		model: "gemini-2.0-flash",
		description: "Conducts research on a topic",
		instructions:
			"You are a research assistant. Your job is to find information about topics.",
	});

	const graphSummaryAgent = new Agent({
		name: "graph_summarizer",
		model: "gemini-2.0-flash",
		description: "Summarizes information",
		instructions:
			"You are a summarization expert. Your job is to create concise summaries.",
	});

	const graphAnalyzerAgent = new Agent({
		name: "graph_analyzer",
		model: "gemini-2.0-flash",
		description: "Analyzes information",
		instructions:
			"You are an analytical assistant. Your job is to analyze information and provide insights.",
	});

	const graphDrafterAgent = new Agent({
		name: "graph_drafter",
		model: "gemini-2.0-flash",
		description: "Drafts content iteratively",
		instructions:
			"You are a content writer. Your job is to draft and refine content.",
	});

	// Define the graph nodes
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

	const graphResponse = await graphAgent.run({
		messages: [
			{
				role: "user",
				content: "Explain the concept of reinforcement learning.",
			},
		],
	});
	console.log("\nLangGraph Agent Response:");
	console.log(graphResponse.content);
}

// Run all examples
runSpecializedAgentExamples().catch((error) => {
	console.error("Error running examples:", error);
});
