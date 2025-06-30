import type {
	AudioTranscriptionConfig,
	ProactivityConfig,
	RealtimeInputConfig,
	SpeechConfig,
} from "@google/genai";

/**
 * Streaming mode options for agent execution
 */
export enum StreamingMode {
	NONE = "NONE",
	SSE = "sse",
	BIDI = "bidi",
}

/**
 * Configs for runtime behavior of agents
 */
export class RunConfig {
	/**
	 * Speech configuration for the live agent
	 */
	speechConfig?: SpeechConfig;

	/**
	 * The output modalities. If not set, it's default to AUDIO.
	 */
	responseModalities?: string[];

	/**
	 * Whether or not to save the input blobs as artifacts.
	 */
	saveInputBlobsAsArtifacts: boolean;

	/**
	 * Whether to support CFC (Compositional Function Calling). Only applicable for
	 * StreamingMode.SSE. If it's true. the LIVE API will be invoked. Since only LIVE
	 * API supports CFC
	 *
	 * @warning This feature is **experimental** and its API or behavior may change
	 * in future releases.
	 */
	supportCFC: boolean;

	/**
	 * Streaming mode, None or StreamingMode.SSE or StreamingMode.BIDI.
	 */
	streamingMode: StreamingMode;

	/**
	 * Output transcription for live agents with audio response.
	 */
	outputAudioTranscription?: AudioTranscriptionConfig;

	/**
	 * Input transcription for live agents with audio input from user.
	 */
	inputAudioTranscription?: AudioTranscriptionConfig;

	/**
	 * Realtime input config for live agents with audio input from user.
	 */
	realtimeInputConfig?: RealtimeInputConfig;

	/**
	 * If enabled, the model will detect emotions and adapt its responses accordingly.
	 */
	enableAffectiveDialog?: boolean;

	/**
	 * Configures the proactivity of the model. This allows the model to respond
	 * proactively to the input and to ignore irrelevant input.
	 */
	proactivity?: ProactivityConfig;

	/**
	 * A limit on the total number of llm calls for a given run.
	 *
	 * Valid Values:
	 *   - More than 0 and less than Number.MAX_SAFE_INTEGER: The bound on the number of llm
	 *     calls is enforced, if the value is set in this range.
	 *   - Less than or equal to 0: This allows for unbounded number of llm calls.
	 */
	maxLlmCalls: number;

	constructor(config?: Partial<RunConfig>) {
		this.speechConfig = config?.speechConfig;
		this.responseModalities = config?.responseModalities;
		this.saveInputBlobsAsArtifacts = config?.saveInputBlobsAsArtifacts || false;
		this.supportCFC = config?.supportCFC || false;
		this.streamingMode = config?.streamingMode || StreamingMode.NONE;
		this.outputAudioTranscription = config?.outputAudioTranscription;
		this.inputAudioTranscription = config?.inputAudioTranscription;
		this.realtimeInputConfig = config?.realtimeInputConfig;
		this.enableAffectiveDialog = config?.enableAffectiveDialog;
		this.proactivity = config?.proactivity;
		this.maxLlmCalls = config?.maxLlmCalls ?? 500;

		// Validate maxLlmCalls
		this.validateMaxLlmCalls();
	}

	/**
	 * Validates the maxLlmCalls value
	 */
	private validateMaxLlmCalls(): void {
		if (this.maxLlmCalls === Number.MAX_SAFE_INTEGER) {
			throw new Error(
				`maxLlmCalls should be less than ${Number.MAX_SAFE_INTEGER}.`,
			);
		}
		if (this.maxLlmCalls <= 0) {
			console.warn(
				"maxLlmCalls is less than or equal to 0. This will result in" +
					" no enforcement on total number of llm calls that will be made for a" +
					" run. This may not be ideal, as this could result in a never" +
					" ending communication between the model and the agent in certain" +
					" cases.",
			);
		}
	}
}
