import {
  BaseTool,
  type FunctionDeclaration,
  type ToolContext,
} from "@iqai/adk";

/**
 * Task interface for type safety
 */
export interface Task {
  id: string;
  text: string;
  createdAt: Date;
  completed: boolean;
}

/**
 * TaskManager class to handle all task operations
 */
export class TaskManager {
  private tasks: Task[] = [];

  /**
   * Add a new task to the list
   */
  addTask(taskText: string): {
    success: boolean;
    message: string;
    task?: Task;
  } {
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: taskText.trim(),
      createdAt: new Date(),
      completed: false,
    };

    this.tasks.push(task);
    return {
      success: true,
      message: `Added task: "${task.text}"`,
      task,
    };
  }

  /**
   * Remove a task by its index (1-based for user-friendly interaction)
   */
  removeTask(index: number): { success: boolean; message: string } {
    const taskIndex = index - 1; // Convert to 0-based index

    if (taskIndex < 0 || taskIndex >= this.tasks.length) {
      return {
        success: false,
        message: `Invalid task number ${index}. Please use a number between 1 and ${this.tasks.length}.`,
      };
    }

    const removedTask = this.tasks.splice(taskIndex, 1)[0];
    return {
      success: true,
      message: `Removed task: "${removedTask.text}"`,
    };
  }

  /**
   * Update a task by its index (1-based for user-friendly interaction)
   */
  updateTask(
    index: number,
    newText: string
  ): { success: boolean; message: string } {
    const taskIndex = index - 1; // Convert to 0-based index

    if (taskIndex < 0 || taskIndex >= this.tasks.length) {
      return {
        success: false,
        message: `Invalid task number ${index}. Please use a number between 1 and ${this.tasks.length}.`,
      };
    }

    const oldText = this.tasks[taskIndex].text;
    this.tasks[taskIndex].text = newText.trim();
    return {
      success: true,
      message: `Updated task ${index}: "${oldText}" → "${newText}"`,
    };
  }

  /**
   * Toggle task completion status
   */
  toggleTask(index: number): { success: boolean; message: string } {
    const taskIndex = index - 1; // Convert to 0-based index

    if (taskIndex < 0 || taskIndex >= this.tasks.length) {
      return {
        success: false,
        message: `Invalid task number ${index}. Please use a number between 1 and ${this.tasks.length}.`,
      };
    }

    const task = this.tasks[taskIndex];
    task.completed = !task.completed;
    const status = task.completed ? "completed" : "incomplete";
    return {
      success: true,
      message: `Marked task ${index} as ${status}: "${task.text}"`,
    };
  }

  /**
   * Get all tasks with their current status
   */
  getTasks(): { tasks: Task[]; summary: string } {
    if (this.tasks.length === 0) {
      return {
        tasks: [],
        summary: "Your task list is empty.",
      };
    }

    const completedCount = this.tasks.filter((task) => task.completed).length;
    const pendingCount = this.tasks.length - completedCount;

    const taskList = this.tasks
      .map((task, index) => {
        const status = task.completed ? "✅" : "⭕";
        return `${index + 1}. ${status} ${task.text}`;
      })
      .join("\n");

    const summary = `You have ${this.tasks.length} task(s): ${pendingCount} pending, ${completedCount} completed.\n\n${taskList}`;

    return {
      tasks: this.tasks,
      summary,
    };
  }

  /**
   * Clear all tasks
   */
  clearTasks(): { success: boolean; message: string } {
    const count = this.tasks.length;
    this.tasks = [];
    return {
      success: true,
      message:
        count > 0
          ? `Cleared ${count} task(s) from your list.`
          : "Task list was already empty.",
    };
  }
}

/**
 * Tool for adding tasks
 */
export class AddTaskTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "addTask",
      description: "Add a new task to the user's task list",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "The task description to add",
          },
        },
        required: ["task"],
      },
    };
  }

  async runAsync(args: { task: string }, _context: ToolContext): Promise<any> {
    console.log(`Adding task: "${args.task}"`);
    return this.taskManager.addTask(args.task);
  }
}

/**
 * Tool for removing tasks
 */
export class RemoveTaskTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "removeTask",
      description: "Remove a task from the user's task list by its number",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "The task number to remove (1-based indexing)",
          },
        },
        required: ["index"],
      },
    };
  }

  async runAsync(args: { index: number }, _context: ToolContext): Promise<any> {
    console.log(`Removing task #${args.index}`);
    return this.taskManager.removeTask(args.index);
  }
}

/**
 * Tool for updating tasks
 */
export class UpdateTaskTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "updateTask",
      description: "Update the text of an existing task",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "The task number to update (1-based indexing)",
          },
          newTask: {
            type: "string",
            description: "The new task description",
          },
        },
        required: ["index", "newTask"],
      },
    };
  }

  async runAsync(
    args: { index: number; newTask: string },
    _context: ToolContext
  ): Promise<any> {
    console.log(`Updating task #${args.index} to: "${args.newTask}"`);
    return this.taskManager.updateTask(args.index, args.newTask);
  }
}

/**
 * Tool for toggling task completion
 */
export class ToggleTaskTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "toggleTask",
      description: "Mark a task as completed or incomplete",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "The task number to toggle (1-based indexing)",
          },
        },
        required: ["index"],
      },
    };
  }

  async runAsync(args: { index: number }, _context: ToolContext): Promise<any> {
    console.log(`Toggling completion status for task #${args.index}`);
    return this.taskManager.toggleTask(args.index);
  }
}

/**
 * Tool for getting all tasks
 */
export class GetTasksTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "getTasks",
      description: "Show the current task list with all tasks and their status",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async runAsync(_args: {}, _context: ToolContext): Promise<any> {
    console.log("Retrieving all tasks");
    return this.taskManager.getTasks();
  }
}

/**
 * Tool for clearing all tasks
 */
export class ClearTasksTool extends BaseTool {
  constructor(private taskManager: TaskManager) {
    super({
      name: "clearTasks",
      description: "Clear all tasks from the task list",
    });
  }

  getDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }

  async runAsync(_args: {}, _context: ToolContext): Promise<any> {
    console.log("Clearing all tasks");
    return this.taskManager.clearTasks();
  }
}
