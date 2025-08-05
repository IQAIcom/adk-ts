import {
	type BaseAgent,
	CallbackContext,
	type InvocationContext,
	ReadonlyContext,
	StreamingMode,
} from "@adk/agents";
import { Event } from "@adk/events";
import { Logger } from "@adk/logger";
import { LogFormatter } from "@adk/logger/formatters/log-formatter";
import { type BaseLlm, LlmRequest, type LlmResponse } from "@adk/models";
import { traceLlmCall } from "@adk/telemetry";
import { ToolContext } from "@adk/tools";
import * as functions from "./functions";

const _ADK_AGENT_NAME_LABEL_KEY = "adk_agent_name";

export abstract class BaseLlmFlow {
	requestProcessors: Array<any> = [];
	responseProcessors: Array<any> = [];

	protected logger = new Logger({ name: "BaseLlmFlow" });

	async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
		// Create context-aware loggers
		const agentLogger = this.logger.agent(invocationContext.agent.name);

		// INFO level - Production operational logs
		agentLogger.info(
			{
				invocationId: invocationContext.invocationId,
			},
			"🚀 Agent started",
		);

		let stepCount = 0;
		const startTime = Date.now();

		while (true) {
			stepCount++;

			// TRACE level - Detailed execution flow
			this.logger.trace({ step: stepCount }, "Processing agent step");

			let lastEvent: Event | null = null;
			for await (const event of this._runOneStepAsync(invocationContext)) {
				lastEvent = event;
				yield event;
			}

			if (!lastEvent || lastEvent.isFinalResponse()) {
				// INFO level - Major lifecycle completion
				agentLogger.info(
					{
						stepCount,
						duration: Date.now() - startTime,
					},
					"✅ Agent completed",
				);
				break;
			}

			if (lastEvent.partial) {
				// ERROR level - Critical execution error
				this.logger.error(
					{
						stepCount,
						partial: true,
						eventType: lastEvent.constructor.name,
					},
					"Partial event encountered, LLM max output limit may be reached",
				);
				throw new Error(
					"Last event shouldn't be partial. LLM max output limit may be reached.",
				);
			}
		}
	}

	async *runLive(invocationContext: InvocationContext): AsyncGenerator<Event> {
		// WARN level - Deprecated feature usage
		this.logger.warn(
			{
				method: "runLive",
				fallback: "runAsync",
				agent: invocationContext.agent.name,
			},
			"runLive not fully implemented, delegating to runAsync",
		);
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
			// INFO level - Important lifecycle event
			this.logger.info(
				{
					phase: "preprocessing",
					eventCount: preprocessEventCount,
				},
				"Invocation ended during preprocessing",
			);
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
		const tools = await agent.canonicalTools(
			new ReadonlyContext(invocationContext),
		);

		for (const tool of tools) {
			const toolContext = new ToolContext(invocationContext);
			await tool.processLlmRequest(toolContext, llmRequest);
		}

		// Log available tools in a clean format
		if (tools.length > 0) {
			// DEBUG level - Replace debugArray with structured logging
			this.logger.debug(
				{
					toolCount: tools.length,
					tools: tools.map((tool) => ({
						name: tool.name,
						description:
							tool.description?.substring(0, 50) +
							(tool.description && tool.description.length > 50 ? "..." : ""),
						longRunning: tool.isLongRunning,
					})),
				},
				"Available tools loaded",
			);

			// TRACE level - Full tool details
			this.logger.trace(
				{
					tools: tools.map((tool) => ({
						name: tool.name,
						fullDescription: tool.description,
						isLongRunning: tool.isLongRunning,
					})),
				},
				"Complete tool configurations",
			);
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
			// DEBUG level - Replace debugArray with structured logging
			this.logger.debug(
				{
					functionCallCount: functionCalls.length,
					functionCalls: functionCalls.map((fc) => ({
						name: fc.name,
						arguments:
							JSON.stringify(fc.args).substring(0, 100) +
							(JSON.stringify(fc.args).length > 100 ? "..." : ""),
						id: fc.id || "auto",
					})),
				},
				"Function calls detected",
			);

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
			const functionCalls = finalizedEvent.getFunctionCalls();
			const functionCallsDisplay =
				LogFormatter.formatFunctionCallsString(functionCalls);

			// INFO level - Function execution start
			this.logger.info(
				{
					functionCalls: functionCallsDisplay,
					functionCount: functionCalls.length,
				},
				"🔧 Executing function calls",
			);

			// TODO: Implement functions.handleFunctionCallsLive when available
			const functionResponseEvent = await functions.handleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				(llmRequest as any).toolsDict || {},
			);

			if (functionResponseEvent) {
				// INFO level - Function execution completed
				const functionResponses = functionResponseEvent.getFunctionResponses();
				this.logger.info(
					{
						responseCount: functionResponses?.length || 0,
					},
					"✅ Function calls completed",
				);

				yield functionResponseEvent;

				const transferToAgent = functionResponseEvent.actions?.transferToAgent;
				if (transferToAgent) {
					// INFO level - Agent transfer event
					this.logger.info(
						{
							fromAgent: invocationContext.agent.name,
							toAgent: transferToAgent,
							mode: "live",
						},
						"Live transfer to agent",
					);

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
				// INFO level - Agent transfer event
				this.logger.info(
					{
						fromAgent: invocationContext.agent.name,
						toAgent: transferToAgent,
						mode: "async",
					},
					"Transferring to agent",
				);

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
		// TRACE level - Agent lookup process
		this.logger.trace({ targetAgent: agentName }, "Looking up agent in tree");

		const rootAgent = invocationContext.agent.rootAgent;
		const agentToRun = rootAgent.findAgent(agentName);

		if (!agentToRun) {
			// ERROR level - Agent not found
			this.logger.error(
				{
					targetAgent: agentName,
					currentAgent: invocationContext.agent.name,
				},
				`Agent '${agentName}' not found in agent tree`,
			);
			throw new Error(`Agent ${agentName} not found in the agent tree.`);
		}

		// DEBUG level - Successful agent lookup
		this.logger.debug(
			{
				targetAgent: agentName,
				found: true,
			},
			"Agent found in tree",
		);

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
		const tools = llmRequest.config?.tools || [];

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

		// Format system instruction (show more for better debugging)
		const systemInstruction = llmRequest.getSystemInstructionText() || "";
		const formattedSystemInstruction = systemInstruction
			? systemInstruction.length > 200
				? `${systemInstruction.substring(0, 200)}...`
				: systemInstruction
			: "none";

		// Format content preview (show user input clearly)
		const contentPreview =
			llmRequest.contents?.length > 0
				? LogFormatter.formatContentPreview(llmRequest.contents[0])
				: "none";

		// Get user message content specifically
		const userContent = llmRequest.contents?.find((c) => c.role === "user");
		const userMessage = userContent
			? LogFormatter.formatContentPreview(userContent)
			: "none";

		// Create LLM-specific logger
		const llmLogger = this.logger.llm(llm.model);

		// INFO level - Important request information
		llmLogger.info(
			{
				agent: invocationContext.agent.name,
				userMessage: userMessage,
				toolsAvailable: toolNames || "none",
				toolCount: llmRequest.config?.tools?.length || 0,
				streaming: isStreaming,
			},
			"📤 LLM Request Started",
		);

		// DEBUG level - Detailed request information
		llmLogger.debug(
			{
				agent: invocationContext.agent.name,
				contentItems: llmRequest.contents?.length || 0,
				systemInstruction: formattedSystemInstruction,
				hasOutputSchema: !!llmRequest.config?.responseSchema,
			},
			"LLM request details",
		);

		let responseCount = 0;
		const startTime = Date.now();
		for await (const llmResponse of llm.generateContentAsync(
			llmRequest,
			isStreaming,
		)) {
			responseCount++;
			const duration = Date.now() - startTime;

			// Telemetry tracing
			traceLlmCall(
				invocationContext,
				modelResponseEvent.id,
				llmRequest,
				llmResponse,
			);

			// Log LLM response in a clean format
			const tokenCount = llmResponse.usageMetadata?.totalTokenCount || 0;
			const functionCalls =
				llmResponse.content?.parts?.filter((part) => part.functionCall) || [];

			// Format function calls for display using LogFormatter utility
			const functionCallsDisplay =
				LogFormatter.formatFunctionCallsString(functionCalls);

			// Format response content preview
			const responsePreview = LogFormatter.formatResponsePreview(llmResponse);

			// INFO level - Key response information
			if (functionCalls.length > 0) {
				llmLogger.info(
					{
						functionCallsDetail: functionCallsDisplay,
						tokenCount: tokenCount,
						responseNumber: responseCount,
						duration_ms: duration,
					},
					"🔧 LLM Function Calls",
				);
			} else {
				llmLogger.info(
					{
						responsePreview: responsePreview,
						tokenCount: tokenCount,
						responseNumber: responseCount,
						duration_ms: duration,
					},
					"📥 LLM Response",
				);
			}

			// DEBUG level - Detailed response info
			llmLogger.debug(
				{
					functionCallCount: functionCalls.length,
					finishReason: llmResponse.finishReason || "unknown",
					partial: llmResponse.partial || false,
					error: llmResponse.errorCode || null,
				},
				"LLM response details",
			);

			// TRACE level - Very detailed response analysis
			if (llmResponse.content?.parts) {
				this.logger.trace(
					{
						parts: llmResponse.content.parts.map((part) => ({
							type: part.text
								? "text"
								: part.functionCall
									? "function_call"
									: "other",
							size: part.text?.length || 0,
						})),
					},
					"Response parts breakdown",
				);
			}

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
