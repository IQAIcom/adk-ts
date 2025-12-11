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
		const pluginRedirects = [
			{
				source: "/plugins",
				destination: "/",
				permanent: true,
			},
			{
				source: "/plugins/:slug*",
				destination: "/",
				permanent: true,
			},
		];

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

		return [...pluginRedirects, ...frameworkRedirects];
	},

	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

export default withMDX(config);
