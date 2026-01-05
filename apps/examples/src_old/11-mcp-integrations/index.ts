import { env } from "node:process";
import { AgentBuilder, McpToolset, createSamplingHandler } from "@iqai/adk";
import dedent from "dedent";
import { ask } from "../utils";

/**
 * 11 - MCP (Model Context Protocol) Integrations
 *
 * Learn how to integrate with MCP servers and use sampling for
 * dynamic, context-aware responses.
 *
 * Concepts covered:
 * - Custom MCP server creation with FastMCP
 * - MCP toolset integration
 * - Agent-based sampling for personalized responses
 * - Tool composition patterns
 */

async function demonstrateCustomMcpServer() {
	console.log("📝 Part 1: Custom MCP Server with Sampling");
	console.log("═══════════════════════════════════════════\n");

	// Create a simple agent for sampling responses
	const { runner: samplingRunner } = await AgentBuilder.create(
		"sampling_assistant",
	)
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(
			"Assistant that provides user context for sampling requests",
		)
		.withInstruction(
			dedent`
			You are a helpful assistant that provides user context when requested.
			When asked for a user's name or identity, respond with "Alice Johnson".
			Keep responses brief and relevant to the sampling request.
		`,
		)
		.build();

	// Create sampling handler using the agent runner
	const samplingHandler = createSamplingHandler(async (request) => {
		console.log("📡 Sampling request received from MCP server");
		console.log(`   Request: ${JSON.stringify(request)}`);

		// Use the agent runner to handle the sampling request
		return ask(
			samplingRunner.ask.bind(samplingRunner),
			"What is the user's name for personalization?",
		);
	});

	// Create MCP toolset with our custom server
	const greetingToolset = new McpToolset({
		name: "Greeting Server",
		description: "Custom MCP server with sampling capabilities",
		samplingHandler,
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["tsx", "apps/examples/src/11-mcp-integrations/greeting-server.ts"],
		},
	});

	try {
		console.log("🔌 Connecting to custom MCP server...");
		const tools = await greetingToolset.getTools();
		console.log(
			`✅ Connected! Available tools: ${tools.map((t) => t.name).join(", ")}`,
		);

		// Create agent with MCP tools
		const { runner } = await AgentBuilder.create("mcp_assistant")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("Assistant with custom MCP server integration")
			.withInstruction(
				dedent`
				You have access to custom MCP tools that can use sampling to get user information.
				Use the greeting tool to provide personalized responses.
				Always use the available tools when appropriate.
			`,
			)
			.withTools(...tools)
			.build();

		// Test the sampling-enabled greeting
		console.log("� Testing personalized greeting with sampling:");
		await ask(runner, "Please greet me using the greeting tool.");

		// Test calculator tool
		console.log("🧮 Testing calculator functionality:");
		await ask(runner, "What's 25 multiplied by 8?");

		await greetingToolset.close();
	} catch (error) {
		console.error("❌ Error with custom MCP server:", error);
		console.log("ℹ️  Note: Make sure the server file exists and is accessible");
	}
}

