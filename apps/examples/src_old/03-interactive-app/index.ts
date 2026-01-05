import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import { AgentBuilder, InMemorySessionService, createTool } from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";
import { ask } from "../utils";

/**
 * 03 - Interactive Todo Application
 *
 * A complete interactive CLI application with persistent state.
 *
 * Concepts covered:
 * - Interactive CLI applications
 * - Comprehensive state management
 * - Real-world tool design
 * - Error handling and validation
 * - Session persistence
 */

// Todo management tools
const addTodoTool = createTool({
	name: "add_todo",
	description: "Add a new todo item to the user's list",
	schema: z.object({
		task: z.string().describe("The task description"),
		priority: z
			.enum(["low", "medium", "high"])
			.default("medium")
			.describe("Task priority"),
		category: z.string().optional().describe("Optional category for the task"),
		dueDate: z
			.string()
			.optional()
			.describe("Optional due date (YYYY-MM-DD format)"),
	}),
	fn: ({ task, priority, category, dueDate }, context) => {
		const todos = context.state.get("todos", []);
		const newTodo = {
			id: Date.now(),
			task,
			priority,
			category: category || "general",
			dueDate,
			completed: false,
			createdAt: new Date().toISOString(),
		};
		todos.push(newTodo);
		context.state.set("todos", todos);

		return {
			success: true,
			todo: newTodo,
			totalTodos: todos.length,
			message: `✅ Added todo #${newTodo.id}: "${task}" (${priority} priority)`,
		};
	},
});

const viewTodosTool = createTool({
	name: "view_todos",
	description: "View todos with optional filtering",
	schema: z.object({
		filter: z
			.enum(["all", "pending", "completed"])
			.default("all")
			.describe("Filter type"),
		category: z.string().optional().describe("Filter by category"),
		priority: z
			.enum(["low", "medium", "high"])
			.optional()
			.describe("Filter by priority"),
	}),
	fn: ({ filter, category, priority }, context) => {
		const allTodos = context.state.get("todos", []);

		let filteredTodos = allTodos;

		// Apply filters
		if (filter === "pending") {
			filteredTodos = filteredTodos.filter((todo) => !todo.completed);
		} else if (filter === "completed") {
			filteredTodos = filteredTodos.filter((todo) => todo.completed);
		}

		if (category) {
			filteredTodos = filteredTodos.filter(
				(todo) => todo.category === category,
			);
		}

		if (priority) {
			filteredTodos = filteredTodos.filter(
				(todo) => todo.priority === priority,
			);
		}

		// Sort by priority and creation date
		filteredTodos.sort((a, b) => {
			const priorityOrder = { high: 3, medium: 2, low: 1 };
			const priorityDiff =
				priorityOrder[b.priority] - priorityOrder[a.priority];
			if (priorityDiff !== 0) return priorityDiff;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});

		// Get statistics
		const stats = {
			total: allTodos.length,
			completed: allTodos.filter((t) => t.completed).length,
			pending: allTodos.filter((t) => !t.completed).length,
			highPriority: allTodos.filter(
				(t) => t.priority === "high" && !t.completed,
			).length,
		};

		return {
			todos: filteredTodos,
			filteredCount: filteredTodos.length,
			stats,
			filters: { filter, category, priority },
			message: `Found ${filteredTodos.length} todos matching your criteria`,
		};
	},
});

const completeTodoTool = createTool({
	name: "complete_todo",
	description: "Mark a todo as completed",
	schema: z.object({
		todoId: z.number().describe("The ID of the todo to complete"),
	}),
	fn: ({ todoId }, context) => {
		const todos = context.state.get("todos", []);
		const todoIndex = todos.findIndex((todo) => todo.id === todoId);

		if (todoIndex === -1) {
			return {
				success: false,
				message: `❌ Todo with ID ${todoId} not found`,
			};
		}

		const todo = todos[todoIndex];
		if (todo.completed) {
			return {
				success: false,
				message: `ℹ️ Todo "${todo.task}" is already completed`,
			};
		}

		todos[todoIndex] = {
			...todo,
			completed: true,
			completedAt: new Date().toISOString(),
		};
		context.state.set("todos", todos);

		const remainingTodos = todos.filter((t) => !t.completed).length;

		return {
			success: true,
			completedTodo: todos[todoIndex],
			remainingTodos,
			message: `🎉 Completed: "${todo.task}" (${remainingTodos} remaining)`,
		};
	},
});

const deleteTodoTool = createTool({
	name: "delete_todo",
	description: "Delete a todo item permanently",
	schema: z.object({
		todoId: z.number().describe("The ID of the todo to delete"),
	}),
	fn: ({ todoId }, context) => {
		const todos = context.state.get("todos", []);
		const todoIndex = todos.findIndex((todo) => todo.id === todoId);

		if (todoIndex === -1) {
			return {
				success: false,
				message: `❌ Todo with ID ${todoId} not found`,
			};
		}

		const deletedTodo = todos[todoIndex];
		todos.splice(todoIndex, 1);
		context.state.set("todos", todos);

		return {
			success: true,
			deletedTodo,
			remainingTodos: todos.length,
			message: `🗑️ Deleted: "${deletedTodo.task}"`,
		};
	},
});

