import { Logger } from "@adk/logger";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Tool that allows an agent to transfer control to another agent
 */
export class TransferToAgentTool extends BaseTool {
	protected logger = new Logger({ name: "TransferToAgentTool" });

	/**
	 * Constructor for TransferToAgentTool
	 */
	constructor() {
		super({
			name: "transfer_to_agent",
			description:
				"Transfer the question to another agent when it's more suitable to answer the user's question according to the agent's description. Use this function when you determine that another agent in the system would be better equipped to handle the user's request based on their specialized capabilities and expertise areas.",
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
					agent_name: {
						type: Type.STRING,
						description: "The name of the agent to transfer control to",
					},
				},
				required: ["agent_name"],
			},
		};
	}

	/**
	 * Execute the transfer to agent action
	 */
	async runAsync(
		args: {
			agent_name: string;
		},
		context: ToolContext,
	): Promise<any> {
		this.logger.debug(`Executing transfer to agent: ${args.agent_name}`);
		context.actions.transferToAgent = args.agent_name;
	}
}
