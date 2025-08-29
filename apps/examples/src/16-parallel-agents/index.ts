import { env } from "node:process";
import { AgentBuilder, LlmAgent, ParallelAgent } from "@iqai/adk";

// Researcher 1: Renewable Energy
const renewableEnergyResearcher = new LlmAgent({
	name: "RenewableEnergyResearcher",
	model: env.LLM_MODEL,
	instruction:
		"You are an AI Research Assistant specializing in energy. Research the latest advancements in 'renewable energy sources'. Summarize your key findings concisely (1-2 sentences). Output only the summary.",
	description: "Researches renewable energy sources.",
	outputKey: "renewable_energy_result",
	disallowTransferToParent: true,
	disallowTransferToPeers: true,
});

// Researcher 2: Electric Vehicles
const evResearcher = new LlmAgent({
	name: "EVResearcher",
	model: env.LLM_MODEL,
	instruction:
		"You are an AI Research Assistant specializing in transportation. Research the latest developments in 'electric vehicle technology'. Summarize your key findings concisely (1-2 sentences). Output only the summary.",
	description: "Researches electric vehicle technology.",
	outputKey: "ev_technology_result",
	disallowTransferToParent: true,
	disallowTransferToPeers: true,
});

// Researcher 3: Carbon Capture
const carbonCaptureResearcher = new LlmAgent({
	name: "CarbonCaptureResearcher",
	model: env.LLM_MODEL,
	instruction:
		"You are an AI Research Assistant specializing in climate solutions. Research the current state of 'carbon capture methods'. Summarize your key findings concisely (1-2 sentences). Output only the summary.",
	description: "Researches carbon capture methods.",
	outputKey: "carbon_capture_result",
	disallowTransferToParent: true,
	disallowTransferToPeers: true,
});

async function main() {
	// --- 2. Create the ParallelAgent (Runs researchers concurrently)
	const parallelResearchAgent = new ParallelAgent({
		name: "ParallelWebResearchAgent",
		subAgents: [
			renewableEnergyResearcher,
			evResearcher,
			carbonCaptureResearcher,
		],
		description:
			"Runs multiple research agents in parallel to gather information.",
	});

	// --- 3. Define the Merger Agent (Runs after the parallel agents)
	const mergerAgent = new LlmAgent({
		name: "SynthesisAgent",
		model: env.LLM_MODEL,
		instruction:
			"You are an AI Assistant responsible for combining research findings into a structured report.\n\nYour primary task is to synthesize the following research summaries, clearly attributing findings to their source areas. Structure your response using headings for each topic. Ensure the report is coherent and integrates the key points smoothly.\n\nCrucially: Your entire response MUST be grounded exclusively on the information provided in the 'Input Summaries' below. Do NOT add any external knowledge, facts, or details not present in these specific summaries.\n\nInput Summaries:\n\n- Renewable Energy: {renewable_energy_result}\n- Electric Vehicles: {ev_technology_result}\n- Carbon Capture: {carbon_capture_result}\n\nOutput Format:\n\n## Summary of Recent Sustainable Technology Advancements\n\n### Renewable Energy Findings\n(Based on RenewableEnergyResearcher's findings)\n[Summarize only the renewable energy input above.]\n\n### Electric Vehicle Findings\n(Based on EVResearcher's findings)\n[Summarize only the EV input above.]\n\n### Carbon Capture Findings\n(Based on CarbonCaptureResearcher's findings)\n[Summarize only the carbon capture input above.]\n\n### Overall Conclusion\n[Provide a brief concluding statement connecting only the findings presented above.]\n\nOutput only the structured report following this format.",
		description:
			"Combines research findings from parallel agents into a structured, cited report, strictly grounded on provided inputs.",
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});

	// --- 4. Create the SequentialAgent (Orchestrates the overall flow)
	const { runner } = await AgentBuilder.create("ResearchAndSynthesisPipeline")
		.withDescription(
			"Coordinates parallel research and synthesizes the results.",
		)
		.withModel(env.LLM_MODEL!)
		.asSequential([parallelResearchAgent, mergerAgent])
		.withQuickSession()
		.build();

	const query = "Summarize recent sustainable tech advancements.";
	const response = await runner.ask(query);
	console.log(response);
}

main().catch(console.error);
