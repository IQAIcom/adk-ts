import { env } from "node:process";
import {
  InMemorySessionService,
  LlmAgent,
  type McpConfig,
  McpError,
  McpToolset,
  Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "mcp-odos-example";
const USER_ID = uuidv4();

/**
 * MCP Odos Agent Example
 *
 * This example demonstrates how to use the Model Context Protocol (MCP) with the
 * @iqai/mcp-odos server to create an AI agent capable of interacting with the
 * IQ AI Odos.
 *
 * The example:
 * 1. Connects to the @iqai/mcp-odos server via stdio transport
 * 2. Creates an LLM agent with Odos tools (statistics, logs, trading)
 * 3. Demonstrates various Odos operations through natural language commands
 * 4. Shows proper error handling and resource cleanup
 *
 * Expected Output:
 * - Connection status and available Odos tools
 * - Agent statistics retrieval
 * - Agent logs management (retrieve and add)
 * - Agent token trading operations (buy and sell)
 * - Proper error handling for missing configuration
 *
 * Prerequisites:
 * - Node.js environment
 * - EXAMPLE_Odos_TOKEN_CONTRACT environment variable (required)
 * - WALLET_PRIVATE_KEY environment variable (optional, for trading operations)
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
  let toolset: McpToolset | null = null;

  console.log("🚀 Starting MCP Odos Agent Example");

  /**
   * Validate required environment variables
   * The example requires at least the token contract address to demonstrate features
   */
  const { isValid } = validateEnvironmentVariables();
  if (!isValid) {
    process.exit(1);
  }

  try {
    /**
     * Initialize MCP Odos toolset
     * Connects to the @iqai/mcp-odos server using stdio transport with proper environment setup
     */
    console.log("🔄 Connecting to @iqai/mcp-odos server via MCP...");
    toolset = await initializeMcpToolset();

    /**
     * Retrieve and display available tools
     * The server provides tools for agent statistics, logs, and trading operations
     */
    const mcpTools = await toolset.getTools();
    displayAvailableTools(mcpTools);

    /**
     * Create LLM agent with Odos capabilities
     * The agent is configured to understand and execute Odos-related operations
     */
    const agent = createOdosAgent(mcpTools);

    /**
     * Set up session management and runner
     * Provides proper conversation context and execution environment
     */
    const { runner, session } = await setupSessionAndRunner(agent);

    /**
     * Execute demonstration examples
     * Shows various Odos operations through natural language interactions
     */
    await runOdosExamples(runner, session.id);

    console.log("\n🎉 MCP Odos agent example completed!");
  } catch (error) {
    handleError(error);
  } finally {
    await cleanupResources(toolset);
  }
}

/**
 * Validates required environment variables and displays appropriate warnings
 * @returns Object containing validation status and token contract address
 */
function validateEnvironmentVariables(): {
  isValid: boolean;
} {
  const walletPrivateKey = env.WALLET_PRIVATE_KEY;

  if (!walletPrivateKey) {
    console.warn(
      "⚠️ Warning: WALLET_PRIVATE_KEY is not set. Some Odos tools requiring a wallet will fail.",
    );
  }


  return { isValid: true };
}

/**
 * Initializes the MCP toolset with proper configuration for the Odos server
 * @returns Configured McpToolset instance
 */
async function initializeMcpToolset(): Promise<McpToolset> {
  const mcpConfig: McpConfig = {
    name: "Odos MCP Client",
    description: "Client for the @iqai/mcp-odos server",
    debug: env.DEBUG === "true",
    retryOptions: {
      maxRetries: 2,
      initialDelay: 200,
    },
    cacheConfig: {
      enabled: false,
    },
    transport: {
      mode: "stdio",
      command: "pnpm",
      args: ["dlx", "@iqai/mcp-odos"],
      env: {
        ...(env.WALLET_PRIVATE_KEY && {
          WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
        }),
        PATH: env.PATH || "", // Important for child process execution
      },
    },
  };

  return new McpToolset(mcpConfig);
}

/**
 * Displays the available tools retrieved from the MCP server
 * @param mcpTools Array of tools provided by the Odos server
 */
