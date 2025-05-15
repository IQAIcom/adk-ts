/**
 * Streaming mode options for agent execution
 */
export enum StreamingMode {
	/**
	 * No streaming
	 */
	NONE = "NONE",

	/**
	 * Server-Sent Events streaming
	 */
	SSE = "SSE",

	/**
	 * Bidirectional streaming
	 */
	BIDI = "BIDI",
}

/**
 * Speech configuration for live agents
 */
export interface SpeechConfig {
	/**
	 * Voice to use for speech
	 */
	voice?: string;

	/**
	 * Language code
	 */
	language?: string;
}

/**
 * Audio transcription configuration
 */
export interface AudioTranscriptionConfig {
	/**
	 * Whether to enable audio transcription
	 */
	enabled: boolean;

	/**
	 * Language code for transcription
	 */
	language?: string;
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
	 * The output modalities
	 */
	responseModalities?: string[];

	/**
	 * Whether to save input blobs as artifacts
	 */
	saveInputBlobsAsArtifacts: boolean;

	/**
	 * Whether to support Compositional Function Calling
	 * Only applicable for StreamingMode.SSE
	 */
	supportCFC: boolean;

	/**
	 * Streaming mode
	 */
	streamingMode: StreamingMode;

	/**
	 * Output audio transcription configuration
	 */
	outputAudioTranscription?: AudioTranscriptionConfig;

	constructor(config?: Partial<RunConfig>) {
		this.speechConfig = config?.speechConfig;
		this.responseModalities = config?.responseModalities;
		this.saveInputBlobsAsArtifacts = config?.saveInputBlobsAsArtifacts || false;
		this.supportCFC = config?.supportCFC || false;
		this.streamingMode = config?.streamingMode || StreamingMode.NONE;
		this.outputAudioTranscription = config?.outputAudioTranscription;
	}
}
