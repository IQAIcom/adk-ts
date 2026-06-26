// Single source of truth for non-sensitive PostHog config.
// The project key stays in env (NEXT_PUBLIC_POSTHOG_KEY) — it is per-deploy.
// Exported as `posthogConfig` (not `posthog`) to avoid colliding with the
// `posthog` default import from "posthog-js" in instrumentation-client.ts.
export const posthogConfig = {
	apiHost: "/ingest", // first-party reverse-proxy base path; also builds the rewrite sources
	uiHost: "https://us.posthog.com",
	ingestHost: "https://us.i.posthog.com",
	assetsHost: "https://us-assets.i.posthog.com",
	defaults: /** @type {import("posthog-js").ConfigDefaults} */ ("2025-05-24"), // maps 1:1 to posthog-js init() `defaults` option
};
