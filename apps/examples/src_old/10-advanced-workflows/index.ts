import { env } from "node:process";
import { AgentBuilder, LlmAgent, createTool } from "@iqai/adk";
import * as z from "zod";
import { ask } from "../utils";

/**
 * 10 - Advanced Workflows
 *
 * Shows how to build multi-agent workflows with state management,
 * conditional branching, and error recovery patterns.
 *
 * Concepts covered:
 * - Multi-agent orchestration
 * - LangGraph-style state machines
 * - Workflow state management
 * - Conditional branching
 * - Error recovery patterns
 */

// Workflow state management
const workflowStateTool = createTool({
	name: "update_workflow_state",
	description: "Update the current workflow state and progress",
	schema: z.object({
		stage: z.string().describe("Current workflow stage"),
		status: z
			.enum(["pending", "in_progress", "completed", "failed"])
			.describe("Stage status"),
		data: z
			.record(z.string(), z.any())
			.optional()
			.describe("Stage-specific data"),
		nextStage: z.string().optional().describe("Next stage to execute"),
	}),
	fn: ({ stage, status, data, nextStage }, context) => {
		const workflow = context.state.get("workflow", {
			stages: {},
			currentStage: null,
			progress: [],
		});

		// Update stage status
		workflow.stages[stage] = {
			status,
			data: data || {},
			timestamp: new Date().toISOString(),
			nextStage,
		};

		// Update progress log
		workflow.progress.push({
			stage,
			status,
			timestamp: new Date().toISOString(),
			message: `Stage '${stage}' marked as ${status}`,
		});

		// Update current stage
		if (status === "completed" && nextStage) {
			workflow.currentStage = nextStage;
		} else if (status === "in_progress") {
			workflow.currentStage = stage;
		}

		context.state.set("workflow", workflow);

		return {
			success: true,
			workflow,
			message: `Workflow updated: ${stage} -> ${status}`,
		};
	},
});

// Decision making tool
const makeDecisionTool = createTool({
	name: "make_decision",
	description:
		"Make a decision based on criteria and update workflow accordingly",
	schema: z.object({
		decision: z.string().describe("The decision made"),
		criteria: z.array(z.string()).describe("Criteria used for decision"),
		confidence: z.number().min(0).max(1).describe("Confidence level (0-1)"),
		nextActions: z.array(z.string()).describe("Next actions to take"),
	}),
	fn: ({ decision, criteria, confidence, nextActions }, context) => {
		const decisions = context.state.get("decisions", []);

		const newDecision = {
			id: Date.now(),
			decision,
			criteria,
			confidence,
			nextActions,
			timestamp: new Date().toISOString(),
		};

		decisions.push(newDecision);
		context.state.set("decisions", decisions);

		return {
			success: true,
			decision: newDecision,
			totalDecisions: decisions.length,
			message: `Decision made: ${decision} (confidence: ${(
				confidence * 100
			).toFixed(1)}%)`,
		};
	},
});

