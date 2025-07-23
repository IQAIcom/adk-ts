import { Logger } from "@adk/logger";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Tool that allows an agent to get a choice from the user
 */
export class GetUserChoiceTool extends BaseTool {
	protected logger = new Logger({ name: "GetUserChoiceTool" });

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
				type: Type.OBJECT,
				properties: {
					options: {
						type: Type.ARRAY,
						description: "List of options for the user to choose from",
						items: {
							type: Type.STRING,
						},
					},
					question: {
						type: Type.STRING,
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
		this.logger.debug(
			`Executing get_user_choice with options: ${args.options.join(", ")}`,
		);
		if (args.question) {
			this.logger.debug(`Question: ${args.question}`);
		}

		context.actions.skipSummarization = true;

		// In a real implementation, this would display options to the user
		// and wait for their choice, but for now we just return null as in the Python version
		return null;
	}
}
