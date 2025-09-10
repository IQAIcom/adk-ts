import {
	type BaseAgent,
	CallbackContext,
	type InvocationContext,
	ReadonlyContext,
	StreamingMode,
} from "@adk/agents";
import { Event } from "@adk/events";
import { Logger } from "@adk/logger";
import { LogFormatter } from "@adk/logger/log-formatter";
import {
	type BaseLlm,
	LlmRequest,
	type LlmResponse,
	type FunctionDeclaration,
} from "@adk/models";
import { traceLlmCall } from "@adk/telemetry";
import { ToolContext } from "@adk/tools";
import * as functions from "./functions";

// Tool interfaces for better type safety
interface ToolWithFunctionDeclarations {
	functionDeclarations: FunctionDeclaration[];
	[key: string]: any;
}

interface NamedTool {
	name: string;
	[key: string]: any;
}

type Tool = ToolWithFunctionDeclarations | NamedTool | any;

const _ADK_AGENT_NAME_LABEL_KEY = "adk_agent_name";

export abstract class BaseLlmFlow {
	requestProcessors: Array<any> = [];
	responseProcessors: Array<any> = [];

	protected logger = new Logger({ name: "BaseLlmFlow" });

	async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
		this.logger.debug(`Agent '${invocationContext.agent.name}' started.`);