async function demonstrateBasicWorkflow() {
	console.log("� Basic Workflow Orchestration\n");

	// Create workflow coordinator
	const coordinator = new LlmAgent({
		name: "workflow_coordinator",
		description: "Coordinates multi-step workflows",
		instruction:
			"Break down complex tasks into stages, track progress, and coordinate execution.",
		tools: [workflowStateTool, makeDecisionTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Create specialized workers
	const researchAgent = new LlmAgent({
		name: "research_specialist",
		description: "Conducts research and gathers information",
		instruction:
			"Conduct thorough research, provide comprehensive information, and highlight key findings.",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const analysisAgent = new LlmAgent({
		name: "analysis_specialist",
		description: "Analyzes data and provides insights",
		instruction:
			"Identify patterns, provide insights, draw conclusions, and recommend next steps.",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Create workflow system
	const { runner } = await AgentBuilder.create("workflow_orchestrator")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Workflow orchestration system")
		.withInstruction(
			"Coordinate multi-stage workflows using specialized agents.",
		)
		.withSubAgents([coordinator, researchAgent, analysisAgent])
		.build();

	await ask(
		runner,
		"Create a market analysis for electric vehicle charging stations. Break this into research and analysis stages, tracking progress through each step.",
	);
}

async function demonstrateLangGraphStyleWorkflow() {
	console.log("� LangGraph-Style State Machine\n");

	// Create agents for each workflow node
	const requirementsAgent = new LlmAgent({
		name: "requirements_gatherer",
		description: "Gathers and analyzes requirements",
		instruction: "Gather detailed requirements and assess their completeness.",
		tools: [workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const complexityAnalyzer = new LlmAgent({
		name: "complexity_analyzer",
		description: "Analyzes task complexity",
		instruction:
			"Analyze complexity and choose between simple or complex processing paths.",
		tools: [makeDecisionTool, workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const simpleProcessor = new LlmAgent({
		name: "simple_processor",
		description: "Handles simple tasks",
		instruction: "Handle simple tasks efficiently with direct solutions.",
		tools: [workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const complexProcessor = new LlmAgent({
		name: "complex_processor",
		description: "Handles complex tasks",
		instruction:
			"Handle complex tasks with detailed analysis and comprehensive solutions.",
		tools: [workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Create LangGraph workflow
	const { runner } = await AgentBuilder.create("langgraph_workflow")
		.withDescription("LangGraph-based state machine workflow")
		.asLangGraph(
			[
				{
					name: "gather_requirements",
					agent: requirementsAgent,
					targets: ["analyze_complexity"],
				},
				{
					name: "analyze_complexity",
					agent: complexityAnalyzer,
					targets: ["simple_processing", "complex_processing"],
				},
				{
					name: "simple_processing",
					agent: simpleProcessor,
					targets: [],
					condition: async (_, context) => {
						const decisions = context.session.state.get("decisions", []);
						const lastDecision = decisions[decisions.length - 1];
						return lastDecision?.decision?.toLowerCase().includes("simple");
					},
				},
				{
					name: "complex_processing",
					agent: complexProcessor,
					targets: [],
					condition: async (_, context) => {
						const decisions = context.session.state.get("decisions", []);
						const lastDecision = decisions[decisions.length - 1];
						return lastDecision?.decision?.toLowerCase().includes("complex");
					},
				},
			],
			"gather_requirements",
		)
		.build();

	await ask(
		runner,
		"Create a customer onboarding system. Analyze complexity and route to appropriate processing.",
	);
}

async function demonstrateErrorRecoveryWorkflow() {
	console.log("�️ Error Recovery and Retry Patterns\n");

	// Error recovery coordinator
	const errorRecoveryAgent = new LlmAgent({
		name: "error_recovery_coordinator",
		description: "Manages error recovery and retry logic",
		instruction:
			"Handle failures gracefully, assess errors, determine retry strategies, and escalate when needed.",
		tools: [workflowStateTool, makeDecisionTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Resilient worker that can fail and recover
	const resilientWorker = new LlmAgent({
		name: "resilient_worker",
		description: "A worker that demonstrates error scenarios and recovery",
		instruction:
			"Simulate various failure scenarios and suggest recovery strategies when failures occur.",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const { runner } = await AgentBuilder.create("error_recovery_orchestrator")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Error recovery workflow orchestrator")
		.withInstruction(
			"Orchestrate error recovery workflows and coordinate retry strategies.",
		)
		.withSubAgents([errorRecoveryAgent, resilientWorker])
		.build();

	await ask(
		runner,
		"Simulate processing customer data with potential failures. Show retry logic, alternative approaches, and escalation patterns.",
	);
}

async function main() {
	console.log("🏗️ Advanced Workflows Example\n");

	await demonstrateBasicWorkflow();
	await demonstrateLangGraphStyleWorkflow();
	await demonstrateErrorRecoveryWorkflow();

	console.log("✅ All workflow patterns completed!");
}

main().catch(console.error);
