import { env } from "node:process";
import { AgentBuilder, McpToolset } from "@iqai/adk";
import dedent from "dedent";

/**
 * 14 - MCP Tool Duplication Test
 *
 * Testing with Fraxlend MCP to isolate the tool duplication issue.
 */

async function main() {
	console.log("🔧 Testing MCP Tool Duplication with Fraxlend");
	console.log("==============================================\n");

	const fraxlendToolset = new McpToolset({
		name: "Fraxlend Server",
		description: "Fraxlend MCP server for testing",
		transport: {
			mode: "stdio",
			command: "node",
			args: ["/Users/sid/repos/work/mcp-fraxlend/dist/index.js"],
		},
	});

	try {
		console.log("🔌 Connecting to Fraxlend MCP server...");
		const tools = await fraxlendToolset.getTools();
		console.log(`✅ Connected! Found ${tools.length} tools\n`);

		// List the tools
		tools.forEach((tool, index) => {
			console.log(`${index + 1}. ${tool.name} - ${tool.description}`);
		});
		console.log("");

		// Just use the first tool to test duplication
		const firstTool = tools[0];
		if (firstTool) {
			console.log(`🧪 Testing with tool: ${firstTool.name}`);

			const { runner } = await AgentBuilder.create("fraxlend_test")
				.withModel(env.LLM_MODEL || "gemini-2.5-flash")
				.withDescription("Testing Fraxlend MCP tool")
				.withInstruction(dedent`
					You are testing a Fraxlend tool. Use the available tool to show it works.
				`)
				.withTools(firstTool)
				.build();

			const response = await runner.ask(
				"Use the available tool to test it works.",
			);
			console.log(`\nResponse: ${response}`);
		}

		await fraxlendToolset.close();
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

main().catch(console.error);
