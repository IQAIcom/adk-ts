import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";

import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content } from "@google/genai";
import { z } from "zod";
import { BasePlugin } from "./base-plugin";

export const pluginCallbackNameSchema = z.enum([
	"onUserMessageCallback",
	"beforeRunCallback",
	"afterRunCallback",
	"onEventCallback",
	"beforeAgentCallback",
	"afterAgentCallback",
	"beforeToolCallback",
	"afterToolCallback",
	"beforeModelCallback",
	"afterModelCallback",
	"onToolErrorCallback",
	"onModelErrorCallback",
]);

export type PluginCallbackName = z.infer<typeof pluginCallbackNameSchema>;

export class PluginManager {
	readonly plugins: BasePlugin[] = [];
	private readonly closeTimeout: number;

	constructor(opts?: { plugins?: BasePlugin[]; closeTimeout?: number }) {
		this.closeTimeout = opts?.closeTimeout ?? 5000;

		if (opts?.plugins) {
			for (const plugin of opts.plugins) {
				this.registerPlugin(plugin);
			}
		}
	}

	/** Register a plugin (unique names) */
	registerPlugin(plugin: BasePlugin): void {
		if (this.plugins.some((p) => p.name === plugin.name)) {
			throw new Error(`Plugin with name '${plugin.name}' already registered.`);
		}
		this.plugins.push(plugin);
	}

	getPlugin(name: string): BasePlugin | undefined {
		return this.plugins.find((p) => p.name === name);
	}

	runOnUserMessageCallback(params: {
		userMessage: Content;
		invocationContext: InvocationContext;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.onUserMessageCallback,
			params,
		);
	}

	runBeforeRunCallback(params: { invocationContext: InvocationContext }) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.beforeRunCallback,
			params,
		);
	}

	runAfterRunCallback(params: { invocationContext: InvocationContext }) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.afterRunCallback,
			params,
		);
	}

	runOnEventCallback(params: {
		invocationContext: InvocationContext;
		event: Event;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.onEventCallback,
			params,
		);
	}

	runBeforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.beforeAgentCallback,
			params,
		);
	}

	runAfterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.afterAgentCallback,
			params,
		);
	}

	runBeforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.beforeToolCallback,
			params,
		);
	}

	runAfterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: Record<string, any>;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.afterToolCallback,
			params,
		);
	}

	runBeforeModelCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.beforeModelCallback,
			params,
		);
	}

	runAfterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.afterModelCallback,
			params,
		);
	}

	runOnToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: Error;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.onToolErrorCallback,
			params,
		);
	}

	runOnModelErrorCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: Error;
	}) {
		return this.runCallbacks(
			pluginCallbackNameSchema.enum.onModelErrorCallback,
			params,
		);
	}

	// -----------------------------
	// Core callback executor
	// -----------------------------
	private async runCallbacks(
		name: PluginCallbackName,
		params: Record<string, any>,
	): Promise<any | undefined> {
		for (const plugin of this.plugins) {
			const method = plugin[name];
			if (!method) continue;

			try {
				const result = await method.call(plugin, params);
				if (result !== undefined) {
					// Early exit if plugin returns a value
					return result;
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				throw new Error(
					`Error in plugin '${plugin.name}' during '${name}' callback: ${errorMessage}`,
				);
			}
		}

		return undefined;
	}

	// -----------------------------
	// Close all plugins with timeout
	// -----------------------------
	async close(): Promise<void> {
		const failures: Record<string, unknown> = {};

		for (const plugin of this.plugins) {
			const closeMethod = plugin.close?.bind(plugin);
			if (!closeMethod) continue;

			try {
				await Promise.race([
					closeMethod(),
					new Promise((_, reject) =>
						setTimeout(
							() => reject(new Error("close() timeout")),
							this.closeTimeout,
						),
					),
				]);
			} catch (err) {
				failures[plugin.name] = err;
			}
		}

		if (Object.keys(failures).length > 0) {
			const summary = Object.entries(failures)
				.map(
					([name, error]) =>
						`'${name}': ${error instanceof Error ? error.message : String(error)}`,
				)
				.join(", ");

			throw new Error(`Failed to close plugins: ${summary}`);
		}
	}
}
