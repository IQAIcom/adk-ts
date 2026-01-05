import { AgentBuilder, FileOperationsTool, HttpRequestTool } from "@iqai/adk";
import dedent from "dedent";

export async function agent() {
	const { runner } = await AgentBuilder.create("integration_agent")
		.withModel("gemini-2.5-flash")
		.withDescription("Agent with HTTP and file system integration")
		.withInstruction(
			dedent`
			You can make HTTP requests and manage files.
			Fetch data from APIs and save results to files.
		`,
		)
		.withTools(
			new HttpRequestTool(),
			new FileOperationsTool({ basePath: "temp" }),
		)
		.build();

	return runner;
}
