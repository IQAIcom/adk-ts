"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * useApiUrl
 * Resolves the ADK API base URL from either the `apiUrl` query param,
 * the `port` query param (as http://localhost:<port>), or defaults to http://localhost:8042.
 * The value is memoized to remain stable for a given set of params.
 */
export function useApiUrl(): string {
	const searchParams = useSearchParams();

	return useMemo(() => {
		const apiUrl = searchParams.get("apiUrl");
		const port = searchParams.get("port");
		if (apiUrl && apiUrl.length > 0) return apiUrl;
		if (port && port.length > 0) return `http://localhost:${port}`;
		return "http://localhost:8042";
	}, [searchParams]);
}
