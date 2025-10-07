"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { coerce as semverCoerce, satisfies as semverSatisfies } from "semver";
import { toast } from "sonner";
import { useApiUrl } from "@/hooks/use-api-url";
import { Api, HealthResponseDto } from "../Api";
import pkg from "../package.json";

// Define the server version range this web UI is compatible with.
// By default, keep it compatible with same minor of @iqai/adk-cli.
// You can override via NEXT_PUBLIC_ADK_SERVER_RANGE if needed for hotfixes.
const RANGE_FROM_PKG = (pkg as any)?.adk?.serverRange as string | undefined;
const DEFAULT_SERVER_RANGE =
	process.env.NEXT_PUBLIC_ADK_SERVER_RANGE ?? RANGE_FROM_PKG ?? "^0.3.11";

export function VersionCheck() {
	const apiBase = useApiUrl();

	// Fetch health with React Query
	const { data } = useQuery<HealthResponseDto, Error>({
		queryKey: ["health", apiBase],
		queryFn: async () => {
			const api = new Api({ baseUrl: apiBase });
			const resp = await api.health.healthControllerHealth();
			return resp.data;
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 0,
		enabled: !!apiBase,
		refetchOnWindowFocus: false,
	});

	// Deduplicate notifications per apiBase
	const notifiedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!data) return;
		const { version: serverVersion } = data;

		// Only notify once per base URL version snapshot
		const key = `${apiBase}:${serverVersion ?? "none"}`;
		if (notifiedRef.current === key) return;
		notifiedRef.current = key;

		if (!serverVersion) {
			toast.message("ADK server version not reported", {
				description:
					"Your local ADK server did not report a version. Some features may not work as expected.",
			});
			return;
		}

		const coerced = semverCoerce(serverVersion)?.version;
		if (!coerced) return;
		const ok = semverSatisfies(coerced, DEFAULT_SERVER_RANGE, {
			includePrerelease: true,
		});
		if (!ok) {
			toast.warning("ADK server may be outdated", {
				description: `Web UI expects server ${DEFAULT_SERVER_RANGE}, but found ${serverVersion}. Please update @iqai/adk-cli.`,
			});
		}
	}, [data, apiBase]);

	return null;
}
