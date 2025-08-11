import { createTool } from "@iqai/adk";
import * as z from "zod";

export const calculatorTool = createTool({
	name: "calculate_expression",
	description: "Evaluate a basic arithmetic expression (+,-,*,/, parentheses).",
	schema: z.object({
		expression: z.string().describe("Arithmetic expression"),
	}),
	fn: ({ expression }, _ctx) => {
		if (!/^[-+*/() 0-9\.]+$/.test(expression)) {
			return { success: false, message: "Invalid characters in expression" };
		}
		try {
			// eslint-disable-next-line no-new-func
			const result = Function(`"use strict"; return (${expression})`)();
			if (typeof result !== "number" || !Number.isFinite(result)) {
				return {
					success: false,
					message: "Expression did not produce a finite number",
				};
			}
			return {
				success: true,
				expression,
				result,
				message: `${expression} = ${result}`,
			};
		} catch (e) {
			return {
				success: false,
				message: `Failed to evaluate: ${(e as Error).message}`,
			};
		}
	},
});
