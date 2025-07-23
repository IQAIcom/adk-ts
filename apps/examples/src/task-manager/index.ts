import { env } from "node:process";
import { AgentBuilder, type EnhancedRunner } from "@iqai/adk";
import { intro, outro, text } from "@clack/prompts";
import {
  TaskManager,
  AddTaskTool,
  RemoveTaskTool,
  UpdateTaskTool,
  ToggleTaskTool,
  GetTasksTool,
  ClearTasksTool,
} from "./task-tools.js";
import dedent from "dedent";

/**
 * Task Manager Example
 *
 * This example demonstrates a simple task management assistant that can:
 * - Add new tasks to a list
 * - Remove tasks from the list
 * - Update existing tasks
 * - Show the current task list
 * - Toggle task completion status
 * - Clear all tasks
 *
 * The example uses a proper TaskManager class with tools for agentic task management.
 *
 * Expected Output:
 * - Natural language task management using tools
 * - Persistent task list managed by TaskManager class
 * - Conversational responses about task operations
 *
 * Prerequisites:
 * - Node.js environment
 * - GOOGLE_API_KEY environment variable (optional if LLM_MODEL is set)
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

async function main() {
  console.log("📝 Starting Task Manager example...");

  try {
    /**
     * Create TaskManager instance and associated tools
     */
    const taskManager = new TaskManager();

    // Create tools that use the TaskManager instance
    const addTaskTool = new AddTaskTool(taskManager);
    const removeTaskTool = new RemoveTaskTool(taskManager);
    const updateTaskTool = new UpdateTaskTool(taskManager);
    const toggleTaskTool = new ToggleTaskTool(taskManager);
    const getTasksTool = new GetTasksTool(taskManager);
    const clearTasksTool = new ClearTasksTool(taskManager);

    /**
     * Create agent with task management capabilities using AgentBuilder
     */
    const { runner } = await AgentBuilder.create("task_manager")
      .withModel(env.LLM_MODEL || "gemini-2.5-flash")
      .withDescription(
        "A task management assistant that helps manage your to-do list"
      )
      .withInstruction(
        dedent`
        You are a helpful task management assistant with access to comprehensive task management tools. Your ONLY job is to manage the user's task list using the provided tools.
        
        Available tools:
        - addTask(task: string): Add a new task to the list
        - removeTask(index: number): Remove a task by its number (1-based)
        - updateTask(index: number, newTask: string): Update an existing task
        - toggleTask(index: number): Mark a task as completed or incomplete
        - getTasks(): Show the current task list with status
        - clearTasks(): Clear all tasks from the list
        
        When users mention tasks, always use the appropriate tools to perform the requested operations.
        Be helpful and conversational. After performing operations that modify the task list, 
        consider showing the updated task list using getTasks() to give users feedback.
        
        Always use the tools to manage tasks - don't try to maintain task state manually.
      `
      )
      .withTools(
        addTaskTool,
        removeTaskTool,
        updateTaskTool,
        toggleTaskTool,
        getTasksTool,
        clearTasksTool
      )
      .build();

    /**
     * Start interactive task management session
     */
    await runTaskManagerInteractive(runner);

    console.log("\n✅ Task Manager example completed!");
  } catch (error) {
    console.error("❌ Error in task manager example:", error);
    process.exit(1);
  }
}

/**
 * Interactive task manager session
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function runTaskManagerInteractive(
  runner: EnhancedRunner
): Promise<void> {
  intro("🗒️ Task Manager Agent");

  console.log(
    "\nYou can now interact with the task manager. Try commands like:"
  );
  console.log("• 'Add a task to call mom'");
  console.log("• 'Show my tasks'");
  console.log("• 'Complete task 1'");
  console.log("• 'Update task 2 to something else'");
  console.log("• 'Remove task 3'");
  console.log("• 'Clear all tasks'");

  let exit = false;
  while (!exit) {
    const input = await text({
      message:
        "What would you like to do with your tasks? (type 'exit' to quit):",
      placeholder: "e.g. add buy milk, complete task 1, show my tasks",
    });

    if (typeof input === "string" && input.trim().toLowerCase() === "exit") {
      outro("👋 Goodbye!");
      exit = true;
      break;
    }

    if (typeof input === "string" && input.trim()) {
      console.log(`\n💬 USER: ${input.trim()}`);
      const response = await runner.ask(input.trim());
      console.log(`🤖 ASSISTANT: ${response}`);
    }
  }
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
