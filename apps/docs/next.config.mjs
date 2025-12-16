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
				to: "/docs/framework/sessions/session",
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
				to: "/docs/framework/guides/deploying-agents",
			},
			{
				from: "/docs/framework/deploy/cloud-run",
				to: "/docs/framework/guides/deploying-agents",
			},
		];

		const otherRedirects = specificRedirects.map(({ from, to }) => ({
			source: from,
			destination: to,
			permanent: true,
		}));

		return [...oldDocRedirects, ...frameworkRedirects, ...otherRedirects];
	},

	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

export default withMDX(config);
