import { BaseTool } from "../../src";
import type { ToolContext } from "../../src/models/context/ToolContext";
import type { FunctionDeclaration } from "../../src/models/request/FunctionDeclaration";

/**
 * Custom Calculator Tool
 */
export class CalculatorTool extends BaseTool {
	constructor() {
		super({
			name: "calculator",
			description: "Perform basic arithmetic calculations",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					operation: {
						type: "string",
						description:
							"The operation to perform: add, subtract, multiply, divide",
						enum: ["add", "subtract", "multiply", "divide"],
					},
					a: {
						type: "number",
						description: "First operand",
					},
					b: {
						type: "number",
						description: "Second operand",
					},
				},
				required: ["operation", "a", "b"],
			},
		};
	}

	async runAsync(
		args: {
			operation: string;
			a: number;
			b: number;
		},
		_context: ToolContext,
	): Promise<any> {
		console.log(`Calculating: ${args.a} ${args.operation} ${args.b}`);

		switch (args.operation) {
			case "add":
				return { result: args.a + args.b };
			case "subtract":
				return { result: args.a - args.b };
			case "multiply":
				return { result: args.a * args.b };
			case "divide":
				if (args.b === 0) {
					throw new Error("Division by zero is not allowed");
				}
				return { result: args.a / args.b };
			default:
				throw new Error(`Unknown operation: ${args.operation}`);
		}
	}
}
