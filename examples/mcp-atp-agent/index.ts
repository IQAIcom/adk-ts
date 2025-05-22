import {
	Agent,
	LLMRegistry,
	OpenAILLM,
	type MessageRole,
	InMemoryRunner,
	type Message,
	RunConfig,
} from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid"; // For generating session IDs - though not strictly needed if session service creates ID

// Load environment variables from .env file
dotenv.config();

LLMRegistry.registerLLM(OpenAILLM);

const DEBUG = process.env.DEBUG === "true" || true;

/**
 * Processes events from the agent runner and extracts the final assistant message.
 */
async function getAssistantResponse(
	eventStream: AsyncGenerator<any, void, unknown>,
): Promise<string | null> {
	let lastAssistantMessage: string | null = null;
	let currentToolCalls: any[] = [];
	console.log("--- Event Stream Start ---");
	for await (const event of eventStream) {
		// Log the raw event type and data for debugging
		if (DEBUG && event && typeof event.type === "string") {
			console.log(
				`[EVENT]: ${event.type.toUpperCase()}`,
				JSON.stringify(event.data, null, 2),
			);
		}

		switch (event.type) {
			case "message_part": // Corresponds to EventType.MESSAGE_PART
				if (event.data?.role === "assistant" && event.data?.content) {
					// In a true streaming UI, you'd append this. For now, we'll see if it helps capture.
					lastAssistantMessage =
						(lastAssistantMessage || "") + event.data.content;
				}
				break;
			case "message_completed": // Corresponds to EventType.MESSAGE_COMPLETED
				if (
					event.data?.message?.role === "assistant" &&
					event.data?.message?.content
				) {
					lastAssistantMessage = event.data.message.content as string;
				}
				break;
			case "tool_calls_generation": // Corresponds to EventType.TOOL_CALLS_GENERATION
				if (event.data?.tool_calls && event.data.tool_calls.length > 0) {
					currentToolCalls = event.data.tool_calls;
					console.log(
						`[INFO] Agent wants to call tools: ${JSON.stringify(currentToolCalls.map((tc) => tc.function.name))}`,
					);
				}
				break;
			case "tool_calls_completed": // Corresponds to EventType.TOOL_CALLS_COMPLETED
				console.log(
					`[INFO] Tools finished execution. Results: ${JSON.stringify(event.data?.tool_results?.map((tr: any) => ({ name: tr.tool_call_id, result: tr.result?.slice(0, 100) + (tr.result?.length > 100 ? "..." : "") })))}`,
				);
				// After tools run, the LLM will generate a textual response. Reset lastAssistantMessage
				// if we only want the *final* textual response post-tool_calls.
				// However, sometimes the LLM might speak *before* calling a tool.
				// For now, we'll let it accumulate or be overwritten by a final MESSAGE_COMPLETED.
				currentToolCalls = []; // Reset tool calls
				break;
			case "run_completed": // Corresponds to EventType.RUN_COMPLETED
				console.log("[INFO] Run completed.");
				if (event.data?.messages) {
					const messages = event.data.messages as Message[];
					const finalAssistantMsg = messages
						.filter((m) => m.role === "assistant")
						.pop();
					if (finalAssistantMsg?.content) {
						lastAssistantMessage = finalAssistantMsg.content as string;
					}
				}
				// This is a terminal event, so we can break if we're sure this is the definitive end.
				console.log("--- Event Stream End (Run Completed) ---");
				return lastAssistantMessage; // Exit once run is fully complete
			default:
				// Handle other event types or ignore
				break;
		}
	}
	console.log("--- Event Stream End (Loop Exhausted) ---");
	return lastAssistantMessage;
}

/**
 * Demonstrates an agent using MCP tools from the @iqai/mcp-atp server, managed by a Runner.
 */
