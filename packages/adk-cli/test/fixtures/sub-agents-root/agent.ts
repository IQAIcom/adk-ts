import { AgentBuilder } from "@iqai/adk";
import { LlmAgent } from "@iqai/adk";

function makeChild(name: string) {
	return new LlmAgent({
		name,
		description: "child agent",
		model: "dummy-model",
		instruction: "child",
	});
}

export async function getRootAgent() {
	const childA = makeChild("child_a");
	const childB = makeChild("child_b");
	const built = await AgentBuilder.create("root_agent")
		.withModel("dummy-model")
		.withDescription("Root with sub agents")
		.withInstruction("delegate")
		.withSubAgents([childA, childB])
		.build();
	return built; // { agent, runner, session }
}
