"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * useApiUrl
 *
 * Resolves the ADK API base URL based on how the web app is being served:
 *
 * 1. BUNDLED MODE (default): When the web app is served by the CLI on the same
 *    origin as the API, we return an empty string to use relative URLs.
 *    This eliminates CORS issues and works on any port.
 *
 * 2. HOSTED MODE: When using the hosted web app (adk-web.iqai.com) or
 *    during development, query params can specify the API location:
 *    - `?apiUrl=http://...` - Full API URL
 *    - `?port=8042` - Shorthand for http://localhost:<port>
 *
 * The value is memoized to remain stable for a given set of params.
 */
export function useApiUrl(): string {
	const searchParams = useSearchParams();

	return useMemo(() => {
		// Check for explicit query param overrides (hosted mode)
		const apiUrl = searchParams.get("apiUrl");
		const port = searchParams.get("port");

		// If apiUrl is explicitly provided, use it
		if (apiUrl && apiUrl.length > 0) return apiUrl;

		// If port is explicitly provided, build localhost URL
		if (port && port.length > 0) return `http://localhost:${port}`;

		// BUNDLED MODE: No query params means we're likely served from the CLI
		// on the same origin. Use relative URLs (empty string prefix).
		// This makes API calls go to the same host:port that served the page.
		if (typeof window !== "undefined") {
			// We're in the browser - use relative URLs for same-origin requests
			return "";
		}

		// SSR fallback (shouldn't happen with static export, but just in case)
		return "http://localhost:8042";
	}, [searchParams]);
}
