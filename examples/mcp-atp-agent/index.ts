import {
	Agent,
	LLMRegistry,
	OpenAILLM,
	type Message,
	type MessageRole,
	RunConfig,
	StreamingMode,
} from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import * as readline from "node:readline";
import chalk from "chalk";

// Load environment variables from .env file
dotenv.config();

// Critical: Check for OpenAI API Key
if (!process.env.OPENAI_API_KEY) {
	console.error(
		"❌ Error: OPENAI_API_KEY is not set in the .env file. This is required for the LLM.",
	);
	process.exit(1);
}

LLMRegistry.registerLLM(OpenAILLM);

const DEBUG = process.env.DEBUG?.toLowerCase() !== "false"; // Defaults to true, unless DEBUG="false"

let agent: Agent | null = null;
let toolset: McpToolset | null = null;

// Create readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Promise-based prompt function
function prompt(question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

/**
 * Main function to demonstrate an agent using MCP tools with interactive chat.
 */
async function runMcpConversation() {
	console.log(chalk.blue.bold("🚀 Starting MCP ATP Agent Interactive Chat"));

	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
	const atpApiKey = process.env.ATP_API_KEY;
	const atpUseDev = process.env.ATP_USE_DEV || "false";
	const exampleTokenContract = process.env.EXAMPLE_ATP_TOKEN_CONTRACT;

	if (!walletPrivateKey) {
		console.warn(
			chalk.yellow(
				"⚠️ Warning: WALLET_PRIVATE_KEY is not set. ATP transactions will likely fail.",
			),
		);
	}
	if (!atpApiKey) {
		console.warn(
			chalk.yellow(
				"⚠️ Warning: ATP_API_KEY is not set. Some ATP operations may fail.",
			),
		);
	}
	if (!exampleTokenContract) {
		console.error(
			chalk.red(
				"❌ Error: EXAMPLE_ATP_TOKEN_CONTRACT is not set in .env file.",
			),
		);
		process.exit(1);
	}

	const mcpEnv = {
		...(walletPrivateKey && { WALLET_PRIVATE_KEY: walletPrivateKey }),
		...(atpApiKey && { ATP_API_KEY: atpApiKey }),
		...(atpUseDev && { ATP_USE_DEV: atpUseDev }),
		PATH: process.env.PATH || "",
	};

	try {
		const mcpConfig: McpConfig = {
			name: "ATP MCP Client",
			description: "Client for the @iqai/mcp-atp server",
			debug: DEBUG,
			retryOptions: { maxRetries: 2, initialDelay: 200 },
			cacheConfig: { enabled: false },
			transport: {
				mode: "stdio",
				command: "pnpm",
				args: ["dlx", "@iqai/mcp-atp"],
				env: mcpEnv,
			},
		};

		console.log(
			chalk.yellow("\n🔄 Connecting to @iqai/mcp-atp server via MCP..."),
		);
		toolset = new McpToolset(mcpConfig);
		const mcpTools = await toolset.getTools();

		if (mcpTools.length === 0) {
			console.warn(chalk.yellow("⚠️ No tools retrieved from MCP server."));
		} else {
			console.log(
				chalk.green(
					`✅ Retrieved ${mcpTools.length} tools from @iqai/mcp-atp server.`,
				),
			);
		}

		// Initialize the agent with OpenAI's model and MCP tools
		agent = new Agent({
			name: "mcp_atp_interactive_assistant",
			model: process.env.LLM_MODEL || "gpt-4o-mini",
			description:
				"An interactive assistant for the IQ AI Agent Tokenization Platform (ATP)",
			instructions: `You are a helpful assistant for the IQ AI Agent Tokenization Platform (ATP).
			Tools: ATP_AGENT_STATS, ATP_GET_AGENT_LOGS, ATP_ADD_AGENT_LOG, ATP_BUY_AGENT, ATP_SELL_AGENT.
			Your EXAMPLE_ATP_TOKEN_CONTRACT is ${exampleTokenContract}.
			For ATP_ADD_AGENT_LOG, use apiKey: "${atpApiKey || "YOUR_ATP_API_KEY_PLACEHOLDER"}".
			Be concise. If a key is missing for a tool, state that the operation cannot be performed due to the missing key.
			Respond appropriately to any user query, not just ATP-related ones.`,
			tools: mcpTools,
			maxToolExecutionSteps: 3,
		});

		console.log(chalk.blue.bold("\n🤖 Agent initialized with MCP ATP tools."));

		// Store conversation history
		const messages: Message[] = [
			{
				role: "system" as MessageRole,
				content: `You are a helpful assistant for the IQ AI Agent Tokenization Platform (ATP).
				The example token contract you can use is: ${exampleTokenContract}.
				Respond to both ATP-related queries and general questions.`,
			},
		];

		console.log(
			chalk.cyan(
				"\n💬 You can now chat with the ATP assistant. Type 'exit' to quit.",
			),
		);
		console.log(chalk.yellow("Example commands:"));
		console.log(
			chalk.dim(
				`- Get agent statistics for token contract ${exampleTokenContract}`,
			),
		);
		console.log(
			chalk.dim(
				`- Retrieve logs for agent token contract ${exampleTokenContract}`,
			),
		);
		console.log(chalk.dim(`- Add a log to ${exampleTokenContract}`));
		console.log(
			chalk.dim(`- Buy 10000 IQ of tokens for ${exampleTokenContract}`),
		);
		console.log(chalk.dim(`- Sell tokens of ${exampleTokenContract}`));
		console.log(chalk.dim("- Or ask any general question"));

		let userInput = "";

		while (userInput.toLowerCase() !== "exit") {
			userInput = await prompt(chalk.yellow.bold("\n👤 You: "));

			if (userInput.toLowerCase() === "exit") {
				break;
			}

			if (userInput.trim() !== "") {
				// Add user message to history
				messages.push({
					role: "user" as MessageRole,
					content: userInput,
				});

				// Process with agent
				await processMessage(agent, messages);
			}
		}

		console.log(chalk.blue.bold("\n✅ Chat session ended. Goodbye!"));
	} catch (error) {
		if (error instanceof McpError) {
			console.error(
				chalk.red(`\n❌ MCP Error (${error.type}): ${error.message}`),
			);
			if (error.originalError)
				console.error(chalk.red("   Original error:"), error.originalError);
		} else {
			console.error(chalk.red("\n❌ An unexpected error occurred:"), error);
		}
	} finally {
		if (toolset) {
			console.log(chalk.yellow("\n🧹 Closing MCP toolset..."));
			await toolset
				.close()
				.catch((err) =>
					console.error(chalk.red("Error closing toolset:"), err),
				);
		}
		// Close readline interface
		rl.close();
		console.log(chalk.blue.bold("\n🏁 Script finished."));
	}
}

async function processMessage(agent: Agent, messages: Message[]) {
	console.log(chalk.cyan("🤖 Assistant: "));

	try {
		// Use streaming for a better experience
		let fullResponse = "";
		let streamContent = "";
		let isToolCallInProgress = false;
		const activeToolCalls = new Map(); // Track active tool calls by ID
		let realToolArguments = "";

		// For MCP specifically, track the last tool called to associate with results
		let lastToolCalled = null;

		for await (const response of agent.runStreaming({
			messages,
			config: new RunConfig({
				streamingMode: StreamingMode.SSE,
			}),
		})) {
			// IMPORTANT: For debugging to see actual response objects
			if (DEBUG) {
				console.log(
					chalk.dim("\n[DEBUG] Response object:"),
					JSON.stringify(response, null, 2),
				);
			}

			// Special handling for empty-named tool call that contains arguments (MCP specific pattern)
			if (response.tool_calls && response.tool_calls.length > 0) {
				for (const toolCall of response.tool_calls) {
					// Handle the empty tool call that contains actual arguments for previous real tool
					if (toolCall.function.name === "" && lastToolCalled) {
						// Accumulate arguments for the real tool
						realToolArguments += toolCall.function.arguments || "";
						continue;
					}

					// This is a real tool call with a name
					lastToolCalled = toolCall.id;

					if (!activeToolCalls.has(toolCall.id)) {
						activeToolCalls.set(toolCall.id, {
							name: toolCall.function.name,
							args: toolCall.function.arguments || "",
							result: null,
						});

						if (!isToolCallInProgress) {
							isToolCallInProgress = true;
							if (streamContent) {
								console.log(); // Add newline if we were streaming text
							}
						}

						console.log(chalk.blue(`[Tool Call] ${toolCall.function.name}`));
					}
				}

				// If we have accumulated tool arguments and a last tool called, update it
				if (
					realToolArguments &&
					lastToolCalled &&
					activeToolCalls.has(lastToolCalled)
				) {
					const toolInfo = activeToolCalls.get(lastToolCalled);
					toolInfo.args = realToolArguments;
					activeToolCalls.set(lastToolCalled, toolInfo);

					// Only log the args when they're complete or significantly accumulated
					if (realToolArguments.endsWith("}")) {
						console.log(
							chalk.blue("[Tool Arguments] Complete arguments received"),
						);

						// Use the logging function to display arguments
						logToolArguments(toolInfo.name, realToolArguments);
					}
				}

				continue;
			}

			// Handle tool results - when results from tools come back
			if (response.raw_response && typeof response.raw_response === "object") {
				const raw = response.raw_response as any;

				// Try to extract tool results from raw response
				if (raw.content && lastToolCalled) {
					// For MCP, sometimes results come in the raw content without proper tool metadata
					activeToolCalls.forEach((toolInfo, toolId) => {
						if (!toolInfo.result) {
							toolInfo.result = raw.content;
							activeToolCalls.set(toolId, toolInfo);

							console.log(chalk.magenta(`[Tool Result] ${toolInfo.name}`));
							console.log(
								chalk.magenta(
									`${raw.content?.substring(0, 500)}${raw.content?.length > 500 ? "..." : ""}`,
								),
							);

							// Add to conversation history
							messages.push({
								role: "tool" as MessageRole,
								content: raw.content,
								tool_call_id: toolId,
							});
						}
					});
					continue;
				}
			}

			// Handle streaming content
			if (response.is_partial && response.content) {
				process.stdout.write(chalk.green(response.content));
				streamContent += response.content;
				continue;
			}

			// Handle complete response
			if (!response.is_partial && response.content) {
				fullResponse = response.content;

				if (isToolCallInProgress) {
					isToolCallInProgress = false;
					console.log(chalk.blue("[Tool Calls] All completed"));
				}

				// If we haven't already streamed everything or nothing was streamed, show the full response
				if (!streamContent || streamContent.trim() !== fullResponse.trim()) {
					if (streamContent) {
						console.log(); // Add newline if we were streaming
					}
					console.log(chalk.green(fullResponse));
				} else if (streamContent) {
					// We've already streamed the content, just add a newline
					console.log();
				}
			}
		}

		// If we didn't get a full response but had tool calls, summarize them
		if (!fullResponse && activeToolCalls.size > 0) {
			console.log(
				chalk.yellow(
					"\n[Note] No final text response from assistant after tool calls.",
				),
			);
			console.log(chalk.yellow("Tool calls summary:"));
			for (const [id, toolInfo] of activeToolCalls.entries()) {
				console.log(
					chalk.dim(
						`- ${toolInfo.name}: ${toolInfo.result ? "✓ Completed" : "⨯ No result"}`,
					),
				);

				// If we have a result from the tool call but didn't add it to the conversation,
				// let's generate a new query to the assistant to interpret the results
				if (
					toolInfo.result &&
					!messages.some((m) => m.role === "tool" && m.tool_call_id === id)
				) {
					console.log(
						chalk.cyan(
							"\nRetrieved tool results. Asking assistant to interpret...",
						),
					);

					messages.push({
						role: "tool" as MessageRole,
						content: toolInfo.result,
						tool_call_id: id,
					});

					// Add an interpretation request message
					messages.push({
						role: "user" as MessageRole,
						content: `Please interpret the results from the ${toolInfo.name} tool and provide an explanation.`,
					});

					// Process the interpretation request
					await processMessage(agent, messages);

					// Return after handling the nested call
					return;
				}
			}
		}

		// Add assistant's response to history for next iteration (if we got one)
		if (fullResponse || activeToolCalls.size === 0) {
			messages.push({
				role: "assistant" as MessageRole,
				content:
					fullResponse || "Tool operations completed without text response.",
			});
		}

		// If DEBUG mode is on, show the current state of messages
		if (DEBUG) {
			console.log(
				chalk.dim("\n[DEBUG] Updated conversation history:"),
				messages.map(
					(m) =>
						`${m.role}: ${typeof m.content === "string" ? m.content.substring(0, 20) : "[complex content]"}...`,
				),
			);
		}
	} catch (error: any) {
		console.error(
			chalk.red("Error processing message:"),
			error?.message || String(error),
		);

		// Add error response to conversation history for context
		messages.push({
			role: "assistant" as MessageRole,
			content: `Sorry, I encountered an error while processing your request: ${error?.message || "Unknown error"}`,
		});
	}
}

// Function to display tool arguments for debugging
function logToolArguments(toolName: string, args: string) {
	try {
		// Parse the arguments string to an object
		let parsedArgs: Record<string, any>;
		try {
			parsedArgs = JSON.parse(args);
		} catch (err: any) {
			console.error(
				chalk.red(
					`Error parsing tool arguments: ${err.message || String(err)}`,
				),
			);
			return;
		}

		// Just log the arguments
		console.log(chalk.cyan(`[Tool Call Details] ${toolName}:`));
		console.log(chalk.dim(JSON.stringify(parsedArgs, null, 2)));
	} catch (err: any) {
		console.error(
			chalk.red("Error processing arguments:"),
			err.message || String(err),
		);
	}
}

// Run the example
runMcpConversation().catch((error) => {
	console.error(chalk.red("\n💥 Fatal Error in main execution:"), error);
	process.exit(1);
});