function displayAvailableTools(mcpTools: any[]): void {
  if (mcpTools.length === 0) {
    console.warn(
      "⚠️ No tools retrieved from the MCP server. Ensure the server is running correctly and accessible.",
    );
    return;
  }

  console.log(
    `✅ Retrieved ${mcpTools.length} tools from the @iqai/mcp-odos server:`,
  );
  mcpTools.forEach((tool) => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
}

/**
 * Creates and configures the LLM agent with Odos tools
 * @param mcpTools Array of tools to be used by the agent
 * @returns Configured LlmAgent instance
 */
function createOdosAgent(mcpTools: any[]): LlmAgent {
  return new LlmAgent({
    name: "mcp_odos_assistant",
    model: env.LLM_MODEL || "gemini-2.5-flash",
    description:
      "An assistant that can interact with the IQ AI Odos via MCP using Google Gemini",
    instruction:
      "You are a helpful assistant that can interact with the IQ Odos AI Agent. " +
      "You can retrieve agent statistics, manage logs, and perform token trading operations. " +
      "Be clear and informative in your responses about the operations you perform.",
    tools: mcpTools,
  });
}

/**
 * Sets up session management and runner for the agent
 * @param agent The configured LlmAgent instance
 * @returns Object containing runner and session
 */
async function setupSessionAndRunner(agent: LlmAgent): Promise<{
  runner: Runner;
  session: any;
}> {
  const sessionService = new InMemorySessionService();
  const session = await sessionService.createSession(APP_NAME, USER_ID);

  const runner = new Runner({
    appName: APP_NAME,
    agent,
    sessionService,
  });

  console.log("🤖 Agent initialized with MCP Odos tools.");

  return { runner, session };
}

/**
 * Executes a user message through the agent and returns the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param userMessage The message to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentTask(
  runner: Runner,
  sessionId: string,
  userMessage: string,
): Promise<string> {
  const newMessage = {
    parts: [{ text: userMessage }],
  };

  let agentResponse = "";

  try {
    for await (const event of runner.runAsync({
      userId: USER_ID,
      sessionId,
      newMessage,
    })) {
      if (event.author === "mcp_odos_assistant" && event.content?.parts) {
        const content = event.content.parts
          .map((part) => part.text || "")
          .join("");
        if (content) {
          agentResponse += content;
        }
      }
    }
  } catch (error) {
    return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return agentResponse || "No response from agent";
}

/**
 * Runs comprehensive Odos demonstration examples
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function runOdosExamples(
  runner: Runner,
  sessionId: string,
): Promise<void> {
  console.log("-----------------------------------");


  const tokensToSell = 1000000000000000000; // Example number of tokens to sell
  const fromToken = "0x4dBcC239b265295500D2Fe2d0900629BDcBBD0fB"; // Example token to sell
  const toToken = "0x6EFB84bda519726Fa1c65558e520B92b51712101"; // Example token to buy

  await runExample({
    title: `Get quote for swapping tokens ${tokensToSell} from ${fromToken} to ${toToken}`,
    description: `Get me a quote for swapping ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal`,
    query: `Get me a quote for swapping ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal.`,
    runner,
    sessionId,
  });

  await runExample({
    title: `Swap ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal`,
    description: `Swap ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal`,
    query: `Swap ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal.`,
    runner,
    sessionId,
  });

  console.log("✅ MCP Odos Agent examples complete!");
}

/**
 * Executes a single demonstration example with consistent formatting
 * @param config Configuration object for the example
 */
async function runExample(config: {
  title: string;
  description: string;
  query: string;
  runner: Runner;
  sessionId: string;
}): Promise<void> {
  const { title, description, query, runner, sessionId } = config;

  console.log(`\n🌟 Example: ${title}`);
  console.log(`📋 ${description}`);
  console.log(`💬 User Query: ${query}`);
  console.log("-----------------------------------");

  const response = await runAgentTask(runner, sessionId, query);
  console.log(`💡 Agent Response: ${response}`);
  console.log("-----------------------------------");
}

/**
 * Handles various types of errors that may occur during execution
 * @param error The error that occurred
 */
function handleError(error: unknown): void {
  if (error instanceof McpError) {
    console.error(`❌ MCP Error (${error.type}): ${error.message}`);
    if (error.originalError) {
      console.error("   Original error:", error.originalError);
      // Check for the specific ENOENT error for npx
      if (
        error.originalError instanceof Error &&
        error.originalError.message.includes("spawn npx ENOENT")
      ) {
        console.error(
          "   Hint: This often means 'npx' was not found. Ensure Node.js and npm are correctly installed and their bin directory is in your system's PATH.",
        );
      }
    }
  } else {
    console.error("❌ An unexpected error occurred:", error);
  }
}

/**
 * Cleans up MCP resources and handles any cleanup errors
 * @param toolset The McpToolset instance to clean up
 */
async function cleanupResources(toolset: McpToolset | null): Promise<void> {
  if (toolset) {
    console.log("🧹 Cleaning up MCP resources...");
    try {
      await toolset.close();
    } catch (err) {
      console.error("   Error during MCP toolset cleanup:", err);
    }
  }
}

/**
 * Execute the main function and handle any fatal errors
 */
main().catch((error) => {
  if (error instanceof McpError) {
    console.error(`💥 Fatal MCP Error (${error.type}): ${error.message}`);
  } else {
    console.error("💥 Fatal Error in main execution:", error);
  }
  process.exit(1);
});
