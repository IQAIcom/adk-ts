import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 1. Create the Server instance from the official SDK
const server = new McpServer({
	name: "greeting-server",
	version: "1.0.0",
});

// 2. Add the tool using the modern registerTool API
server.registerTool(
	"greet_user",
	{
		title: "Greet User",
		description: "Greets a user by asking for their name through sampling",
		inputSchema: {},
	},
	async () => {
		try {
			// Make a sampling request to get the user's name
			const samplingResponse = await server.server.createMessage({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: "What is your name? Please respond with just your name.",
						},
					},
				],
				maxTokens: 50,
			});

			// Construct and return the greeting
			if (samplingResponse.content.type === "text") {
				return {
					content: [
						{
							type: "text",
							text: `Hello ${samplingResponse.content.text}! Nice to meet you!`,
						},
					],
				};
			}
		} catch (error) {
			console.error("❌ Error during sampling:", error);
			// Fall through to the default message on error
		}

		// Fallback message if sampling is not available/fails
		return {
			content: [
				{
					type: "text",
					text: "Hello there! I had trouble getting your name, but nice to meet you!",
				},
			],
		};
	}
);

// 3. Start the server using the connect method with a specific transport
// This pattern makes the code more explicit about how the server communicates.
if (require.main === module) {
	console.log("Starting greeting-server with stdio transport...");
	const transport = new StdioServerTransport();
	server.connect(transport);
}

export default server;
