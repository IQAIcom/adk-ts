import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

/**
 * Basic LLM request processor that handles fundamental request setup.
 * This processor sets up model configuration, output schema, and live connect settings.
 */
class BasicLlmRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const agent = invocationContext.agent;

		// Only process LlmAgent instances
		if (!this.isLlmAgent(agent)) {
			return;
		}

		// Set the model
		llmRequest.model =
			typeof agent.canonicalModel === "string"
				? agent.canonicalModel
				: agent.canonicalModel.model;

		// Set the generation config (deep copy if it exists)
		if (agent.generateContentConfig) {
			llmRequest.config = JSON.parse(
				JSON.stringify(agent.generateContentConfig),
			);
		} else {
			llmRequest.config = {};
		}

		// Set output schema if specified
		if (agent.outputSchema) {
			llmRequest.setOutputSchema(agent.outputSchema);
		}

		// Configure live connect settings from run config
		const runConfig = invocationContext.runConfig;

		if (!llmRequest.liveConnectConfig) {
			llmRequest.liveConnectConfig = {};
		}

		if (runConfig.responseModalities) {
			// Cast string[] to Modality[] - types may need alignment
			llmRequest.liveConnectConfig.responseModalities =
				runConfig.responseModalities as any;
		}
		llmRequest.liveConnectConfig.speechConfig = runConfig.speechConfig;
		llmRequest.liveConnectConfig.outputAudioTranscription =
			runConfig.outputAudioTranscription;
		llmRequest.liveConnectConfig.inputAudioTranscription =
			runConfig.inputAudioTranscription;
		llmRequest.liveConnectConfig.realtimeInputConfig =
			runConfig.realtimeInputConfig;
		llmRequest.liveConnectConfig.enableAffectiveDialog =
			runConfig.enableAffectiveDialog;
		llmRequest.liveConnectConfig.proactivity = runConfig.proactivity;

		// Append tools to the request (matching Python implementation expectation)
		const tools = await agent.canonicalTools();
		llmRequest.appendTools(tools);

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}

	/**
	 * Type guard to check if agent is an LlmAgent
	 */
	private isLlmAgent(agent: any): agent is LlmAgent {
		return agent && typeof agent === "object" && "canonicalModel" in agent;
	}
}

/**
 * Exported instance of the basic request processor
 */
export const requestProcessor = new BasicLlmRequestProcessor();
