import {
	BasePlugin,
	type CallbackContext,
	type BaseTool,
	type ToolContext,
	type LlmRequest,
	LlmResponse,
} from "@iqai/adk";

export interface GuardrailsPluginOptions {
	name?: string;
	blockKeywords?: Array<{
		keywords: string[];
		message?: string;
		stateKey?: string;
	}>;
	blockTools?: Array<{
		toolName: string;
		argName: string;
		values: (string | number | boolean)[];
		errorMessage?: string;
		stateKey?: string;
	}>;
}

export class GuardrailsPlugin extends BasePlugin {
	constructor(private options: GuardrailsPluginOptions = {}) {
		super(options.name ?? "guardrails_plugin");
	}

	async beforeModelCallback({
		callbackContext,
		llmRequest,
	}: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		const userText =
			llmRequest.contents
				?.reverse()
				.find((c) => c.role === "user")
				?.parts?.map((p) => p.text ?? "")
				.join(" ")
				.toUpperCase() ?? "";

		for (const rule of this.options.blockKeywords ?? []) {
			if (rule.keywords.some((kw) => userText.includes(kw.toUpperCase()))) {
				if (rule.stateKey) callbackContext.state.set(rule.stateKey, true);
				return new LlmResponse({
					content: {
						role: "model",
						parts: [
							{
								text:
									rule.message ??
									"I cannot process requests with blocked keywords.",
							},
						],
					},
					finishReason: "STOP",
				});
			}
		}
		return undefined;
	}

	async beforeToolCallback({
		tool,
		toolArgs,
		toolContext,
	}: {
		tool: BaseTool;
		toolArgs: Record<string, unknown>;
		toolContext: ToolContext;
	}): Promise<Record<string, unknown> | undefined> {
		for (const rule of this.options.blockTools ?? []) {
			if (tool.name !== rule.toolName) continue;

			const argValue = toolArgs[rule.argName];
			const isBlocked = rule.values.some((blocked) =>
				typeof argValue === "string" && typeof blocked === "string"
					? argValue.toLowerCase() === blocked.toLowerCase()
					: argValue === blocked,
			);

			if (isBlocked) {
				if (rule.stateKey) toolContext.state.set(rule.stateKey, true);
				return {
					status: "error",
					error_message:
						rule.errorMessage ?? `${tool.name} call blocked by guardrails.`,
				};
			}
		}
		return undefined;
	}
}