const updateTodoTool = createTool({
	name: "update_todo",
	description: "Update an existing todo item",
	schema: z.object({
		todoId: z.number().describe("The ID of the todo to update"),
		task: z.string().optional().describe("New task description"),
		priority: z
			.enum(["low", "medium", "high"])
			.optional()
			.describe("New priority"),
		category: z.string().optional().describe("New category"),
		dueDate: z.string().optional().describe("New due date (YYYY-MM-DD format)"),
	}),
	fn: ({ todoId, task, priority, category, dueDate }, context) => {
		const todos = context.state.get("todos", []);
		const todoIndex = todos.findIndex((todo) => todo.id === todoId);

		if (todoIndex === -1) {
			return {
				success: false,
				message: `❌ Todo with ID ${todoId} not found`,
			};
		}

		const originalTodo = { ...todos[todoIndex] };
		const updatedTodo = {
			...todos[todoIndex],
			...(task && { task }),
			...(priority && { priority }),
			...(category && { category }),
			...(dueDate && { dueDate }),
			updatedAt: new Date().toISOString(),
		};

		todos[todoIndex] = updatedTodo;
		context.state.set("todos", todos);

		return {
			success: true,
			originalTodo,
			updatedTodo,
			message: `📝 Updated todo #${todoId}`,
		};
	},
});

const getStatsTool = createTool({
	name: "get_stats",
	description: "Get comprehensive statistics about todos",
	schema: z.object({}),
	fn: (_, context) => {
		const todos = context.state.get("todos", []);

		const stats = {
			total: todos.length,
			completed: todos.filter((t) => t.completed).length,
			pending: todos.filter((t) => !t.completed).length,
			byPriority: {
				high: todos.filter((t) => t.priority === "high").length,
				medium: todos.filter((t) => t.priority === "medium").length,
				low: todos.filter((t) => t.priority === "low").length,
			},
			byCategory: todos.reduce(
				(acc, todo) => {
					acc[todo.category] = (acc[todo.category] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			),
			completionRate:
				todos.length > 0
					? Math.round(
							(todos.filter((t) => t.completed).length / todos.length) * 100,
						)
					: 0,
		};

		return {
			stats,
			message: `📊 Todo Statistics: ${stats.completed}/${stats.total} completed (${stats.completionRate}%)`,
		};
	},
});

async function main() {
	// Initialize session service with sample data
	const sessionService = new InMemorySessionService();
	const initialState = {
		todos: [
			{
				id: 1,
				task: "Learn ADK framework basics",
				priority: "high",
				category: "learning",
				completed: false,
				createdAt: new Date().toISOString(),
			},
			{
				id: 2,
				task: "Review tools and state management",
				priority: "medium",
				category: "learning",
				completed: true,
				createdAt: new Date(Date.now() - 86400000).toISOString(),
				completedAt: new Date().toISOString(),
			},
		],
	};

	// Create the todo agent
	const { runner, session } = await AgentBuilder.create("todo_assistant")
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(
			"A smart todo list assistant with comprehensive task management",
		)
		.withInstruction(
			dedent`
			You are a friendly and efficient todo list assistant. Help users manage their tasks effectively.

			Key capabilities:
			- Add todos with priority, category, and due dates
			- View and filter todos by various criteria
			- Mark todos as completed
			- Update existing todos
			- Delete unwanted todos
			- Provide helpful statistics and insights

			Guidelines:
			- When showing todos, format them nicely with IDs, priorities, and categories
			- Suggest categories if users don't specify them
			- Recommend priorities based on task descriptions
			- Provide encouraging feedback when tasks are completed
			- Use 1-based indexing when talking to users about todo IDs
			- Be helpful with filtering and organization suggestions
			- Celebrate productivity wins and provide gentle motivation
		`,
		)
		.withTools(
			addTodoTool,
			viewTodosTool,
			completeTodoTool,
			deleteTodoTool,
			updateTodoTool,
			getStatsTool,
		)
		.withSessionService(sessionService, { state: initialState })
		.build();

	// Start interactive session
	intro("📝 Todo Assistant");

	await ask(runner, "Show me my current todos and stats");

	// Interactive loop
	while (true) {
		const userInput = await text({
			message: "What would you like to do?",
			placeholder:
				"e.g., 'Add todo: Buy groceries' or 'Show high priority tasks' or 'Complete todo 1'",
		});

		if (isCancel(userInput)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (userInput === "exit" || userInput === "quit") {
			outro("👋 Goodbye! Your todos have been saved.");
			break;
		}

		try {
			await ask(runner, userInput);

			const updatedSession = await sessionService.getSession(
				session.appName,
				session.userId,
				session.id,
			);

			const todoCount = updatedSession?.state?.todos?.length || 0;
			const completedCount =
				updatedSession?.state?.todos?.filter((t: any) => t.completed).length ||
				0;

			console.log(
				`\n📊 Quick Stats: ${todoCount} total todos, ${completedCount} completed`,
			);
			console.log("─".repeat(50));
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}
}

main().catch(console.error);
