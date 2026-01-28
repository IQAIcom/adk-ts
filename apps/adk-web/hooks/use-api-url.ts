"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const DEFAULT_API_PORT = 8042;
const DEFAULT_API_URL = `http://localhost:${DEFAULT_API_PORT}`;

/**
 * useApiUrl
 *
 * Resolves the ADK API base URL based on how the web app is being served.
 *
 * Priority:
 * 1. Explicit query params:
 *    - `?apiUrl=http://...` - Full API URL
 *    - `?port=8042`         - Shorthand for http://localhost:<port>
 *
 * 2. Environment-based defaults:
 *    - Local dev (Next dev server, usually http://localhost:3000):
 *        → http://localhost:8042
 *    - Hosted web (e.g. https://adk-web.iqai.com):
 *        → http://localhost:8042
 *    - Bundled CLI mode (static export served from CLI on same origin as API):
 *        → "" (empty string) so all requests are relative and same-origin
 *
 * The value is memoized to remain stable for a given set of params.
 */
export function useApiUrl(): string {
	const searchParams = useSearchParams();

	return useMemo(() => {
		// 1. Explicit query param overrides
		const apiUrl = searchParams.get("apiUrl");
		const port = searchParams.get("port");

		// If apiUrl is explicitly provided, use it
		if (apiUrl) return apiUrl;

		// If port is explicitly provided, build localhost URL
		if (port) return `http://localhost:${port}`;

		if (typeof window !== "undefined") {
			const { hostname, port: currentPort } = window.location;

			const isLocalhost =
				hostname === "localhost" ||
				hostname === "127.0.0.1" ||
				hostname === "[::1]";

			// Any localhost origin (dev or preview): send API traffic to default port
			if (isLocalhost && currentPort) {
				return DEFAULT_API_URL;
			}

			// Bundled CLI mode (static export served from CLI) is expected to use a
			// relative base URL (""), but in the current configuration all localhost
			// origins are routed to the default API URL above. If we re‑enable true
			// same‑origin bundled mode in the future, that logic should live here.
			if (isLocalhost) {
				// Empty string makes all requests relative to current origin
				return "";
			}

			// Hosted web (e.g. adk-web.iqai.com) – API still runs locally
			return DEFAULT_API_URL;
		}

		// SSR / non-browser fallback
		return DEFAULT_API_URL;
	}, [searchParams]);
}
