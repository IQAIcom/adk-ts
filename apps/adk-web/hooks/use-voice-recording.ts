import { useCallback, useRef, useState } from "react";
import {
	isSpeechRecognitionSupported,
	startTranscription,
} from "@/lib/transcribe-audio";

const useVoiceRecording = () => {
	const [recording, setRecording] = useState(false);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [transcribedText, setTranscribedText] = useState<string>("");
	const [isTranscribing, setIsTranscribing] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);
	const stopTranscriptionRef = useRef<(() => void) | null>(null);
	const accumulatedTranscriptRef = useRef<string>("");

	const startRecording = useCallback(async () => {
		try {
			setError(null);
			setAudioFile(null);
			setTranscribedText("");
			audioChunksRef.current = [];
			accumulatedTranscriptRef.current = "";

			// Step 1: Get microphone access
			// This creates a MediaStream that both MediaRecorder and SpeechRecognition can use
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			// Step 2: Set up MediaRecorder to capture audio as a file
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported("audio/webm")
					? "audio/webm"
					: MediaRecorder.isTypeSupported("audio/ogg")
						? "audio/ogg"
						: "audio/mp4",
			});

			mediaRecorderRef.current = mediaRecorder;

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onerror = (event) => {
				setError("Recording error occurred");
				console.error("MediaRecorder error:", event);
			};

			// Step 3: Start audio recording
			mediaRecorder.start();
			setRecording(true);

			// Step 4: Start transcription in parallel (if supported)
			// Both can use the same microphone stream simultaneously
			if (isSpeechRecognitionSupported()) {
				setIsTranscribing(true);
				const stopTranscription = startTranscription({
					onResult: (result) => {
						// Accumulate final results (when user pauses)
						if (result.isFinal) {
							accumulatedTranscriptRef.current += result.text + " ";
							setTranscribedText(accumulatedTranscriptRef.current.trim());
						} else {
							// Show interim results (as user speaks) combined with final
							const displayText =
								accumulatedTranscriptRef.current + result.text;
							setTranscribedText(displayText.trim());
						}
					},
					onError: (err) => {
						// Don't fail the whole recording if transcription fails
						// Just log it and continue with audio recording
						console.warn("Transcription error:", err);
						setIsTranscribing(false);
					},
					onEnd: () => {
						setIsTranscribing(false);
					},
				});

				stopTranscriptionRef.current = stopTranscription;
			} else {
				// Browser doesn't support transcription, but recording still works
				setIsTranscribing(false);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to start recording. Please check microphone permissions.";
			setError(errorMessage);
			console.error("Error starting recording:", err);
		}
	}, []);

	const stopRecording = useCallback(async (): Promise<{
		file: File | null;
		transcript: string;
	}> => {
		return new Promise((resolve) => {
			// Step 1: Stop transcription first
			// This ensures we capture any final transcription results
			if (stopTranscriptionRef.current) {
				stopTranscriptionRef.current();
				stopTranscriptionRef.current = null;
			}
			setIsTranscribing(false);

			// Step 2: Get the final transcribed text
			const finalTranscript = accumulatedTranscriptRef.current.trim();

			if (!mediaRecorderRef.current) {
				setRecording(false);
				resolve({ file: null, transcript: finalTranscript });
				return;
			}

			// Step 3: Stop the MediaRecorder and create the audio file
			mediaRecorderRef.current.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: mediaRecorderRef.current?.mimeType || "audio/webm",
				});

				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const extension = audioBlob.type.includes("webm")
					? "webm"
					: audioBlob.type.includes("ogg")
						? "ogg"
						: "mp4";
				const fileName = `voice-recording-${timestamp}.${extension}`;

				const file = new File([audioBlob], fileName, {
					type: audioBlob.type,
				});

				setAudioFile(file);
				setRecording(false);

				// Clean up microphone stream
				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => track.stop());
					streamRef.current = null;
				}
				mediaRecorderRef.current = null;

				// Return both the file and the transcript
				resolve({ file, transcript: finalTranscript });
			};

			if (mediaRecorderRef.current.state !== "inactive") {
				mediaRecorderRef.current.stop();
			} else {
				setRecording(false);
				resolve({ file: null, transcript: finalTranscript });
			}
		});
	}, []);

	const clearAudio = useCallback(() => {
		setAudioFile(null);
		setError(null);
		setTranscribedText("");
		accumulatedTranscriptRef.current = "";
	}, []);

	return {
		recording,
		audioFile,
		error,
		transcribedText,
		isTranscribing,
		startRecording,
		stopRecording,
		clearAudio,
	};
};

export default useVoiceRecording;