		let stepCount = 0;
		while (true) {
			stepCount++;
			let lastEvent: Event | null = null;
			for await (const event of this._runOneStepAsync(invocationContext)) {
				lastEvent = event;
				yield event;
			}

			if (!lastEvent || lastEvent.isFinalResponse()) {
				this.logger.debug(
					`Agent '${invocationContext.agent.name}' finished after ${stepCount} steps.`,
				);
				break;
			}

			if (lastEvent.partial) {
				this.logger.error(
					"Partial event encountered. LLM max output limit may be reached.",
				);
				throw new Error(
					"Last event shouldn't be partial. LLM max output limit may be reached.",
				);
			}
		}
	}

	async *runLive(invocationContext: InvocationContext): AsyncGenerator<Event> {
		this.logger.warn("⚠️ runLive not fully implemented, delegating to runAsync");
		yield* this.runAsync(invocationContext);
	}

	async *_runOneStepAsync(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event> {
		const llmRequest = new LlmRequest();

		// Preprocessing phase
		let preprocessEventCount = 0;
		for await (const event of this._preprocessAsync(
			invocationContext,
			llmRequest,
		)) {
			preprocessEventCount++;
			yield event;
		}

		if (invocationContext.endInvocation) {
			this.logger.debug("Invocation ended during preprocessing.");
			return;
		}

		// Model response phase
		const modelResponseEvent = new Event({
			id: Event.newId(),
			invocationId: invocationContext.invocationId,
			author: invocationContext.agent.name,
			branch: invocationContext.branch,
		});

		let llmResponseCount = 0;
		for await (const llmResponse of this._callLlmAsync(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		)) {
			llmResponseCount++;

			for await (const event of this._postprocessAsync(
				invocationContext,
				llmRequest,
				llmResponse,
				modelResponseEvent,
			)) {
				modelResponseEvent.id = Event.newId();
				yield event;
			}
		}
	}

	async *_preprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent;
		if (
			!("canonicalTools" in agent) ||
			typeof agent.canonicalTools !== "function"
		) {
			return;
		}

		// Run request processors
		for (const processor of this.requestProcessors) {
			for await (const event of processor.runAsync(
				invocationContext,
				llmRequest,
			)) {
				yield event;
			}
		}

		// Process canonical tools
		let tools = await agent.canonicalTools(
			new ReadonlyContext(invocationContext),
		);

		// Debug: capture raw tool declarations prior to any dedup (only if DEBUG_TOOLS env var set)

		// Deduplicate tools by name to avoid duplicate function declarations in provider requests
		if (tools.length > 1) {
			const seen = new Set<string>();
			const filtered: any[] = [];
			for (const t of tools) {
				const name = (t as any)?.name;
				if (!name) continue;
				if (seen.has(name)) {
					continue;
				}
				seen.add(name);
				filtered.push(t);
			}
			tools = filtered;
		}

		for (const tool of tools) {
			const toolContext = new ToolContext(invocationContext);
			await tool.processLlmRequest(toolContext, llmRequest);
		}

		// Log available tools in a clean format
		if (tools.length > 0) {
			const toolsData = tools.map((tool) => ({
				Name: tool.name,
				Description:
					tool.description?.substring(0, 50) +
					(tool.description?.length > 50 ? "..." : ""),
				"Long Running": tool.isLongRunning ? "Yes" : "No",
			}));

			this.logger.debugArray("🛠️ Available Tools", toolsData);
		}
	}

	async *_postprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		// Run response processors
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			yield event;
		}

		if (
			!llmResponse.content &&
			!llmResponse.errorCode &&
			!llmResponse.interrupted
		) {
			return;
		}

		// Finalize model response event
		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);

		yield finalizedEvent;

		// Handle function calls
		const functionCalls = finalizedEvent.getFunctionCalls();
		if (functionCalls && functionCalls.length > 0) {
			// Log function calls in a clean format
			const functionCallsData = functionCalls.map((fc) => ({
				Name: fc.name,
				Arguments:
					JSON.stringify(fc.args).substring(0, 100) +
					(JSON.stringify(fc.args).length > 100 ? "..." : ""),
				ID: fc.id || "auto",
			}));

			this.logger.debugArray("🔧 Function Calls", functionCallsData);

			for await (const event of this._postprocessHandleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				llmRequest,
			)) {
				yield event;
			}
		}
	}

	async *_postprocessLive(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		// Run processors
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			yield event;
		}

		// Skip model response event if no content, error, or turn completion
		// This handles live-specific cases like turn_complete
		if (
			!llmResponse.content &&
			!llmResponse.errorCode &&
			!llmResponse.interrupted &&
			!(llmResponse as any).turnComplete
		) {
			return;
		}

		// Build the event
		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);

		yield finalizedEvent;

		// Handle function calls for live mode
		if (finalizedEvent.getFunctionCalls()) {
			// TODO: Implement functions.handleFunctionCallsLive when available
			const functionResponseEvent = await functions.handleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				(llmRequest as any).toolsDict || {},
			);

			if (functionResponseEvent) {
				yield functionResponseEvent;

				const transferToAgent = functionResponseEvent.actions?.transferToAgent;
				if (transferToAgent) {
					this.logger.debug(`🔄 Live transfer to agent '${transferToAgent}'`);

					const agentToRun = this._getAgentToRun(
						invocationContext,
						transferToAgent,
					);

					for await (const event of agentToRun.runLive?.(invocationContext) ||
						agentToRun.runAsync(invocationContext)) {
						yield event;
					}
				}
			}
		}
	}

	async *_postprocessRunProcessorsAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		for (const processor of this.responseProcessors) {
			for await (const event of processor.runAsync(
				invocationContext,
				llmResponse,
			)) {
				yield event;
			}
		}
	}

	async *_postprocessHandleFunctionCallsAsync(
		invocationContext: InvocationContext,
		functionCallEvent: Event,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const functionResponseEvent = await functions.handleFunctionCallsAsync(
			invocationContext,
			functionCallEvent,
			(llmRequest as any).toolsDict || {},
		);

		if (functionResponseEvent) {
			const authEvent = functions.generateAuthEvent(
				invocationContext,
				functionResponseEvent,
			);

			if (authEvent) {
				yield authEvent;
			}

			yield functionResponseEvent;

			const transferToAgent = functionResponseEvent.actions?.transferToAgent;
			if (transferToAgent) {
				this.logger.debug(`🔄 Transferring to agent '${transferToAgent}'`);

				const agentToRun = this._getAgentToRun(
					invocationContext,
					transferToAgent,
				);

				for await (const event of agentToRun.runAsync(invocationContext)) {
					yield event;
				}
			}
		}
	}

	_getAgentToRun(
		invocationContext: InvocationContext,
		agentName: string,
	): BaseAgent {
		const rootAgent = invocationContext.agent.rootAgent;
		const agentToRun = rootAgent.findAgent(agentName);

		if (!agentToRun) {
			this.logger.error(`Agent '${agentName}' not found in the agent tree.`);
			throw new Error(`Agent ${agentName} not found in the agent tree.`);
		}

		return agentToRun;
	}

	async *_callLlmAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): AsyncGenerator<LlmResponse> {
		// Before model callback
		const beforeModelCallbackContent = await this._handleBeforeModelCallback(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		);

		if (beforeModelCallbackContent) {
			yield beforeModelCallbackContent;
			return;
		}

		// Initialize config and labels
		llmRequest.config = llmRequest.config || {};
		llmRequest.config.labels = llmRequest.config.labels || {};

		// Add agent name as label for billing/tracking
		if (!(_ADK_AGENT_NAME_LABEL_KEY in llmRequest.config.labels)) {
			llmRequest.config.labels[_ADK_AGENT_NAME_LABEL_KEY] =
				invocationContext.agent.name;
		}

		const llm = this.__getLlm(invocationContext);

		// Check for CFC (Continuous Function Calling) support
		const runConfig = invocationContext.runConfig;
		if ((runConfig as any).supportCfc) {
			this.logger.warn(
				"CFC (supportCfc) not fully implemented, using standard flow.",
			);
		}

		// Standard LLM call flow
		invocationContext.incrementLlmCallCount();

		const isStreaming =
			invocationContext.runConfig.streamingMode === StreamingMode.SSE;

		// Log LLM request in a clean table format
		let tools: Tool[] = llmRequest.config?.tools || [];

		// Secondary defensive deduplication: some providers (e.g., Google) error on duplicate function declarations
		// even if upstream preprocessing attempted to filter. Here we collapse duplicate functionDeclarations by name.
		if (tools.length) {
			const deduped: Tool[] = [];
			const seenFn = new Set<string>();
			for (const t of tools) {
				const tool = t as Tool;
				if (tool && Array.isArray(tool.functionDeclarations)) {
					const newFds = tool.functionDeclarations.filter(
						(fd: FunctionDeclaration) => {
							if (fd?.name) {
								if (seenFn.has(fd.name)) {
									return false; // Discard duplicate
								}
								seenFn.add(fd.name);
							}
							return true; // Keep unique or unnamed function
						},
					);
					if (newFds.length) {
						deduped.push({ ...tool, functionDeclarations: newFds });
					}
				} else if (tool?.name) {
					if (seenFn.has(tool.name)) continue;
					seenFn.add(tool.name);
					deduped.push(tool);
				} else {
					deduped.push(tool); // Unknown shape; keep as is
				}
			}
			if (deduped.length !== tools.length) {
				this.logger.debug(
					`🔁 Deduplicated tool/function declarations: ${tools.length} -> ${deduped.length}`,
				);
			}
			llmRequest.config.tools = tools = deduped;
		}

		const toolNames = tools
			.map((tool: any) => {
				// Handle Google-style function declarations
				if (
					tool.functionDeclarations &&
					Array.isArray(tool.functionDeclarations)
				) {
					return tool.functionDeclarations.map((fn: any) => fn.name).join(", ");
				}
				// Handle different tool format possibilities
				if (tool.name) return tool.name;
				if (tool.function?.name) return tool.function.name;
				if (tool.function?.function?.name) return tool.function.function.name;
				return "unknown";
			})
			.join(", ");

		// Format system instruction (truncate if too long)
		const systemInstruction = llmRequest.getSystemInstructionText() || "";
		const truncatedSystemInstruction =
			systemInstruction.length > 100
				? `${systemInstruction.substring(0, 100)}...`
				: systemInstruction;

		// Format content preview (show first message content)
		const contentPreview =
			llmRequest.contents?.length > 0
				? LogFormatter.formatContentPreview(llmRequest.contents[0])
				: "none";

		this.logger.debugStructured("📤 LLM Request", {
			Model: llm.model,
			Agent: invocationContext.agent.name,
			"Content Items": llmRequest.contents?.length || 0,
			"Content Preview": contentPreview,
			"System Instruction": truncatedSystemInstruction || "none",
			"Available Tools": toolNames || "none",
			"Tool Count": llmRequest.config?.tools?.length || 0,
			Streaming: isStreaming ? "Yes" : "No",
		});

		let responseCount = 0;
		for await (const llmResponse of llm.generateContentAsync(
			llmRequest,
			isStreaming,
		)) {
			responseCount++;

			// Telemetry tracing
			traceLlmCall(
				invocationContext,
				modelResponseEvent.id,
				llmRequest,
				llmResponse,
			);

			// Log LLM response in a clean format
			const tokenCount =
				llmResponse.usageMetadata?.totalTokenCount || "unknown";
			const functionCalls =
				llmResponse.content?.parts?.filter((part) => part.functionCall) || [];

			// Format function calls for display using LogFormatter utility
			const functionCallsDisplay =
				LogFormatter.formatFunctionCalls(functionCalls);

			// Format response content preview
			const responsePreview = LogFormatter.formatResponsePreview(llmResponse);

			this.logger.debugStructured("📥 LLM Response", {
				Model: llm.model,
				"Token Count": tokenCount,
				"Function Calls": functionCallsDisplay,
				"Response Preview": responsePreview,
				"Finish Reason": llmResponse.finishReason || "unknown",
				"Response #": responseCount,
				Partial: llmResponse.partial ? "Yes" : "No",
				Error: llmResponse.errorCode || "none",
			});

			// After model callback
			const alteredLlmResponse = await this._handleAfterModelCallback(
				invocationContext,
				llmResponse,
				modelResponseEvent,
			);

			yield alteredLlmResponse || llmResponse;
		}
	}

	async _handleBeforeModelCallback(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalBeforeModelCallbacks" in agent)) {
			return;
		}

		const beforeCallbacks = (agent as any).canonicalBeforeModelCallbacks;
		if (!beforeCallbacks) {
			return;
		}

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of beforeCallbacks) {
			let beforeModelCallbackContent = callback({
				callbackContext,
				llmRequest,
			});

			if (beforeModelCallbackContent instanceof Promise) {
				beforeModelCallbackContent = await beforeModelCallbackContent;
			}

			if (beforeModelCallbackContent) {
				return beforeModelCallbackContent;
			}
		}
	}

	async _handleAfterModelCallback(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalAfterModelCallbacks" in agent)) {
			return;
		}

		const afterCallbacks = (agent as any).canonicalAfterModelCallbacks;
		if (!afterCallbacks) {
			return;
		}

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (const callback of afterCallbacks) {
			let afterModelCallbackContent = callback({
				callbackContext,
				llmResponse,
			});

			if (afterModelCallbackContent instanceof Promise) {
				afterModelCallbackContent = await afterModelCallbackContent;
			}

			if (afterModelCallbackContent) {
				return afterModelCallbackContent;
			}
		}
	}

	_finalizeModelResponseEvent(
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Event {
		// Python uses Pydantic model_validate with model_dump - we'll use object spreading
		const eventData = { ...modelResponseEvent } as any;
		const responseData = { ...llmResponse } as any;

		// Merge excluding null/undefined values (similar to exclude_none=True)
		Object.keys(responseData).forEach((key) => {
			if (responseData[key] !== null && responseData[key] !== undefined) {
				eventData[key] = responseData[key];
			}
		});

		const event = new Event(eventData);

		if (event.content) {
			const functionCalls = event.getFunctionCalls();
			if (functionCalls) {
				functions.populateClientFunctionCallId(event);
				event.longRunningToolIds = functions.getLongRunningFunctionCalls(
					functionCalls,
					(llmRequest as any).toolsDict || {},
				);
			}
		}

		return event;
	}

	__getLlm(invocationContext: InvocationContext): BaseLlm {
		const llm = (invocationContext.agent as any).canonicalModel;
		return llm;
	}
}
