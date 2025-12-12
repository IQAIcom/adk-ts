import { BaseTool, ToolContext } from "@adk/tools";
import dedent from "dedent";
import { BasePlugin } from "./base-plugin";

export const REFLECT_AND_RETRY_RESPONSE_TYPE =
	"ERROR_HANDLED_BY_REFLECT_AND_RETRY_PLUGIN";
export const GLOBAL_SCOPE_KEY = "__global_reflect_and_retry_scope__";

export type PerToolFailuresCounter = Record<string, number>;

export enum TrackingScope {
	INVOCATION = "invocation",
	GLOBAL = "global",
}

export interface ToolFailureResponse {
	response_type: string;
	error_type: string;
	error_details: string;
	retry_count: number;
	reflection_guidance: string;
}

export interface ReflectAndRetryToolPluginOptions {
	name?: string;
	maxRetries?: number;
	throwExceptionIfRetryExceeded?: boolean;
	trackingScope?: TrackingScope;
}

export class ReflectAndRetryToolPlugin extends BasePlugin {
	maxRetries: number;
	throwExceptionIfRetryExceeded: boolean;
	scope: TrackingScope;
	private _scopedFailureCounters: Record<string, PerToolFailuresCounter>;
	private _lock: Promise<ToolFailureResponse | undefined>;

	constructor({
		name = "reflect_retry_tool_plugin",
		maxRetries = 3,
		throwExceptionIfRetryExceeded = true,
		trackingScope = TrackingScope.INVOCATION,
	}: ReflectAndRetryToolPluginOptions = {}) {
		super(name);

		if (maxRetries < 0)
			throw new Error("maxRetries must be a non-negative integer.");

		this.maxRetries = maxRetries;
		this.throwExceptionIfRetryExceeded = throwExceptionIfRetryExceeded;
		this.scope = trackingScope;
		this._scopedFailureCounters = {};
		this._lock = Promise.resolve(undefined);
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: any;
	}): Promise<Record<string, any> | undefined> {
		const { tool, toolArgs, toolContext, result } = params;

		if (result?.response_type === REFLECT_AND_RETRY_RESPONSE_TYPE) {
			return undefined;
		}

		const error = await this.extractErrorFromResult({
			tool,
			toolArgs,
			toolContext,
			result,
		});

		if (error) {
			return this._handleToolError(tool, toolArgs, toolContext, error);
		}

		this._resetFailuresForTool(toolContext, tool.name);
		return undefined;
	}

	async extractErrorFromResult(_params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: any;
	}): Promise<any | undefined> {
		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: any;
	}): Promise<Record<string, any> | undefined> {
		return this._handleToolError(
			params.tool,
			params.toolArgs,
			params.toolContext,
			params.error,
		);
	}

	private async _handleToolError(
		tool: BaseTool,
		toolArgs: Record<string, any>,
		toolContext: ToolContext,
		error: any,
	): Promise<Record<string, any>> {
		if (this.maxRetries === 0) {
			if (this.throwExceptionIfRetryExceeded) throw error;
			return this._getToolRetryExceedMsg(tool, toolArgs, error);
		}

		const scopeKey = this._getScopeKey(toolContext);

		// Lock to prevent race conditions
		this._lock = this._lock.then(async () => {
			let counters = this._scopedFailureCounters[scopeKey];
			if (!counters) {
				counters = {};
				this._scopedFailureCounters[scopeKey] = counters;
			}

			const currentRetries = (counters[tool.name] ?? 0) + 1;
			counters[tool.name] = currentRetries;

			if (currentRetries <= this.maxRetries) {
				return this._createToolReflectionResponse(
					tool,
					toolArgs,
					error,
					currentRetries,
				);
			}

			if (this.throwExceptionIfRetryExceeded) throw error;
			return this._getToolRetryExceedMsg(tool, toolArgs, error);
		});

		return this._lock;
	}

	private _getScopeKey(toolContext: ToolContext): string {
		switch (this.scope) {
			case TrackingScope.INVOCATION:
				return toolContext.invocationId;
			case TrackingScope.GLOBAL:
				return GLOBAL_SCOPE_KEY;
			default:
				throw new Error(`Unknown scope: ${this.scope}`);
		}
	}

	private _resetFailuresForTool(
		toolContext: ToolContext,
		toolName: string,
	): void {
		const scopeKey = this._getScopeKey(toolContext);
		const counters = this._scopedFailureCounters[scopeKey];
		if (counters) {
			delete counters[toolName];
		}
	}

	private _createToolReflectionResponse(
		tool: BaseTool,
		toolArgs: Record<string, any>,
		error: any,
		retryCount: number,
	): ToolFailureResponse {
		const errorDetails = this._formatErrorDetails(error);
		const argsSummary = this._formatArgs(toolArgs);

		const reflectionMessage = dedent`
          The call to tool \`${tool.name}\` failed.

          **Error Details:**
          \`\`\`
          ${errorDetails}
          \`\`\`

          **Tool Arguments Used:**
          ${argsSummary}

          **Reflection Guidance:**
          This is retry attempt **${retryCount} of ${this.maxRetries}**. Analyze the error and the arguments you provided. Do not repeat the exact same call. Consider:

          1. Invalid Parameters
          2. State or Preconditions
          3. Alternative Approach
          4. Simplify the Task
          5. Wrong Function Name

          Formulate a new plan and try a corrected approach.
    `;

		return {
			response_type: REFLECT_AND_RETRY_RESPONSE_TYPE,
			error_type: error?.name ?? "ToolError",
			error_details: errorDetails,
			retry_count: retryCount,
			reflection_guidance: reflectionMessage.trim(),
		};
	}

	private _getToolRetryExceedMsg(
		tool: BaseTool,
		toolArgs: Record<string, any>,
		error: any,
	): ToolFailureResponse {
		const errorDetails = this._formatErrorDetails(error);
		const argsSummary = this._formatArgs(toolArgs);

		const reflectionMessage = dedent`
        The tool \`${tool.name}\` has failed consecutively ${this.maxRetries} times and retry limit exceeded.

        **Last Error:**
        \`\`\`
        ${errorDetails}
        \`\`\`

        **Last Arguments Used:**
        ${argsSummary}

        **Final Instruction:**
        Do not attempt to use the \`${tool.name}\` tool again for this task. Devise a new strategy or inform the user that the task cannot be completed.
    `;

		return {
			response_type: REFLECT_AND_RETRY_RESPONSE_TYPE,
			error_type: error?.name ?? "ToolError",
			error_details: errorDetails,
			retry_count: this.maxRetries,
			reflection_guidance: reflectionMessage.trim(),
		};
	}

	private _formatErrorDetails(error: any): string {
		return error instanceof Error
			? `${error.name}: ${error.message}`
			: String(error);
	}

	private _formatArgs(toolArgs: Record<string, any>): string {
		const entries = Object.entries(toolArgs);
		if (entries.length === 0) return "(no arguments)";

		return entries
			.map(([key, value]) => `- ${key}: ${String(value)}`)
			.join("\n");
	}
}
