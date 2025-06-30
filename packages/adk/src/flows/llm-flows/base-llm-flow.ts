import {
	type BaseAgent,
	CallbackContext,
	type InvocationContext,
	ReadonlyContext,
	StreamingMode,
} from "@adk/agents";
import { Event } from "@adk/events";
import { Logger } from "@adk/helpers/logger";
import { type BaseLlm, LlmRequest, type LlmResponse } from "@adk/models";
import { traceLlmCall } from "@adk/telemetry";
import { ToolContext } from "@adk/tools";
import * as functions from "./functions";

const _ADK_AGENT_NAME_LABEL_KEY = "adk_agent_name";

export abstract class BaseLlmFlow {
	requestProcessors: Array<any> = [];
	responseProcessors: Array<any> = [];

	private logger = new Logger({ name: "BaseLlmFlow" });

	async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
		this.logger.debug("🚀 Starting runAsync flow", {
			invocationId: invocationContext.invocationId,
			agentName: invocationContext.agent.name,
			branch: invocationContext.branch,
		});

		let stepCount = 0;
		while (true) {
			stepCount++;
			this.logger.debug(`📋 Running step ${stepCount}`, {
				invocationId: invocationContext.invocationId,
			});

			let lastEvent: Event | null = null;
			let eventCount = 0;
			for await (const event of this._runOneStepAsync(invocationContext)) {
				eventCount++;
				lastEvent = event;
				this.logger.debug(
					`📤 Yielding event ${eventCount} from step ${stepCount}`,
					{
						eventId: event.id,
						eventType: event.constructor.name,
						hasContent: !!event.content,
						isFinalResponse: event.isFinalResponse(),
						partial: event.partial,
					},
				);
				yield event;
			}

			if (!lastEvent || lastEvent.isFinalResponse()) {
				this.logger.debug("✅ Flow completed", {
					reason: !lastEvent ? "no_events" : "final_response",
					totalSteps: stepCount,
				});
				break;
			}

			if (lastEvent.partial) {
				this.logger.error("❌ Flow error: Last event is partial", {
					eventId: lastEvent.id,
					stepCount,
				});
				throw new Error(
					"Last event shouldn't be partial. LLM max output limit may be reached.",
				);
			}
		}