async function main() {
	let toolset: McpToolset | null = null;
	let runner: InMemoryRunner | null = null;

	console.log("🚀 Starting MCP ATP Agent Example with Runner");

	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
	const atpApiKey = process.env.ATP_API_KEY;
	const atpUseDev = process.env.ATP_USE_DEV || "false";
	const exampleTokenContract = process.env.EXAMPLE_ATP_TOKEN_CONTRACT;

	if (!exampleTokenContract) {
		console.error(
			"❌ Error: EXAMPLE_ATP_TOKEN_CONTRACT is not set in the .env file.",
		);
		process.exit(1);
	}

	// Optional: Log the env vars being passed to McpConfig for verification
	const mcpEnv = {
		...(walletPrivateKey && { WALLET_PRIVATE_KEY: walletPrivateKey }),
		...(atpApiKey && { ATP_API_KEY: atpApiKey }),
		...(atpUseDev && { ATP_USE_DEV: atpUseDev }),
		PATH: process.env.PATH || "",
	};
	if (DEBUG) {
		// console.log("ℹ️ MCP Config transport.env that will be used:", mcpEnv);
	}

	try {
		const mcpConfig: McpConfig = {
			name: "ATP MCP Client",
			description: "Client for the @iqai/mcp-atp server",
			debug: DEBUG,
			retryOptions: { maxRetries: 2, initialDelay: 200 },
			cacheConfig: { enabled: false },
			transport: {
				mode: "stdio",
				command: "pnpm", // or npx
				args: ["dlx", "@iqai/mcp-atp"], // or ["-y", "@iqai/mcp-atp"]
				env: mcpEnv,
			},
		};

		console.log("🔄 Connecting to @iqai/mcp-atp server via MCP...");
		toolset = new McpToolset(mcpConfig);
		const mcpTools = await toolset.getTools();

		if (mcpTools.length === 0) {
			console.warn("⚠️ No tools retrieved from MCP server.");
		}
		console.log(
			`✅ Retrieved ${mcpTools.length} tools from @iqai/mcp-atp server.`,
		);

		const agent = new Agent({
			name: "mcp_atp_runner_assistant",
			model: process.env.LLM_MODEL || "gpt-4o-mini",
			description:
				"An assistant interacting with IQ AI ATP via MCP, managed by a Runner",
			instructions: `You are a helpful assistant for the IQ AI Agent Tokenization Platform (ATP).
			Tools: ATP_AGENT_STATS, ATP_GET_AGENT_LOGS, ATP_ADD_AGENT_LOG, ATP_BUY_AGENT, ATP_SELL_AGENT.
			Your EXAMPLE_ATP_TOKEN_CONTRACT is ${exampleTokenContract}.
			For ATP_ADD_AGENT_LOG, use apiKey: "${atpApiKey || "YOUR_ATP_API_KEY_PLACEHOLDER"}".
			Be concise. If a key is missing for a tool, state that the operation cannot be performed due to the missing key.`,
			tools: mcpTools,
			maxToolExecutionSteps: 3,
		});

		runner = new InMemoryRunner(agent);
		console.log("🤖 Agent and Runner initialized.");

		const userId = "test-user-mcp-runner";

		// Create the session before starting interactions
		console.log(`Creating session for user ${userId}...`);
		const newSession = await runner.sessionService.createSession(userId, {
			// Optional initial metadata
			initiatedBy: "mcp-atp-agent-runner-example",
			creationTimestamp: new Date().toISOString(),
		});
		const sessionId = newSession.id; // Use const as it's assigned once
		console.log(`✅ Session ${sessionId} created.`);
		console.log("-----------------------------------");

		// currentMessages will be managed by the SessionService internal to the InMemoryRunner

		async function runInteraction(userQuery: string) {
			console.log(`
💬 User Query: ${userQuery}`);
			console.log("-----------------------------------");

			const newMessage: Message = { role: "user", content: userQuery };

			const runParams = {
				newMessage: newMessage,
				sessionId: sessionId,
				userId: userId,
				// runConfig: new RunConfig(), // Optionally add a default RunConfig if needed
			};

			if (DEBUG) {
				console.log(
					"[DEBUG] Calling runner.runAsync with params:",
					JSON.stringify(runParams, null, 2),
				);
			}

			const eventStream = runner!.runAsync(runParams);

			const assistantResponse = await getAssistantResponse(eventStream);
			console.log(
				`💡 Agent Response: ${assistantResponse || "No textual response from assistant."}`,
			);
			console.log("-----------------------------------");
		}

		console.log(
			"🌟 Simulating sequential interactions with the agent via Runner...",
		);

		await runInteraction(
			`Get agent statistics for token contract ${exampleTokenContract}`,
		);
		await runInteraction(
			`Retrieve the first page of logs for agent token contract ${exampleTokenContract}, limit 5.`,
		);

		const logMessage = "Test log from ADK Runner example.";
		await runInteraction(
			`Add this log to ${exampleTokenContract}: "${logMessage}"`,
		);

		const iqAmountToBuy = 10000; // Reduced amount for testing
		await runInteraction(
			`Buy ${iqAmountToBuy} IQ of tokens for ${exampleTokenContract}.`,
		);

		const tokensToSell = 10000; // Reduced amount for testing
		await runInteraction(
			`Sell ${tokensToSell} tokens of ${exampleTokenContract}.`,
		);

		console.log("✅ MCP ATP Agent Runner examples complete!");
	} catch (error) {
		if (error instanceof McpError) {
			console.error(`❌ MCP Error (${error.type}): ${error.message}`);
			if (error.originalError)
				console.error("   Original error:", error.originalError);
		} else {
			console.error("❌ An unexpected error occurred:", error);
		}
	} finally {
		if (toolset) {
			console.log("🧹 Closing MCP toolset...");
			await toolset
				.close()
				.catch((err) => console.error("Error closing toolset:", err));
		}
		if (runner) {
			// InMemoryRunner doesn't have an explicit close/dispose, but if it did, call here.
			console.log("🧹 Runner cleanup (if any needed).");
		}
	}
}

main().catch((error) => {
	console.error("💥 Fatal Error in main execution:", error);
	process.exit(1);
});
