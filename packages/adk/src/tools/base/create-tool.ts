import * as z from "zod";
import type {
	FunctionDeclaration,
	JSONSchema,
} from "../../models/function-declaration";
import type { ToolContext } from "../tool-context";
import { BaseTool } from "./base-tool";

/**
 * Configuration for creating a tool
 */
export interface CreateToolConfig<
	T extends Record<string, any> = Record<string, never>,
> {
	/** The name of the tool */
	name: string;
	/** A description of what the tool does */
	description: string;
	/** Zod schema for validating tool arguments (optional) */
	schema?: z.ZodSchema<T>;
	/** The function to execute (can be sync or async) */
	fn: (args: T, context: ToolContext) => any;
	/** Whether the tool is a long running operation */
	isLongRunning?: boolean;
	/** Whether the tool execution should be retried on failure */
	shouldRetryOnFailure?: boolean;
	/** Maximum retry attempts */
	maxRetryAttempts?: number;
}

/**
 * Configuration for creating a tool with schema
 */
export interface CreateToolConfigWithSchema<T extends Record<string, any>> {
	/** The name of the tool */
	name: string;
	/** A description of what the tool does */
	description: string;
	/** Zod schema for validating tool arguments */
	schema: z.ZodSchema<T>;
	/** The function to execute (can be sync or async) */
	fn: (args: T, context: ToolContext) => any;
	/** Whether the tool is a long running operation */
	isLongRunning?: boolean;
	/** Whether the tool execution should be retried on failure */
	shouldRetryOnFailure?: boolean;
	/** Maximum retry attempts */
	maxRetryAttempts?: number;
}

/**
 * Configuration for creating a tool without schema (no parameters)
 */
export interface CreateToolConfigWithoutSchema {
	/** The name of the tool */
	name: string;
	/** A description of what the tool does */
	description: string;
	/** The function to execute (can be sync or async) */
	fn: (args: Record<string, never>, context: ToolContext) => any;
	/** Whether the tool is a long running operation */
	isLongRunning?: boolean;
	/** Whether the tool execution should be retried on failure */
	shouldRetryOnFailure?: boolean;
	/** Maximum retry attempts */
	maxRetryAttempts?: number;
}

/**
 * A tool implementation created by createTool
 */
class CreatedTool<T extends Record<string, any>> extends BaseTool {
	private func: (args: T, context: ToolContext) => any;
	private schema: z.ZodSchema<T>;
	private functionDeclaration: FunctionDeclaration;

	constructor(config: CreateToolConfig<T>) {
		super({
			name: config.name,
			description: config.description,
			isLongRunning: config.isLongRunning ?? false,
			shouldRetryOnFailure: config.shouldRetryOnFailure ?? false,
			maxRetryAttempts: config.maxRetryAttempts ?? 3,
		});

		this.func = config.fn;
		this.schema = (config.schema ?? z.object({})) as z.ZodSchema<T>;
		this.functionDeclaration = this.buildDeclaration();
	}

	/**
	 * Executes the tool function with validation
	 */
	async runAsync(args: any, context: ToolContext): Promise<any> {
		try {
			// Validate arguments using Zod schema
			const validatedArgs = this.schema.parse(args);

			// Call the function with validated arguments.
			// `Promise.resolve` handles both sync and async functions gracefully.
			const result = await Promise.resolve(this.func(validatedArgs, context));

			// Ensure we return an object, but preserve falsy values like 0, false, ""
			return result ?? {};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					error: `Invalid arguments for ${this.name}: ${error.message}`,
				};
			}
			return {
				error: `Error executing ${this.name}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	}

	/**
	 * Returns the function declaration for this tool
	 */
	getDeclaration(): FunctionDeclaration {
		return this.functionDeclaration;
	}

	/**
	 * Builds the function declaration from the Zod schema
	 */
	private buildDeclaration(): FunctionDeclaration {
		const rawParameters = z.toJSONSchema(this.schema);

		// Remove $schema field which is not needed for LLM function declarations
		const { $schema, ...parameters } = rawParameters as any;

		return {
			name: this.name,
			description: this.description,
			parameters: parameters as JSONSchema,
		};
	}
}

/**
 * Creates a tool from a configuration object.
 *
 * This is a more user-friendly alternative to FunctionTool that provides:
 * - Automatic argument validation using Zod schemas
 * - Clear error messages for invalid inputs
 * - Automatic JSON Schema generation for LLM function declarations
 * - Support for both sync and async functions
 * - Optional ToolContext parameter support
 *
 * @param config The tool configuration object
 * @returns A BaseTool instance ready for use with agents
 *
 * @example
 * ```typescript
 * import { createTool } from '@iqai/adk';
 * import { z } from 'zod';
 *
 * // Tool with parameters
 * const calculatorTool = createTool({
 *   name: 'calculator',
 *   description: 'Performs basic arithmetic operations',
 *   schema: z.object({
 *     operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
 *     a: z.number().describe('First number'),
 *     b: z.number().describe('Second number')
 *   }),
 *   fn: ({ operation, a, b }) => {
 *     switch (operation) {
 *       case 'add': return { result: a + b };
 *       case 'subtract': return { result: a - b };
 *       case 'multiply': return { result: a * b };
 *       case 'divide': return { result: b !== 0 ? a / b : 'Cannot divide by zero' };
 *       default: return { error: 'Unknown operation' };
 *     }
 *   }
 * });
 *
 * // Tool without parameters (schema is optional)
 * const timestampTool = createTool({
 *   name: 'timestamp',
 *   description: 'Gets the current timestamp',
 *   fn: () => ({ timestamp: Date.now() })
 * });
 * ```
 */

// Function overload for tools with schema
export function createTool<T extends Record<string, any>>(
	config: CreateToolConfigWithSchema<T>,
): BaseTool;

// Function overload for tools without schema
export function createTool(config: CreateToolConfigWithoutSchema): BaseTool;

// CORRECTED IMPLEMENTATION:
// This non-generic implementation uses a union type to match the overloads,
// preventing the recursive type inference that was causing the crash.
export function createTool(
	config: CreateToolConfigWithSchema<any> | CreateToolConfigWithoutSchema,
): BaseTool {
	// The overloads guarantee the config is valid, so we can safely cast it
	// to the general shape that the CreatedTool constructor expects.
	return new CreatedTool(config as CreateToolConfig<any>);
}
