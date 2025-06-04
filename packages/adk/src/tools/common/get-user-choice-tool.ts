import { debugLog } from "@adk/helpers/debug";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import "../tool-context-extensions";

/**
 * Tool that allows an agent to get a choice from the user
 */
export class GetUserChoiceTool extends BaseTool {
	/**
	 * Constructor for GetUserChoiceTool
	 */
	constructor() {
		super({
			name: "get_user_choice",
			description:
				"This tool provides the options to the user and asks them to choose one. Use this tool when you need the user to make a selection between multiple options. Do not list options in your response - use this tool instead.",
			isLongRunning: true,
		});
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					options: {
						type: "array",
						description: "List of options for the user to choose from",
						items: {
							type: "string",
						},
					},
					question: {
						type: "string",
						description:
							"The question or prompt to show the user before presenting options",
					},
				},
				required: ["options"],
			},
		};
	}

	/**
	 * Execute the user choice action
	 * This is a long running operation that will return null initially
	 * and the actual choice will be provided asynchronously
	 */
	async runAsync(
		args: {
			options: string[];
			question?: string;
		},
		context: ToolContext,
	): Promise<any> {
		debugLog(
			`[GetUserChoiceTool] Executing get_user_choice with options: ${args.options.join(
				", ",
			)}`,
		);
		if (args.question) {
			debugLog(`[GetUserChoiceTool] Question: ${args.question}`);
		}

		// Set skip_summarization flag to true
		if (context.actions) {
			context.actions.skip_summarization = true;
		} else {
			// Initialize the actions object if it doesn't exist
			context.actions = {
				skip_summarization: true,
			};
		}

		// In a real implementation, this would display options to the user
		// and wait for their choice, but for now we just return null as in the Python version
		return null;
	}
}
