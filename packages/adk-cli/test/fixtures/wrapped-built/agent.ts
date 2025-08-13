import { AgentBuilder } from "@iqai/adk";

export async function buildWrapped() {
	const built = await AgentBuilder.create("wrapped_agent")
		.withModel("dummy-model")
		.withDescription("Wrapped built agent structure return")
		.withInstruction("Wrap return.")
		.build();
	return built; // { agent, runner, session }
}
