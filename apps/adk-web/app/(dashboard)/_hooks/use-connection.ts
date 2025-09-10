"use client";

import { useEffect, useState } from "react";

export function useConnection() {
	const [apiUrl, setApiUrl] = useState<string>("");
	const [connected, setConnected] = useState(false);
	const [initializing, setInitializing] = useState(true);

	useEffect(() => {
		// Get API URL from query params
		const urlParams = new URLSearchParams(window.location.search);
		const apiUrlParam = urlParams.get("apiUrl");

		if (apiUrlParam) {
			setApiUrl(apiUrlParam);
		}

		setInitializing(false);
	}, []);

	const updateConnectionStatus = (status: boolean) => {
		setConnected(status);
	};

	return {
		apiUrl,
		connected,
		initializing,
		updateConnectionStatus,
	};
}