		this.logger.debug("🏁 runAsync flow finished", {
			totalSteps: stepCount,
			invocationId: invocationContext.invocationId,
		});
	}

	async *runLive(invocationContext: InvocationContext): AsyncGenerator<Event> {
		this.logger.debug("🔴 Starting runLive flow", {
			invocationId: invocationContext.invocationId,
			agentName: invocationContext.agent.name,
		});

		// TODO: Implement live streaming functionality
		// This is a complex feature involving:
		// - Live connection management with llm.connect()
		// - Audio transcription caching and processing
		// - Real-time bidirectional communication
		// - Task cancellation and cleanup
		// - Live request queue handling
		// For now, delegate to runAsync for basic functionality
		this.logger.warn("⚠️ runLive not fully implemented, delegating to runAsync");
		yield* this.runAsync(invocationContext);
	}

	async *_runOneStepAsync(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event> {
		this.logger.debug("🔄 Starting one step execution", {
			invocationId: invocationContext.invocationId,
		});

		const llmRequest = new LlmRequest();
		this.logger.debug("📝 Created new LlmRequest", {
			requestId: (llmRequest as any).id || "unknown",
		});

		// Preprocessing phase
		this.logger.debug("🔧 Starting preprocessing phase");
		let preprocessEventCount = 0;
		for await (const event of this._preprocessAsync(
			invocationContext,
			llmRequest,
		)) {
			preprocessEventCount++;
			this.logger.debug(`📤 Preprocessing event ${preprocessEventCount}`, {
				eventId: event.id,
			});
			yield event;
		}
		this.logger.debug("✅ Preprocessing completed", {
			eventCount: preprocessEventCount,
		});

		if (invocationContext.endInvocation) {
			this.logger.debug("🛑 Invocation ended during preprocessing");
			return;
		}

		// Model response phase
		const modelResponseEvent = new Event({
			id: Event.newId(),
			invocationId: invocationContext.invocationId,
			author: invocationContext.agent.name,
			branch: invocationContext.branch,
		});

		this.logger.debug("🤖 Starting LLM call phase", {
			modelResponseEventId: modelResponseEvent.id,
		});

		let llmResponseCount = 0;
		for await (const llmResponse of this._callLlmAsync(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		)) {
			llmResponseCount++;
			this.logger.debug(`🔄 Processing LLM response ${llmResponseCount}`, {
				hasContent: !!llmResponse.content,
				hasError: !!llmResponse.errorCode,
				interrupted: !!llmResponse.interrupted,
				partial: !!llmResponse.partial,
			});

			for await (const event of this._postprocessAsync(
				invocationContext,
				llmRequest,
				llmResponse,
				modelResponseEvent,
			)) {
				modelResponseEvent.id = Event.newId();
				this.logger.debug("📤 Yielding postprocessed event", {
					eventId: event.id,
					hasFunctionCalls: !!event.getFunctionCalls(),
				});
				yield event;
			}
		}

		this.logger.debug("✅ One step execution completed", {
			llmResponseCount,
		});
	}

	async *_preprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		this.logger.debug("🔧 Starting preprocessing", {
			processorCount: this.requestProcessors.length,
		});

		const agent = invocationContext.agent;
		if (
			!("canonicalTools" in agent) ||
			typeof agent.canonicalTools !== "function"
		) {
			this.logger.debug("ℹ️ Agent has no canonical tools");
			return;
		}

		// Run request processors
		for (let i = 0; i < this.requestProcessors.length; i++) {
			const processor = this.requestProcessors[i];
			this.logger.debug(`🔄 Running request processor ${i + 1}`, {
				processorName: processor.constructor?.name || "unknown",
			});

			let processorEventCount = 0;
			for await (const event of processor.runAsync(
				invocationContext,
				llmRequest,
			)) {
				processorEventCount++;
				this.logger.debug(
					`📤 Request processor ${i + 1} event ${processorEventCount}`,
					{
						eventId: event.id,
					},
				);
				yield event;
			}

			this.logger.debug(`✅ Request processor ${i + 1} completed`, {
				eventCount: processorEventCount,
			});
		}

		// Process canonical tools
		const tools = await agent.canonicalTools(
			new ReadonlyContext(invocationContext),
		);
		this.logger.debug("🛠️ Processing canonical tools", {
			toolCount: tools.length,
		});

		for (let i = 0; i < tools.length; i++) {
			const tool = tools[i];
			this.logger.debug(`🔄 Processing tool ${i + 1}`, {
				toolName: tool.constructor?.name || "unknown",
			});

			const toolContext = new ToolContext(invocationContext);
			await tool.processLlmRequest(toolContext, llmRequest);

			this.logger.debug(`✅ Tool ${i + 1} processed`);
		}

		this.logger.debug("✅ Preprocessing completed", {
			totalTools: tools.length,
		});
	}

	async *_postprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		this.logger.debug("🔄 Starting postprocessing", {
			hasContent: !!llmResponse.content,
			hasError: !!llmResponse.errorCode,
			interrupted: !!llmResponse.interrupted,
		});

		// Run response processors
		let processorEventCount = 0;
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			processorEventCount++;
			this.logger.debug(`📤 Response processor event ${processorEventCount}`, {
				eventId: event.id,
			});
			yield event;
		}

		if (
			!llmResponse.content &&
			!llmResponse.errorCode &&
			!llmResponse.interrupted
		) {
			this.logger.debug(
				"ℹ️ Skipping event creation - no content, error, or interruption",
			);
			return;
		}

		// Finalize model response event
		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);

		this.logger.debug("📝 Finalized model response event", {
			eventId: finalizedEvent.id,
			hasContent: !!finalizedEvent.content,
			hasFunctionCalls: !!finalizedEvent.getFunctionCalls(),
			longRunningToolIds: finalizedEvent.longRunningToolIds.entries.length || 0,
		});

		yield finalizedEvent;

		// Handle function calls
		const functionCalls = finalizedEvent.getFunctionCalls();
		if (functionCalls) {
			this.logger.debug("🔧 Processing function calls", {
				functionCallCount: functionCalls.length,
			});

			let functionEventCount = 0;
			for await (const event of this._postprocessHandleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				llmRequest,
			)) {
				functionEventCount++;
				this.logger.debug(`📤 Function call event ${functionEventCount}`, {
					eventId: event.id,
				});
				yield event;
			}

			this.logger.debug("✅ Function calls processed", {
				eventCount: functionEventCount,
			});
		}

		this.logger.debug("✅ Postprocessing completed");
	}

	async *_postprocessLive(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): AsyncGenerator<Event> {
		this.logger.debug("🔴 Starting live postprocessing", {
			hasContent: !!llmResponse.content,
			turnComplete: !!(llmResponse as any).turnComplete,
		});

		// Run processors
		for await (const event of this._postprocessRunProcessorsAsync(
			invocationContext,
			llmResponse,
		)) {
			this.logger.debug("📤 Live response processor event", {
				eventId: event.id,
			});
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
			this.logger.debug(
				"ℹ️ Skipping live event - no content or completion signal",
			);
			return;
		}

		// Build the event
		const finalizedEvent = this._finalizeModelResponseEvent(
			llmRequest,
			llmResponse,
			modelResponseEvent,
		);

		this.logger.debug("📝 Finalized live model response event", {
			eventId: finalizedEvent.id,
			hasFunctionCalls: !!finalizedEvent.getFunctionCalls(),
		});

		yield finalizedEvent;

		// Handle function calls for live mode
		if (finalizedEvent.getFunctionCalls()) {
			this.logger.debug("🔧 Processing live function calls");

			// TODO: Implement functions.handleFunctionCallsLive when available
			const functionResponseEvent = await functions.handleFunctionCallsAsync(
				invocationContext,
				finalizedEvent,
				(llmRequest as any).toolsDict || {},
			);

			if (functionResponseEvent) {
				this.logger.debug("📤 Live function response event", {
					eventId: functionResponseEvent.id,
					hasTransfer: !!functionResponseEvent.actions?.transferToAgent,
				});

				yield functionResponseEvent;

				const transferToAgent = functionResponseEvent.actions?.transferToAgent;
				if (transferToAgent) {
					this.logger.debug("🔄 Transferring to agent in live mode", {
						targetAgent: transferToAgent,
					});

					const agentToRun = this._getAgentToRun(
						invocationContext,
						transferToAgent,
					);

					let transferEventCount = 0;
					for await (const event of agentToRun.runLive?.(invocationContext) ||
						agentToRun.runAsync(invocationContext)) {
						transferEventCount++;
						this.logger.debug(`📤 Transfer agent event ${transferEventCount}`, {
							eventId: event.id,
						});
						yield event;
					}

					this.logger.debug("✅ Agent transfer completed", {
						eventCount: transferEventCount,
					});
				}
			}
		}

		this.logger.debug("✅ Live postprocessing completed");
	}

	async *_postprocessRunProcessorsAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		this.logger.debug("🔄 Running response processors", {
			processorCount: this.responseProcessors.length,
		});

		for (let i = 0; i < this.responseProcessors.length; i++) {
			const processor = this.responseProcessors[i];
			this.logger.debug(`🔄 Running response processor ${i + 1}`, {
				processorName: processor.constructor?.name || "unknown",
			});

			let processorEventCount = 0;
			for await (const event of processor.runAsync(
				invocationContext,
				llmResponse,
			)) {
				processorEventCount++;
				this.logger.debug(
					`📤 Response processor ${i + 1} event ${processorEventCount}`,
					{
						eventId: event.id,
					},
				);
				yield event;
			}

			this.logger;
			this.logger.debug(`✅ Response processor ${i + 1} completed`, {
				eventCount: processorEventCount,
			});
		}

		this.logger.debug("✅ All response processors completed");
	}

	async *_postprocessHandleFunctionCallsAsync(
		invocationContext: InvocationContext,
		functionCallEvent: Event,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		this.logger.debug("🔧 Handling function calls", {
			eventId: functionCallEvent.id,
			toolsDictSize: Object.keys((llmRequest as any).toolsDict || {}).length,
		});

		const functionResponseEvent = await functions.handleFunctionCallsAsync(
			invocationContext,
			functionCallEvent,
			(llmRequest as any).toolsDict || {},
		);

		if (functionResponseEvent) {
			this.logger.debug("📋 Function calls executed", {
				responseEventId: functionResponseEvent.id,
				hasActions: !!functionResponseEvent.actions,
			});

			const authEvent = functions.generateAuthEvent(
				invocationContext,
				functionResponseEvent,
			);

			if (authEvent) {
				this.logger.debug("🔐 Generated auth event", {
					authEventId: authEvent.id,
				});
				yield authEvent;
			}

			yield functionResponseEvent;

			const transferToAgent = functionResponseEvent.actions?.transferToAgent;
			if (transferToAgent) {
				this.logger.debug("🔄 Transferring to agent", {
					targetAgent: transferToAgent,
				});

				const agentToRun = this._getAgentToRun(
					invocationContext,
					transferToAgent,
				);

				let transferEventCount = 0;
				for await (const event of agentToRun.runAsync(invocationContext)) {
					transferEventCount++;
					this.logger.debug(`📤 Transfer agent event ${transferEventCount}`, {
						eventId: event.id,
					});
					yield event;
				}

				this.logger.debug("✅ Agent transfer completed", {
					eventCount: transferEventCount,
				});
			}
		} else {
			this.logger.debug("ℹ️ No function response event generated");
		}
	}

	_getAgentToRun(
		invocationContext: InvocationContext,
		agentName: string,
	): BaseAgent {
		this.logger.debug("🔍 Finding agent to run", {
			targetAgent: agentName,
			currentAgent: invocationContext.agent.name,
		});

		const rootAgent = invocationContext.agent.rootAgent;
		const agentToRun = rootAgent.findAgent(agentName);

		if (!agentToRun) {
			this.logger.error("❌ Agent not found", {
				targetAgent: agentName,
				rootAgent: rootAgent.name,
			});
			throw new Error(`Agent ${agentName} not found in the agent tree.`);
		}

		this.logger.debug("✅ Agent found", {
			targetAgent: agentName,
			agentType: agentToRun.constructor.name,
		});

		return agentToRun;
	}

	async *_callLlmAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): AsyncGenerator<LlmResponse> {
		this.logger.debug("🤖 Starting LLM call", {
			model: llmRequest.model || "default",
			eventId: modelResponseEvent.id,
		});

		// Before model callback
		this.logger.debug("🔄 Processing before model callbacks");
		const beforeModelCallbackContent = await this._handleBeforeModelCallback(
			invocationContext,
			llmRequest,
			modelResponseEvent,
		);

		if (beforeModelCallbackContent) {
			this.logger.debug("📋 Before model callback returned content", {
				hasContent: !!beforeModelCallbackContent.content,
			});
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
			this.logger.debug("🏷️ Added agent name label", {
				agentName: invocationContext.agent.name,
			});
		}

		const llm = this.__getLlm(invocationContext);
		this.logger.debug("🔧 Retrieved LLM instance", {
			llmModel: llm.model,
			llmType: llm.constructor.name,
		});

		// Check for CFC (Continuous Function Calling) support
		const runConfig = invocationContext.runConfig;
		if ((runConfig as any).supportCfc) {
			// TODO: Implement full CFC with live request queue
			// This would involve setting up LiveRequestQueue and calling runLive
			this.logger.warn(
				"⚠️ CFC (supportCfc) not fully implemented, using standard flow",
			);
		}

		// Standard LLM call flow
		invocationContext.incrementLlmCallCount();
		this.logger.debug("📈 Incremented LLM call count");

		const isStreaming =
			invocationContext.runConfig.streamingMode === StreamingMode.SSE;
		this.logger.debug("🌊 LLM generation mode", {
			streaming: isStreaming,
			streamingMode: invocationContext.runConfig.streamingMode,
		});

		let responseCount = 0;
		for await (const llmResponse of llm.generateContentAsync(
			llmRequest,
			isStreaming,
		)) {
			responseCount++;
			this.logger.debug(`📥 Received LLM response ${responseCount}`, {
				hasContent: !!llmResponse.content,
				hasError: !!llmResponse.errorCode,
				interrupted: !!llmResponse.interrupted,
				partial: !!llmResponse.partial,
				finishReason: llmResponse.finishReason,
				usage: llmResponse.usageMetadata
					? {
							promptTokens: llmResponse.usageMetadata.promptTokenCount,
							completionTokens: llmResponse.usageMetadata.candidatesTokenCount,
							totalTokens: llmResponse.usageMetadata.totalTokenCount,
						}
					: null,
			});

			// Telemetry tracing
			traceLlmCall(
				invocationContext,
				modelResponseEvent.id,
				llmRequest,
				llmResponse,
			);

			// After model callback
			this.logger.debug("🔄 Processing after model callbacks");
			const alteredLlmResponse = await this._handleAfterModelCallback(
				invocationContext,
				llmResponse,
				modelResponseEvent,
			);

			if (alteredLlmResponse) {
				this.logger.debug("📋 After model callback altered response");
			}

			yield alteredLlmResponse || llmResponse;
		}

		this.logger.debug("✅ LLM call completed", {
			totalResponses: responseCount,
		});
	}

	async _handleBeforeModelCallback(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalBeforeModelCallbacks" in agent)) {
			this.logger.debug("ℹ️ Agent has no before model callbacks");
			return;
		}

		const beforeCallbacks = (agent as any).canonicalBeforeModelCallbacks;
		if (!beforeCallbacks) {
			this.logger.debug("ℹ️ Before model callbacks is null/undefined");
			return;
		}

		this.logger.debug("🔄 Processing before model callbacks", {
			callbackCount: beforeCallbacks.length,
		});

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (let i = 0; i < beforeCallbacks.length; i++) {
			const callback = beforeCallbacks[i];
			this.logger.debug(`🔄 Running before model callback ${i + 1}`);

			// Python passes both callback_context and llm_request
			let beforeModelCallbackContent = callback({
				callbackContext,
				llmRequest,
			});

			if (beforeModelCallbackContent instanceof Promise) {
				beforeModelCallbackContent = await beforeModelCallbackContent;
			}

			if (beforeModelCallbackContent) {
				this.logger.debug(`✅ Before model callback ${i + 1} returned content`);
				// Python callbacks return LlmResponse objects directly
				return beforeModelCallbackContent;
			}

			this.logger.debug(
				`✅ Before model callback ${i + 1} completed (no content)`,
			);
		}

		this.logger.debug("✅ All before model callbacks completed");
	}

	async _handleAfterModelCallback(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Promise<LlmResponse | undefined> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("canonicalAfterModelCallbacks" in agent)) {
			this.logger.debug("ℹ️ Agent has no after model callbacks");
			return;
		}

		const afterCallbacks = (agent as any).canonicalAfterModelCallbacks;
		if (!afterCallbacks) {
			this.logger.debug("ℹ️ After model callbacks is null/undefined");
			return;
		}

		this.logger.debug("🔄 Processing after model callbacks", {
			callbackCount: afterCallbacks.length,
		});

		const callbackContext = new CallbackContext(invocationContext, {
			eventActions: modelResponseEvent.actions,
		});

		for (let i = 0; i < afterCallbacks.length; i++) {
			const callback = afterCallbacks[i];
			this.logger.debug(`🔄 Running after model callback ${i + 1}`);

			// Python passes both callback_context and llm_response
			let afterModelCallbackContent = callback({
				callbackContext,
				llmResponse,
			});

			if (afterModelCallbackContent instanceof Promise) {
				afterModelCallbackContent = await afterModelCallbackContent;
			}

			if (afterModelCallbackContent) {
				this.logger.debug(`✅ After model callback ${i + 1} returned content`);
				return afterModelCallbackContent;
			}

			this.logger.debug(
				`✅ After model callback ${i + 1} completed (no content)`,
			);
		}

		this.logger.debug("✅ All after model callbacks completed");
	}

	_finalizeModelResponseEvent(
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
		modelResponseEvent: Event,
	): Event {
		this.logger.debug("📝 Finalizing model response event", {
			requestModel: llmRequest.model,
			responseHasContent: !!llmResponse.content,
			eventId: modelResponseEvent.id,
		});

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
				this.logger.debug("🔧 Processing function calls in event", {
					functionCallCount: functionCalls.length,
				});

				functions.populateClientFunctionCallId(event);
				event.longRunningToolIds = functions.getLongRunningFunctionCalls(
					functionCalls,
					(llmRequest as any).toolsDict || {},
				);

				this.logger.debug("✅ Function calls processed", {
					longRunningToolCount: event.longRunningToolIds.entries.length || 0,
				});
			}
		}

		this.logger.debug("✅ Model response event finalized", {
			finalEventId: event.id,
			hasContent: !!event.content,
			hasFunctionCalls: !!event.getFunctionCalls(),
		});

		return event;
	}

	__getLlm(invocationContext: InvocationContext): BaseLlm {
		const llm = (invocationContext.agent as any).canonicalModel;
		this.logger.debug("🔧 Retrieved canonical model", {
			model: llm?.model || "unknown",
			llmType: llm?.constructor?.name || "unknown",
		});
		return llm;
	}
}
