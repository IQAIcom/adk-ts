import { useState } from "react";

const useVoiceRecording = () => {
	const [recording, setRecording] = useState(false);
	const startRecording = () => {
		setRecording(true);
	};
	const stopRecording = () => {
		setRecording(false);
	};

	return {
		recording,
		startRecording,
		stopRecording,
	};
};

export default useVoiceRecording;
