import {
	BasePlugin,
	type BaseTool,
	type CallbackContext,
	type LlmRequest,
	LlmResponse,
	type ToolContext,
} from "@iqai/adk";

export class GuardrailsPlugin extends BasePlugin {
	private static DEFAULT_BLOCKED_KEYWORDS = [
		{
			keywords: ["HACK", "EXPLOIT", "BYPASS", "JAILBREAK"],
			message:
				"I cannot help with requests related to unauthorized access or system manipulation.",
			stateKey: "blocked_security_violation",
		},
		{
			keywords: ["DELETE ALL", "DROP DATABASE", "REMOVE EVERYTHING"],
			message:
				"I cannot process potentially destructive operations without explicit confirmation.",
			stateKey: "blocked_destructive_operation",
		},
		{
			keywords: ["PASSWORD", "SECRET_KEY", "API_KEY", "CREDENTIALS"],
			message: "I cannot help with requests involving sensitive credentials.",
			stateKey: "blocked_credentials_request",
		},
	];

	private static DEFAULT_BLOCKED_TOOLS = [
		{
			toolName: "file_delete",
			argName: "path",
			values: ["/", "/etc", "/system", "C:\\Windows"],
			errorMessage: "Cannot delete critical system paths.",
			stateKey: "blocked_critical_path_deletion",
		},
	];

	constructor() {
		super("guardrails_plugin");
	}

	async beforeModelCallback({
		callbackContext,
		llmRequest,
	}: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		const userText =
			[...(llmRequest.contents || [])]
				.reverse()
				.find((c) => c.role === "user")
				?.parts?.map((p) => p.text ?? "")
				.join(" ")
				.toUpperCase() ?? "";

		for (const rule of GuardrailsPlugin.DEFAULT_BLOCKED_KEYWORDS) {
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
		for (const rule of GuardrailsPlugin.DEFAULT_BLOCKED_TOOLS) {
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
