import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

interface UserInteractionResult {
	success: boolean;
	userInput?: string;
	error?: string;
}

/**
 * Interface for User Interaction actions
 */
interface UserInteractionActions {
	promptUser: (options: {
		prompt: string;
		defaultValue?: string;
		options?: { choices: string[] };
	}) => Promise<string>;
	skipSummarization?: (skip: boolean) => void;
}

/**
 * Tool for prompting the user for input
 */
export class UserInteractionTool extends BaseTool {
	constructor() {
		super({
			name: "user_interaction",
			description: "Prompt the user for input during agent execution",
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
					prompt: {
						type: Type.STRING,
						description: "The prompt message to display to the user",
					},
					options: {
						type: Type.ARRAY,
						description: "Optional array of choices to present to the user",
						items: {
							type: Type.STRING,
						},
					},
					defaultValue: {
						type: Type.STRING,
						description: "Optional default value for the input field",
					},
				},
				required: ["prompt"],
			},
		};
	}

	/**
	 * Execute the user interaction
	 */
	async runAsync(
		args: {
			prompt: string;
			options?: string[];
			defaultValue?: string;
		},
		context: ToolContext,
	): Promise<UserInteractionResult> {
		try {
			// Get the actions from context - typecasting as we know this might be available
			const actions = (context as any).actions as
				| UserInteractionActions
				| undefined;

			// If no actions interface is available, return an error
			if (!actions || !actions.promptUser) {
				return {
					success: false,
					error: "User interaction is not supported in the current environment",
				};
			}

			// Skip summarization to show the full user interaction
			if (actions.skipSummarization) {
				actions.skipSummarization(true);
			}

			// Prepare the options for the prompt
			const promptOptions =
				args.options && args.options.length > 0
					? {
							choices: args.options,
						}
					: undefined;

			// Send the prompt to the user
			const response = await actions.promptUser({
				prompt: args.prompt,
				defaultValue: args.defaultValue,
				options: promptOptions,
			});

			// Return the user input
			return {
				success: true,
				userInput: response,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
