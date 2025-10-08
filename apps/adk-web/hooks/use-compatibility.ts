"use client";

import { useEffect, useMemo, useState } from "react";
import { Api } from "@/Api";
import compat from "../VERSION_COMPATIBILITY.json";
import { useApiUrl } from "./use-api-url";

// Simple semver compare (major.minor.patch) - returns true if a >= b
function isSemverGte(a: string, b: string): boolean {
	const pa = a.split(".").map((n) => Number.parseInt(n, 10));
	const pb = b.split(".").map((n) => Number.parseInt(n, 10));
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const ai = pa[i] ?? 0;
		const bi = pb[i] ?? 0;
		if (ai > bi) return true;
		if (ai < bi) return false;
	}
	return true;
}

export function useCompatibility() {
	const apiUrl = useApiUrl();
	const api = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);
	const [cliVersion, setCliVersion] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		let mounted = true;
		async function check() {
			if (!apiUrl) {
				setLoading(false);
				return;
			}
			setLoading(true);
			setError(null);
			try {
				const res = await api.health.healthControllerHealth();
				const version = (res.data as any)?.version as string | undefined;
				if (mounted) setCliVersion(version ?? null);
			} catch (e: any) {
				if (mounted) setError(e?.message ?? "Failed to fetch health/version");
			} finally {
				if (mounted) setLoading(false);
			}
		}
		check();
		return () => {
			mounted = false;
		};
	}, [api, apiUrl]);

	const minCli = (compat as any)?.minCliVersion as string | undefined;
	const compatible = useMemo(() => {
		if (!minCli || !cliVersion) return true; // if unknown, don't block
		return isSemverGte(cliVersion, minCli);
	}, [cliVersion, minCli]);

	return {
		loading,
		error,
		cliVersion,
		minCliVersion: minCli ?? null,
		compatible,
	};
}
