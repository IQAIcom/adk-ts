/**
 * Type definitions for the Web Speech API
 *
 * The Web Speech API is not yet standardized, so different browsers use
 * different prefixes. Chrome/Edge/Safari use 'webkitSpeechRecognition'.
 *
 * These types are based on the W3C specification draft and browser implementations.
 */

interface SpeechRecognition extends EventTarget {
	/**
	 * Controls whether continuous results are returned (true) or only
	 * a single result each time recognition starts (false). Default is false.
	 */
	continuous: boolean;

	/**
	 * Controls whether interim results should be returned (true) or only
	 * final results (false). Default is false.
	 */
	interimResults: boolean;

	/**
	 * Sets the language of the current SpeechRecognition. If not specified,
	 * defaults to the HTML lang attribute value, or the user agent's language
	 * setting if that is not set either.
	 */
	lang: string;

	/**
	 * Sets the maximum number of alternative transcripts that will be returned
	 * per result. Default is 1.
	 */
	maxAlternatives: number;

	/**
	 * Fired when the speech recognition service returns a result — a word or
	 * phrase has been positively recognized and this has been communicated back
	 * to the app.
	 */
	onresult: ((event: SpeechRecognitionEvent) => void) | null;

	/**
	 * Fired when any error occurs during recognition.
	 */
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;

	/**
	 * Fired when the speech recognition service has disconnected.
	 */
	onend: ((event: Event) => void) | null;

	/**
	 * Fired when the speech recognition service has begun listening to incoming audio.
	 */
	onstart: ((event: Event) => void) | null;

	/**
	 * Fired when sound that is recognized as speech has been detected.
	 */
	onspeechstart: ((event: Event) => void) | null;

	/**
	 * Fired when speech recognized by the speech recognition service has stopped being detected.
	 */
	onspeechend: ((event: Event) => void) | null;

	/**
	 * Fired when any sound (recognizable speech or not) has been detected.
	 */
	onsoundstart: ((event: Event) => void) | null;

	/**
	 * Fired when any sound (recognizable speech or not) has stopped being detected.
	 */
	onsoundend: ((event: Event) => void) | null;

	/**
	 * Fired when the user agent has started to capture audio.
	 */
	onaudiostart: ((event: Event) => void) | null;

	/**
	 * Fired when the user agent has finished capturing audio.
	 */
	onaudioend: ((event: Event) => void) | null;

	/**
	 * Fired when the speech recognition service returns a final result with no significant recognition.
	 */
	onnomatch: ((event: SpeechRecognitionEvent) => void) | null;

	/**
	 * Starts the speech recognition service listening to incoming audio.
	 */
	start(): void;

	/**
	 * Stops the speech recognition service from listening to incoming audio,
	 * and attempts to return a SpeechRecognitionResult based on the audio
	 * captured so far.
	 */
	stop(): void;

	/**
	 * Stops the speech recognition service from listening to incoming audio.
	 */
	abort(): void;
}

interface SpeechRecognitionEvent extends Event {
	/**
	 * Returns the lowest index value result in the SpeechRecognitionResultList
	 * "array" that has actually changed.
	 */
	readonly resultIndex: number;

	/**
	 * Returns a SpeechRecognitionResultList object representing all the speech
	 * recognition results for the current session.
	 */
	readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
	readonly length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
	readonly length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
	readonly transcript: string;
	readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
	readonly error:
		| "no-speech"
		| "aborted"
		| "audio-capture"
		| "network"
		| "not-allowed"
		| "service-not-allowed"
		| "bad-grammar"
		| "language-not-supported";
	readonly message: string;
}

// Browser-specific implementations
interface Window {
	SpeechRecognition?: {
		new (): SpeechRecognition;
	};
	webkitSpeechRecognition?: {
		new (): SpeechRecognition;
	};
}
