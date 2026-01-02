import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import type { Event } from "../../events/event";
import { Logger } from "../../logger";
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
			// Only set the request-level output schema when the request will not
			// contain tool function declarations or transfer instructions. When
			// tools or agent transfers are present, function-calling semantics
			// should take precedence and we validate the final assistant response
			// against the schema in response post-processing.
			const hasTools =
				(await agent.canonicalTools?.(invocationContext as any))?.length > 0;
			const hasTransfers = !!(
				"subAgents" in agent &&
				(agent as any).subAgents &&
				(agent as any).subAgents.length > 0 &&
				!(agent.disallowTransferToParent && agent.disallowTransferToPeers)
			);

			if (!hasTools && !hasTransfers) {
				llmRequest.setOutputSchema(agent.outputSchema);
			} else {
				(() => {
					try {
						const logger = new Logger({ name: "BasicLlmRequestProcessor" });
						logger.debug(
							`Skipping request-level output schema for agent ${agent.name} because tools/transfers are present. Schema will be validated during response processing.`,
						);
					} catch (_e) {
						// ignore logger errors
					}
				})();
			}
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

		// Tools are added later in the flow by calling each tool's processLlmRequest.
		// Avoid appending here to prevent duplicate function declarations in providers.

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