async function demonstrateMcpConcepts() {
	console.log("📝 Part 2: MCP Integration Concepts");
	console.log("═════════════════════════════════════\n");

	console.log(dedent`
		🔄 **What is MCP (Model Context Protocol)?**

		MCP is a standardized protocol for integrating AI agents with external tools
		and services. It provides a unified way to:
		- Connect agents to various data sources
		- Execute external functions and APIs
		- Enable dynamic, context-aware responses
		- Build composable tool ecosystems

		**Key MCP Components:**

		🖥️ **MCP Server**
		   - Provides tools, resources, and capabilities
		   - Handles tool execution and data access
		   - Can request additional context via sampling
		   - Runs as separate process with defined protocol

		� **MCP Client (Toolset)**
		   - Connects to MCP servers
		   - Exposes server tools to agents
		   - Handles sampling requests from servers
		   - Manages communication and error handling

		📡 **Sampling**
		   - Allows servers to request information from clients
		   - Enables personalized and context-aware responses
		   - Bidirectional communication between server and client
		   - Useful for user preferences, session data, etc.

		**MCP Sampling Flow:**

		1. 🤖 Agent uses MCP tool
		2. 🖥️ MCP server processes request
		3. 📡 Server needs additional context (sampling request)
		4. 🔧 Client's sampling handler responds
		5. 🖥️ Server uses context to provide personalized response
		6. 🤖 Agent receives enhanced result

		**Benefits of MCP:**

		✅ **Standardization**
		   - Consistent interface across different tools
		   - Easier integration and maintenance
		   - Interoperable tool ecosystem

		🔌 **Modularity**
		   - Tools can be developed independently
		   - Easy to add/remove capabilities
		   - Reusable across different agents

		🎯 **Context Awareness**
		   - Sampling enables dynamic responses
		   - Tools can adapt to user preferences
		   - Session-aware functionality

		**Common MCP Use Cases:**

		💼 **Business Applications**
		   - CRM integrations
		   - Database queries
		   - API aggregation
		   - Workflow automation

		🔗 **External Services**
		   - Cloud storage access
		   - Social media integration
		   - Payment processing
		   - Notification systems

		📊 **Data Processing**
		   - File system operations
		   - Data transformation
		   - Analytics and reporting
		   - Content management
	`);
}

async function demonstrateMcpToolsetComposition() {
	console.log("📝 Part 3: MCP Toolset Composition");
	console.log("══════════════════════════════════════\n");

	console.log(dedent`
		🎼 **Building with Multiple MCP Servers:**

		**Multi-Toolset Integration Patterns:**

		🔗 **Combining Different Services**
		   - Greeting + Calculator + File operations
		   - Authentication + Business logic + Analytics
		   - Social media + Content creation + Analytics
		   - Database access + Notification + Reporting

		**Integration Steps:**
		   1. Create multiple MCP toolsets for different services
		   2. Get tools from all toolsets using getTools()
		   3. Combine all tools in a single agent with withTools()
		   4. Configure error handling and coordination logic

		**Best Practices:**

		✅ **Design Principles**
		   - Keep servers focused on single responsibilities
		   - Use sampling for cross-server context sharing
		   - Implement proper error handling and fallbacks
		   - Design tools with clear, descriptive schemas

		�️ **Error Handling**
		   - Server connection failures
		   - Tool execution errors
		   - Sampling timeout handling
		   - Graceful degradation strategies

		� **Performance Considerations**
		   - Lazy toolset initialization
		   - Connection pooling where applicable
		   - Caching for expensive operations
		   - Parallel tool execution when possible

		**Real-World Applications:**

		💼 **Business Automation**
		   - Customer service with CRM + Chat + Analytics
		   - E-commerce with Inventory + Payment + Shipping
		   - Project management with Tasks + Time + Reporting

		� **Development Workflows**
		   - Code analysis + Testing + Deployment
		   - Documentation + Version control + CI/CD
		   - Monitoring + Logging + Alerting

		🌐 **Content Management**
		   - Content creation + SEO + Social posting
		   - Media processing + Storage + Distribution
		   - Analytics + A/B testing + Optimization

		**Next Steps for MCP Development:**

		� **Learning Path**
		   1. Start with simple, single-purpose MCP servers
		   2. Experiment with sampling for context sharing
		   3. Build more complex multi-server compositions
		   4. Implement production-ready error handling
		   5. Add monitoring and observability features

		�️ **Implementation Tips**
		   - Use the official MCP SDK for server development
		   - Test thoroughly with different transport modes
		   - Document your tools with clear schemas
		   - Consider security and authentication needs
		   - Plan for scalability and maintenance
	`);
}

async function main() {
	console.log("🔌 MCP integrations:");

	await demonstrateCustomMcpServer();
	await demonstrateMcpConcepts();
	await demonstrateMcpToolsetComposition();
}

main().catch(console.error);
