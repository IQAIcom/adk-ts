import { Logger } from "@adk/helpers/logger";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Tool that allows an agent to transfer control to another agent
 */
export class TransferToAgentTool extends BaseTool {
	private logger = new Logger({ name: "TransferToAgentTool" });

	/**
	 * Constructor for TransferToAgentTool
	 */
	constructor() {
		super({
			name: "transfer_to_agent",
			description: "Transfer the question to another agent.",
		});
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
