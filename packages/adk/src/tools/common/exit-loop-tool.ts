import { Logger } from "@adk/logger";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Tool that allows an agent to exit the current execution loop
 */
export class ExitLoopTool extends BaseTool {
	protected logger = new Logger({ name: "ExitLoopTool" });

	/**
	 * Constructor for ExitLoopTool
	 */
	constructor() {
		super({
			name: "exit_loop",
			description:
				"Exits the loop. Call this function only when you are instructed to do so.",
		});
	}

	/**
	 * Execute the exit loop action
	 */
	async runAsync(
		_args: Record<string, any>,
		context: ToolContext,
	): Promise<any> {
		this.logger.debug("Executing exit loop tool");
		context.actions.escalate = true;
	}
}
