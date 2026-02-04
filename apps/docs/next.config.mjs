import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const frameworkSections = [
	"tools",
	"get-started",
	"agents",
	"runtime",
	"sessions",
	"evaluation",
	"artifacts",
	"callbacks",
	"context",
	"deploy",
	"events",
	"guides",
];

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	outputFileTracingIncludes: {
		"/llms.mdx/[[...slug]]": ["./content/docs/**/*"],
	},
	async rewrites() {
		return [
			{
				source: "/docs/:path*.mdx",
				destination: "/llms.mdx/:path*",
			},
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
			{
				source: "/ingest/decide",
				destination: "https://us.i.posthog.com/decide",
			},
		];
	},
	async redirects() {
		// Redirect old doc from brain.iqai.com to new doc site
		const oldDocRedirects = ["plugins", "clients", "getting-started"].flatMap(
			(path) => [
				{
					source: `/${path}`,
					destination: "/",
					permanent: true,
				},
				{
					source: `/${path}/:slug*`,
					destination: "/",
					permanent: true,
				},
			],
		);

		// Redirect framework sections to new /docs/framework/ path
		const frameworkRedirects = frameworkSections.flatMap((section) => [
			{
				source: `/docs/${section}`,
				destination: `/docs/framework/${section}`,
				permanent: true,
			},
			{
				source: `/docs/${section}/:path*`,
				destination: `/docs/framework/${section}/:path*`,
				permanent: true,
			},
		]);

		const specificRedirects = [
			{ from: "/docs/framework", to: "/docs" },
			{
				from: "/docs/framework/sessions",
				to: "/docs/framework/session-state-memory",
			},
			{
				from: "/docs/framework/sessions/session",
				to: "/docs/framework/session-state-memory/session",
			},
			{
				from: "/docs/framework/sessions/state",
				to: "/docs/framework/session-state-memory/state",
			},
			{
				from: "/docs/framework/sessions/memory",
				to: "/docs/framework/session-state-memory/memory",
			},
			{
				from: "/docs/framework/callbacks/design-patterns",
				to: "/docs/framework/callbacks",
			},
			{
				from: "/docs/framework/callbacks/context-patterns",
				to: "/docs/framework/callbacks/callback-patterns",
			},
			{
				from: "/docs/framework/deploy",
				to: "/docs/framework/guides/deployment",
			},
			{
				from: "/docs/framework/deploy/cloud-run",
				to: "/docs/framework/guides/deployment",
			},
			{
				from: "/docs/framework/guides/deploying-agents",
				to: "/docs/framework/guides/deployment",
			},
			{
				from: "/docs/framework/guides/coinbase-agentkit-adkts-integration",
				to: "/docs/framework/guides/integrations/coinbase-agentkit",
			},
		];

		// MCP server redirects for moved pages
		const mcpServerRedirects = [
			// IQ AI Built-in Servers
			...[
				"abi",
				"atp",
				"bamm",
				"coingecko",
				"coingecko-pro",
				"debank",
				"defillama",
				"discord",
				"fraxlend",
				"iqwiki",
				"kalshi",
				"limitless",
				"near-agent",
				"near-intents",
				"odos",
				"opinion",
				"polymarket",
				"telegram",
				"upbit",
			].map((page) => ({
				from: `/docs/mcp-servers/${page}`,
				to: `/docs/mcp-servers/iq-ai-servers/${page}`,
			})),
			// Third-Party Wrappers
			...["filesystem", "memory"].map((page) => ({
				from: `/docs/mcp-servers/${page}`,
				to: `/docs/mcp-servers/third-party-wrappers/${page}`,
			})),
		];

		const otherRedirects = [...specificRedirects, ...mcpServerRedirects].map(
			({ from, to }) => ({
				source: from,
				destination: to,
				permanent: true,
			}),
		);

		return [...oldDocRedirects, ...frameworkRedirects, ...otherRedirects];
	},

	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

export default withMDX(config);
