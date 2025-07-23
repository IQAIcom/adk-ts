import type { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import { buildFunctionDeclaration } from "./function-utils";

/**
 * A tool that wraps a user-defined TypeScript function.
 *
 * This tool automatically generates a function declaration from the function's
 * signature and documentation, making it easy to expose functions to agents.
 */
export class FunctionTool<T extends Record<string, any>> extends BaseTool {
	private func: (...args: any[]) => any;
	private mandatoryArgs: string[] = [];
	private parameterTypes: Record<string, string> = {};

	/**
	 * Creates a new FunctionTool wrapping the provided function.
	 *
	 * @param func The function to wrap
	 * @param options Optional configuration for the tool
	 */
	constructor(
		func: (...args: any[]) => any,
		options?: {
			name?: string;
			description?: string;
			isLongRunning?: boolean;
			shouldRetryOnFailure?: boolean;
			maxRetryAttempts?: number;
			parameterTypes?: Record<string, string>;
		},
	) {
		const name = options?.name || func.name;
		const description =
			options?.description ||
			(func.toString().match(/\/\*\*([\s\S]*?)\*\//) || [])[1]?.trim() ||
			"";

		super({
			name,
			description,
			isLongRunning: options?.isLongRunning || false,
			shouldRetryOnFailure: options?.shouldRetryOnFailure || false,
			maxRetryAttempts: options?.maxRetryAttempts || 3,
		});

		this.func = func;
		this.mandatoryArgs = this.getMandatoryArgs(func);
		this.parameterTypes = options?.parameterTypes || {};
	}

	/**
	 * Executes the wrapped function with the provided arguments.
	 */
	async runAsync(args: T, context: ToolContext): Promise<any> {
		try {
			// Check for missing mandatory arguments
			const missingArgs = this.getMissingMandatoryArgs(args);
			if (missingArgs.length > 0) {
				const missingArgsStr = missingArgs.join("\n");
				return {
					error: `Invoking \`${this.name}()\` failed as the following mandatory input parameters are not present:
${missingArgsStr}
You could retry calling this tool, but it is IMPORTANT for you to provide all the mandatory parameters.`,
				};
			}

			// Add context if needed
			const argsToCall = { ...args } as Record<string, any>;
			if (this.functionAcceptsToolContext()) {
				argsToCall.toolContext = context;
			}

			// Convert args object to individual arguments by extracting values
			// in the same order as the function parameters
			const funcParams = this.getFunctionParameters();
			const argValues: any[] = [];

			for (const paramName of funcParams) {
				if (paramName === "toolContext" && this.functionAcceptsToolContext()) {
					argValues.push(context);
				} else if (paramName in argsToCall) {
					// Convert the argument to the proper type based on function signature
					const convertedValue = this.convertArgumentType(
						argsToCall[paramName],
						paramName,
					);
					argValues.push(convertedValue);
				} else {
					// This should be caught by missing args check above, but add undefined as fallback
					argValues.push(undefined);
				}
			}

			// Call the function with individual arguments
			if (this.isAsyncFunction(this.func)) {
				return (await this.func(...argValues)) || {};
			}

			return this.func(...argValues) || {};
		} catch (error) {
			return {
				error: `Error executing function ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Returns the function declaration for this tool.
	 */
	getDeclaration(): FunctionDeclaration {
		const declaration = buildFunctionDeclaration(this.func, {
			name: this.name,
			description: this.description,
			ignoreParams: ["toolContext"],
		});

		// Override parameter types if explicitly provided
		if (
			Object.keys(this.parameterTypes).length > 0 &&
			declaration.parameters?.properties
		) {
			for (const [paramName, paramType] of Object.entries(
				this.parameterTypes,
			)) {
				if (declaration.parameters.properties[paramName]) {
					declaration.parameters.properties[paramName].type = paramType as Type;
				}
			}
		}

		return declaration;
	}

	/**
	 * Checks if the wrapped function accepts a toolContext parameter.
	 */
	private functionAcceptsToolContext(): boolean {
		const funcStr = this.func.toString();
		return funcStr.includes("toolContext") || funcStr.includes("context");
	}

	/**
	 * Checks if the wrapped function is async.
	 */
	private isAsyncFunction(func: (...args: any[]) => any): boolean {
		return func.constructor.name === "AsyncFunction";
	}

	/**
	 * Extracts the mandatory arguments from a function.
	 * In TypeScript, we can't easily inspect parameter defaults at runtime,
	 * so this is a best-effort approach.
	 */
	private getMandatoryArgs(func: (...args: any[]) => any): string[] {
		const funcStr = func.toString();

		// Extract parameter list from function string
		const paramMatch = funcStr.match(/\(([^)]*)\)/);
		if (!paramMatch) return [];

		const paramList = paramMatch[1].split(",");

		// Parameters without "=" are considered mandatory
		return paramList
			.map((param) => param.trim())
			.filter((param) => !param.includes("=") && param !== "")
			.map((param) => {
				// Handle destructuring, type annotations, etc.
				const nameMatch = param.match(/^(\w+)(?:\s*:[^=]+)?$/);
				return nameMatch ? nameMatch[1] : param;
			})
			.filter((param) => param !== "toolContext" && param !== "context");
	}

	/**
	 * Checks which mandatory arguments are missing from the provided args.
	 */
	private getMissingMandatoryArgs(args: T): string[] {
		return this.mandatoryArgs.filter((arg) => !(arg in args));
	}

	/**
	 * Extracts the function parameters from the function's signature.
	 */
	private getFunctionParameters(): string[] {
		const funcStr = this.func.toString();
		const paramMatch = funcStr.match(/\(([^)]*)\)/);
		if (!paramMatch) return [];

		const paramList = paramMatch[1].split(",");
		return paramList
			.map((param) => param.trim())
			.filter((param) => param !== "")
			.map((param) => {
				// Handle destructuring, type annotations, etc.
				const nameMatch = param.match(/^(\w+)(?:\s*[:=].*)?$/);
				return nameMatch ? nameMatch[1] : param;
			});
	}

	/**
	 * Converts an argument to the proper type based on the function signature.
	 */
	private convertArgumentType(value: any, paramName: string): any {
		// If value is already the correct type or null/undefined, return as-is
		if (value === null || value === undefined) {
			return value;
		}

		// Extract type information from function signature
		const paramType = this.getParameterType(paramName);

		// Convert based on the parameter type
		switch (paramType) {
			case "number":
				if (typeof value === "string" && !Number.isNaN(Number(value))) {
					return Number(value);
				}
				if (typeof value === "number") {
					return value;
				}
				break;
			case "boolean":
				if (typeof value === "string") {
					return value.toLowerCase() === "true";
				}
				if (typeof value === "boolean") {
					return value;
				}
				break;
			case "string":
				return String(value);
			default:
				// For complex types or unknown types, return as-is
				return value;
		}

		return value;
	}

	/**
	 * Extracts the type of a specific parameter from the function signature.
	 */
	private getParameterType(paramName: string): string {
		// First check if explicit parameter types were provided
		if (this.parameterTypes[paramName]) {
			return this.parameterTypes[paramName].toLowerCase();
		}

		// Fallback to function declaration schema
		const declaration = this.getDeclaration();
		if (declaration?.parameters?.properties) {
			const paramSchema = declaration.parameters.properties[paramName];
			if (paramSchema?.type) {
				return paramSchema.type.toLowerCase();
			}
		}

		// Default to string if no type found
		return "string";
	}
}
