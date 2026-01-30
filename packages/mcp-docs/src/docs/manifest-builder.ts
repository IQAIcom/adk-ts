import { logger } from "../logger.js";
import { discoverRoutesFromWebsite } from "./dynamic-routes.js";

/**
 * Build a manifest of all available documentation routes
 *
 * Strategy:
 * 1. Dynamic discovery from live website (PRIMARY)
 * 2. Hardcoded fallback (LAST RESORT)
 *
 * No local file system access - fully remote-first!
 */
export async function buildRouteManifest(): Promise<string[]> {
	const fallbackRoutes = getFallbackRoutes();
	let dynamicRoutes: string[] = [];

	// Strategy 1: Try dynamic discovery from live website
	try {
		logger.debug("Attempting dynamic route discovery from website");
		const discovered = await discoverRoutesFromWebsite();

		if (discovered && discovered.length > 0) {
			logger.info(`✅ Discovered ${discovered.length} routes dynamically`);
			dynamicRoutes = discovered;
		}
	} catch (error) {
		logger.debug("Dynamic route discovery failed", error);
	}

	// Combine dynamic and fallback routes, removing duplicates
	const allRoutes = Array.from(new Set([...dynamicRoutes, ...fallbackRoutes]));

	logger.info(
		`Total documentation routes to process: ${allRoutes.length} (${dynamicRoutes.length} dynamic, ${fallbackRoutes.length} fallback)`,
	);

	return allRoutes;
}

// Fallback routes if dynamic discovery fails
// NOTE: Excludes "index" routes as Fumadocs doesn't serve them at /path/index.mdx
function getFallbackRoutes(): string[] {
	return [
		// Get Started
		"framework/get-started/installation",
		"framework/get-started/quickstart",

		// Agents
		"framework/agents/agent-builder",
		"framework/agents/llm-agents",
		"framework/agents/custom-agents",
		"framework/agents/models",
		"framework/agents/multi-agents",
		"framework/agents/best-practices",
		"framework/agents/workflow-agents/sequential-agents",
		"framework/agents/workflow-agents/parallel-agents",
		"framework/agents/workflow-agents/loop-agents",
		"framework/agents/workflow-agents/langgraph-agents",

		// Tools
		"framework/tools/create-tool",
		"framework/tools/built-in-tools",
		"framework/tools/function-tools",
		"framework/tools/mcp-tools",
		"framework/tools/openapi-tools",
		"framework/tools/third-party-tools",
		"framework/tools/google-cloud-tools",
		"framework/tools/authentication",
		"framework/tools/tool-context",

		// Session, State & Memory
		"framework/session-state-memory/session",
		"framework/session-state-memory/state",
		"framework/session-state-memory/memory",
		"framework/session-state-memory/vertex-ai",

		// Context
		"framework/context/invocation-context",
		"framework/context/readonly-context",
		"framework/context/callback-context",
		"framework/context/tool-context",
		"framework/context/context-caching",
		"framework/context/context-patterns",

		// Artifacts
		"framework/artifacts/service-implementations",
		"framework/artifacts/runner-configuration",
		"framework/artifacts/context-integration",
		"framework/artifacts/scoping-and-versioning",
		"framework/artifacts/best-practices",
		"framework/artifacts/recipes",
		"framework/artifacts/troubleshooting",

		// Events
		"framework/events/working-with-events",
		"framework/events/streaming",
		"framework/events/event-actions",
		"framework/events/compaction",
		"framework/events/patterns",

		// Callbacks
		"framework/callbacks/types",
		"framework/callbacks/callback-patterns",

		// Runtime
		"framework/runtime/event-loop",

		// Evaluation
		"framework/evaluation/evaluation-concepts",
		"framework/evaluation/metrics-and-scoring",
		"framework/evaluation/evaluation-patterns",
		"framework/evaluation/testing-agents",

		// Plugins
		"framework/plugins/langfuse-plugin",
		"framework/plugins/reflect-and-retry",

		// Observability
		"framework/observability/getting-started",
		"framework/observability/tracing",
		"framework/observability/metrics",
		"framework/observability/integrations",
		"framework/observability/production",

		// Guides
		"framework/guides/best-practices",
		"framework/guides/troubleshooting",
		"framework/guides/agent-instructions",
		"framework/guides/deployment/docker",
		"framework/guides/deployment/vercel",
		"framework/guides/deployment/aws",
		"framework/guides/deployment/railway",
		"framework/guides/deployment/telegram",
		"framework/guides/integrations/coinbase-agentkit",

		// MCP Servers
		"mcp-servers/abi",
		"mcp-servers/atp",
		"mcp-servers/bamm",
		"mcp-servers/coingecko",
		"mcp-servers/coingecko-pro",
		"mcp-servers/discord",
		"mcp-servers/fraxlend",
		"mcp-servers/iqwiki",
		"mcp-servers/near-agent",
		"mcp-servers/near-intents",
		"mcp-servers/odos",
		"mcp-servers/polymarket",
		"mcp-servers/telegram",
		"mcp-servers/upbit",

		// CLI
		"cli/commands",
		"cli/configuration",
	];
}
