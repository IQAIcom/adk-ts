"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { gte } from "semver";
import { Api, type HealthResponseDto } from "@/Api";
import compat from "../VERSION_COMPATIBILITY.json";
import { useApiUrl } from "./use-api-url";

export function useCompatibility() {
	const apiUrl = useApiUrl();
	const api = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);
	const minCliVersion = compat.minCliVersion;

	// Fetch CLI version from health endpoint
	const {
		data: healthData,
		isLoading: loading,
		error,
	} = useQuery({
		queryKey: ["health", apiUrl],
		queryFn: async (): Promise<HealthResponseDto> => {
			if (!apiUrl) throw new Error("API URL is required");
			const res = await api.health.healthControllerHealth();
			return res.data;
		},
		enabled: !!apiUrl,
		staleTime: 60000, // Cache for 1 minute
		retry: 2,
		retryDelay: 1000,
	});

	const cliVersion = healthData?.version ?? null;

	// Check compatibility using proper semver comparison
	const compatible = useMemo(() => {
		if (!minCliVersion || !cliVersion) {
			// If we don't know the versions, assume compatible (fail-open)
			return true;
		}
		try {
			return gte(cliVersion, minCliVersion);
		} catch {
			// If semver parsing fails, assume compatible to avoid blocking
			return true;
		}
	}, [cliVersion, minCliVersion]);

	return {
		loading,
		error,
		cliVersion,
		minCliVersion,
		compatible,
	};
}
