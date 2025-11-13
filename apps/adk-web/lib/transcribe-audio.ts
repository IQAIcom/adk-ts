/**
 * Transcription utility using the Web Speech API
 *
 * IMPORTANT: The Web Speech API (SpeechRecognition) works with live microphone
 * input, not pre-recorded audio files. This is a browser limitation.
 *
 * For transcribing recorded files, you would typically need:
 * - A backend service (OpenAI Whisper, Google Speech-to-Text)
 * - A client-side library that processes audio files
 *
 * This implementation provides real-time transcription during recording.
 */

interface TranscriptionResult {
	text: string;
	isFinal: boolean;
	confidence?: number;
}

interface TranscriptionCallbacks {
	onResult?: (result: TranscriptionResult) => void;
	onError?: (error: Error) => void;
	onEnd?: () => void;
}

/**
 * Checks if the browser supports the Web Speech API
 *
 * Browser support:
 * - Chrome/Edge: Full support (webkitSpeechRecognition)
 * - Safari: Partial support (webkitSpeechRecognition)
 * - Firefox: Not supported
 */
export function isSpeechRecognitionSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
	);
}

/**
 * Gets the SpeechRecognition constructor for the current browser
 *
 * Different browsers use different prefixes:
 * - Chrome/Edge: webkitSpeechRecognition
 * - Standard: SpeechRecognition (not widely supported yet)
 */
function getSpeechRecognition(): (typeof window)["SpeechRecognition"] | null {
	if (typeof window === "undefined") return null;

	// Try standard API first (future-proof)
	if ("SpeechRecognition" in window) {
		return (window as any).SpeechRecognition;
	}

	// Fall back to webkit prefix (Chrome/Edge/Safari)
	if ("webkitSpeechRecognition" in window) {
		return (window as any).webkitSpeechRecognition;
	}

	return null;
}

/**
 * Creates and configures a SpeechRecognition instance
 *
 * Key configuration options:
 * - continuous: Keep listening after each result (we want this)
 * - interimResults: Get partial results as user speaks (better UX)
 * - lang: Language code (defaults to browser language)
 */
function createSpeechRecognition(): SpeechRecognition | null {
	const SpeechRecognitionClass = getSpeechRecognition();
	if (!SpeechRecognitionClass) return null;

	const recognition = new SpeechRecognitionClass();

	// Keep listening continuously (don't stop after first result)
	recognition.continuous = true;

	// Get interim (partial) results for better UX
	// This shows text as the user speaks, not just at the end
	recognition.interimResults = true;

	// Use browser's default language, or you can set a specific one:
	// recognition.lang = 'en-US';

	return recognition;
}

/**
 * Starts real-time transcription from the microphone
 *
 * How it works:
 * 1. Creates a SpeechRecognition instance
 * 2. Sets up event listeners for results, errors, and end events
 * 3. Starts listening to the microphone
 * 4. Accumulates transcribed text as the user speaks
 *
 * @param callbacks - Callbacks for transcription events
 * @returns A function to stop transcription, or null if not supported
 */
export function startTranscription(
	callbacks: TranscriptionCallbacks,
): (() => void) | null {
	if (!isSpeechRecognitionSupported()) {
		callbacks.onError?.(
			new Error(
				"Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
			),
		);
		return null;
	}

	const recognition = createSpeechRecognition();
	if (!recognition) {
		callbacks.onError?.(
			new Error("Failed to create SpeechRecognition instance"),
		);
		return null;
	}

	/**
	 * This event fires whenever the recognition engine produces a result
	 * It can fire multiple times:
	 * - For interim results (as user speaks)
	 * - For final results (when user pauses)
	 */
	recognition.onresult = (event: SpeechRecognitionEvent) => {
		// The event contains multiple results (one per utterance)
		// We need to combine them all
		let finalTranscript = "";

		// Iterate through all results in this event
		for (let i = event.resultIndex; i < event.results.length; i++) {
			const transcript = event.results[i][0].transcript;
			const confidence = event.results[i][0].confidence;

			// Check if this is an interim (partial) or final result
			if (event.results[i].isFinal) {
				finalTranscript += transcript + " ";
			}

			// Call the callback with this result
			callbacks.onResult?.({
				text: transcript,
				isFinal: event.results[i].isFinal,
				confidence,
			});
		}

		// Update our accumulated transcript
		if (finalTranscript) {
			callbacks.onResult?.({
				text: finalTranscript,
				isFinal: true,
				confidence: 1,
			});
		}
	};

	/**
	 * Handle errors that occur during recognition
	 * Common errors:
	 * - "no-speech": No speech detected
	 * - "audio-capture": Microphone not accessible
	 * - "network": Network error
	 * - "aborted": Recognition was stopped
	 */
	recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
		let errorMessage = "Speech recognition error occurred";

		switch (event.error) {
			case "no-speech":
				errorMessage = "No speech detected. Please try again.";
				break;
			case "audio-capture":
				errorMessage = "Microphone not accessible. Please check permissions.";
				break;
			case "network":
				errorMessage = "Network error. Please check your internet connection.";
				break;
			case "aborted":
				// User stopped, not really an error
				return;
			default:
				errorMessage = `Speech recognition error: ${event.error}`;
		}

		callbacks.onError?.(new Error(errorMessage));
	};

	/**
	 * Fires when recognition stops (naturally or manually)
	 */
	recognition.onend = (_event: Event) => {
		callbacks.onEnd?.();
	};

	// Start the recognition
	try {
		recognition.start();
	} catch (error) {
		// Recognition might already be running
		callbacks.onError?.(
			error instanceof Error
				? error
				: new Error("Failed to start speech recognition"),
		);
		return null;
	}

	// Return a function to stop transcription
	return () => {
		try {
			recognition.stop();
		} catch (_error) {
			// Ignore errors when stopping
		}
	};
}
