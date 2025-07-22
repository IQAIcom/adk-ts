import { env } from "node:process";
import { InMemorySessionService, LlmAgent, Runner } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";
import dedent from "dedent";

/**
 * Task Manager Example
 *
 * This example demonstrates a simple task management assistant that can:
 * - Add new tasks to a list
 * - Remove tasks from the list
 * - Update existing tasks
 * - Show the current task list
 *
 * The example uses memory services to maintain the task list across interactions.
 *
 * Expected Output:
 * - Natural language task management
 * - Persistent task list stored in memory
 * - Conversational responses about task operations
 *
 * Prerequisites:
 * - Node.js environment
 * - GOOGLE_API_KEY environment variable (optional if LLM_MODEL is set)
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Application configuration constants
 */

const APP_NAME = "task-manager-demo";
const USER_ID = uuidv4();
const MAX_EVENTS = 12; // 6 pairs of user/assistant interactions

// In-memory storage for tasks
let taskList: string[] = [];

/**
 * Creates and configures the LLM agent for task management
 * @returns Configured LlmAgent
 */
function createTaskManagerAgent(): LlmAgent {
  return new LlmAgent({
    name: "task_manager",
    description:
      "A task management assistant that helps manage your to-do list",
    model: env.LLM_MODEL || "gemini-2.5-flash",
    instruction: dedent`You are a helpful task management assistant. Your job is to help the user manage their task list by:
      - Adding new tasks when they mention something they want to do
      - Removing tasks when they indicate something is completed or should be removed
      - Updating tasks when they want to change details
      - Showing the current task list when asked
      Always be conversational, friendly and brief in your responses. After performing any task operation, mention the current state of the task list.`,
  });
}

/**
 * Sends a message to the agent and handles the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for conversation tracking
 * @param memoryService Memory service for storing conversation context
 * @param sessionId Current session identifier
 * @param message User message to send
 * @returns Agent's response string
 */
async function sendMessage(
  runner: Runner,
  sessionService: InMemorySessionService,
  sessionId: string,
  message: string
): Promise<string> {
  console.log(`\n💬 USER: ${message}`);

  // Add the current task list to the message context
  const taskListContext = `Current task list: ${
    taskList.length > 0
      ? taskList.map((task, index) => `\n${index + 1}. ${task}`).join("")
      : "empty"
  }`;

  const newMessage = {
    parts: [{ text: message }, { text: `\n\n${taskListContext}` }],
  };

  let agentResponse = "";

  try {
    /**
     * Process the message through the agent
     * The runner handles memory integration automatically
     */
    for await (const event of runner.runAsync({
      userId: USER_ID,
      sessionId,
      newMessage,
    })) {
      if (event.author === "task_manager" && event.content?.parts) {
        const content = event.content.parts
          .map((part) => part.text || "")
          .join("");
        if (content) {
          agentResponse += content;
        }
      }
    }
    console.log(`🤖 ASSISTANT: ${agentResponse}`);

    // Parse the agent's response to update the task list
    updateTaskListFromResponse(message, agentResponse);

    /**
     * Trim events if conversation gets too long
     */
    const currentSession = await sessionService.getSession(
      APP_NAME,
      USER_ID,
      sessionId
    );
    if (currentSession && currentSession.events.length > MAX_EVENTS) {
      currentSession.events = currentSession.events.slice(-MAX_EVENTS);
    }
    return agentResponse;
  } catch (error) {
    const errorMsg = `Error: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMsg);
    console.log("🤖 ASSISTANT: Sorry, I had trouble processing that request.");
    return errorMsg;
  }
}

/**
 * Updates the task list based on user input and agent response
 * This is a simple heuristic approach to interpret natural language
 * @param userMessage The user's message
 * @param agentResponse The agent's response
 */
function updateTaskListFromResponse(
  userMessage: string,
  agentResponse: string
): void {
  const userMsgLower = userMessage.toLowerCase();

  // Adding tasks
  if (
    (userMsgLower.includes("add") ||
      userMsgLower.includes("create") ||
      userMsgLower.includes("remember") ||
      userMsgLower.includes("need to")) &&
    agentResponse.toLowerCase().includes("added")
  ) {
    // Extract what might be a new task from the agent's response
    const responseLines = agentResponse.split(/[.!]\s+/);

    for (const line of responseLines) {
      if (line.toLowerCase().includes("added")) {
        const taskMatch =
          line.match(/added ["'](.+?)["']/i) || line.match(/added (.+?) to/i);
        if (taskMatch && taskMatch[1]) {
          taskList.push(taskMatch[1]);
          break;
        }
      }
    }

    // If we couldn't parse from the response, make a best guess from user input
    if (
      taskList.length === 0 ||
      (taskList[taskList.length - 1] !== userMessage &&
        !agentResponse
          .toLowerCase()
          .includes(taskList[taskList.length - 1].toLowerCase()))
    ) {
      // Basic extraction - just use the user's message as a fallback
      taskList.push(
        userMessage.replace(/add|create|remember|i need to/i, "").trim()
      );
    }
  }

  // Removing tasks
  if (
    (userMsgLower.includes("remove") ||
      userMsgLower.includes("delete") ||
      userMsgLower.includes("complete") ||
      userMsgLower.includes("finished")) &&
    agentResponse.toLowerCase().includes("removed")
  ) {
    // Check for number references
    const numberMatch = userMsgLower.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < taskList.length) {
        taskList.splice(index, 1);
      }
    } else {
      // Look for task name in the user message
      for (let i = taskList.length - 1; i >= 0; i--) {
        if (userMsgLower.includes(taskList[i].toLowerCase())) {
          taskList.splice(i, 1);
          break;
        }
      }
    }
  }

  // Clear the list
  if (userMsgLower.includes("clear") && userMsgLower.includes("list")) {
    taskList = [];
  }
}

/**
 * Introduce the task manager and demonstrate basic functionality
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService Session service for conversation tracking
 * @param memoryService Memory service for storing conversation context
 * @param sessionId Current session identifier
 */

async function runTaskManagerInteractive(
  runner: Runner,
  sessionService: InMemorySessionService,
  sessionId: string
): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("🗒️ Task Manager Agent");
  console.log("Type your tasks or questions. Type 'exit' to quit.");
  console.log("=".repeat(50) + "\n");

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    readline.question("> ", async (input: string) => {
      if (input.toLowerCase() === "exit") {
        console.log("👋 Goodbye!");
        readline.close();
        return;
      }

      await sendMessage(runner, sessionService, sessionId, input);

      askQuestion();
    });
  };

  askQuestion();
}

async function main() {
  console.log("📝 Starting Task Manager example...");

  try {
    /**
     * Set up memory and session services
     * Memory service stores conversation context for future retrieval
     */
    const sessionService = new InMemorySessionService();
    const session = await sessionService.createSession(APP_NAME, USER_ID);
    console.log(`📋 Created session: ${session.id}`);

    /**
     * Create agent with task management capabilities
     */
    const agent = createTaskManagerAgent();

    /**
     * Set up runner with session service only
     */
    const runner = new Runner({
      appName: APP_NAME,
      agent,
      sessionService,
    });

    /**
     * Start interactive mode only
     */
    await runTaskManagerInteractive(runner, sessionService, session.id);
  } catch (error) {
    console.error("❌ Error in task manager example:", error);
    process.exit(1);
  }
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
