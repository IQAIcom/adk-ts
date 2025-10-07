"use client";

import { useEffect } from "react";
import { coerce as semverCoerce, satisfies as semverSatisfies } from "semver";
import { toast } from "sonner";
import { useApiUrl } from "@/hooks/use-api-url";
import pkg from "../package.json";

// Contract: call GET /health to read { status: "ok", version?: string }
type HealthResponse = { status: string; version?: string };

// Define the server version range this web UI is compatible with.
// By default, keep it compatible with same minor of @iqai/adk-cli.
// You can override via NEXT_PUBLIC_ADK_SERVER_RANGE if needed for hotfixes.
const RANGE_FROM_PKG = (pkg as any)?.adk?.serverRange as string | undefined;
const DEFAULT_SERVER_RANGE =
	process.env.NEXT_PUBLIC_ADK_SERVER_RANGE ?? RANGE_FROM_PKG ?? "^0.3.11";

export function VersionCheck() {
	const apiBase = useApiUrl();

	useEffect(() => {
		let cancelled = false;

		async function run() {
			try {
				const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
				if (!res.ok) return;
				const body = (await res.json()) as HealthResponse;
				const serverVersion = body.version;
				if (!serverVersion) {
					// Unknown server version: warn but don’t block
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
				if (!ok && !cancelled) {
					toast.warning("ADK server may be outdated", {
						description: `Web UI expects server ${DEFAULT_SERVER_RANGE}, but found ${serverVersion}. Please update @iqai/adk-cli.`,
					});
				}
			} catch {
				// ignore – server may be offline; other UI already handles connectivity
			}
		}

		run();
		return () => {
			cancelled = true;
		};
	}, [apiBase]);

	return null;
}
