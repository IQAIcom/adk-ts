import { useCallback, useRef, useState } from "react";

const useVoiceRecording = () => {
	const [recording, setRecording] = useState(false);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);

	const startRecording = useCallback(async () => {
		try {
			setError(null);
			setAudioFile(null);
			audioChunksRef.current = [];

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

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

			mediaRecorder.start();
			setRecording(true);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to start recording. Please check microphone permissions.";
			setError(errorMessage);
			console.error("Error starting recording:", err);
		}
	}, []);

	const stopRecording = useCallback(async (): Promise<File | null> => {
		return new Promise((resolve) => {
			if (!mediaRecorderRef.current) {
				setRecording(false);
				resolve(null);
				return;
			}

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
				resolve(file);

				console.log("audioFile", file);

				// Save the audio file to device
				const url = URL.createObjectURL(file);
				const a = document.createElement("a");
				a.href = url;
				a.download = fileName;
				a.click();

				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => track.stop());
					streamRef.current = null;
				}
				mediaRecorderRef.current = null;
			};

			if (mediaRecorderRef.current.state !== "inactive") {
				mediaRecorderRef.current.stop();
			} else {
				setRecording(false);
				resolve(null);
			}
		});
	}, []);

	const clearAudio = useCallback(() => {
		setAudioFile(null);
		setError(null);
	}, []);

	return {
		recording,
		audioFile,
		error,
		startRecording,
		stopRecording,
		clearAudio,
	};
};

export default useVoiceRecording;
