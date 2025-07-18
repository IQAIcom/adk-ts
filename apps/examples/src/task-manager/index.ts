import { env } from "node:process";

import {
  InMemoryMemoryService,
  InMemorySessionService,
  LlmAgent,
  Runner,
} from "@iqai/adk";

import { v4 as uuidv4 } from "uuid";

/**

* Application configuration constants

*/

const APP_NAME = "task-manager-demo";

const USER_ID = uuidv4();

const MAX_EVENTS = 12; // 6 pairs of user/assistant interactions

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

// In-memory storage for tasks

let taskList: string[] = [];

/**

* Validates required environment configuration

* @returns True if configuration is valid, false otherwise

*/

function validateEnvironment(): boolean {
  if (!env.GOOGLE_API_KEY && !env.LLM_MODEL) {
    console.log(
      "⚠️  Please set the GOOGLE_API_KEY environment variable to run this example"
    );

    console.log(
      "   Example: GOOGLE_API_KEY=your-key-here npm run dev src/task-manager"
    );

    return false;
  }

  return true;
}

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

    instruction:
      "You are a helpful task management assistant. Your job is to help the user manage their task list by:" +
      "\n- Adding new tasks when they mention something they want to do" +
      "\n- Removing tasks when they indicate something is completed or should be removed" +
      "\n- Updating tasks when they want to change details" +
      "\n- Showing the current task list when asked" +
      "\n\nAlways be conversational, friendly and brief in your responses. " +
      "After performing any task operation, mention the current state of the task list.",
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

  memoryService: InMemoryMemoryService,

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

* Store current session in memory for future reference

* Trim events if conversation gets too long

*/

    const currentSession = await sessionService.getSession(
      APP_NAME,

      USER_ID,

      sessionId
    );

    if (currentSession) {
      if (currentSession.events.length > MAX_EVENTS) {
        currentSession.events = currentSession.events.slice(-MAX_EVENTS);
      }

      await memoryService.addSessionToMemory(currentSession);
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

async function runTaskManagerDemo(
  runner: Runner,

  sessionService: InMemorySessionService,

  memoryService: InMemoryMemoryService,

  sessionId: string
): Promise<void> {
  console.log("🗒️ Starting Task Manager Demo...");

  // Introduction

  await sendMessage(
    runner,

    sessionService,

    memoryService,

    sessionId,

    "Hello! Can you help me manage my tasks today?"
  );

  // Adding tasks

  await sendMessage(
    runner,

    sessionService,

    memoryService,

    sessionId,

    "I need to go shopping for a new handbag today."
  );

  await sendMessage(
    runner,

    sessionService,

    memoryService,

    sessionId,

    "Also remember I need to call mom this evening."
  );

  // Showing current tasks

  await sendMessage(
    runner,

    sessionService,

    memoryService,

    sessionId,

    "What's on my list so far?"
  );

  // Interactive mode

  console.log("\n" + "=".repeat(50));

  console.log("🔄 ENTERING INTERACTIVE MODE");

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

      await sendMessage(
        runner,

        sessionService,

        memoryService,

        sessionId,

        input
      );

      askQuestion();
    });
  };

  askQuestion();
}

async function main() {
  console.log("📝 Starting Task Manager example...");

  /**

* Validate environment configuration

* Ensure required API keys are available

*/

  if (!validateEnvironment()) {
    process.exit(1);
  }

  try {
    /**

* Set up memory and session services

* Memory service stores conversation context for future retrieval

*/

    const memoryService = new InMemoryMemoryService();

    const sessionService = new InMemorySessionService();

    const session = await sessionService.createSession(APP_NAME, USER_ID);

    console.log(`📋 Created session: ${session.id}`);

    /**

* Create agent with task management capabilities

*/

    const agent = createTaskManagerAgent();

    /**

* Set up runner with memory service integration

*/

    const runner = new Runner({
      appName: APP_NAME,

      agent,

      sessionService,

      memoryService,
    });

    /**

* Run the task manager demo

*/

    await runTaskManagerDemo(runner, sessionService, memoryService, session.id);
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
