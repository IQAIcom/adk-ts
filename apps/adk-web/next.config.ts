import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Static export for bundling with CLI
	// This generates static HTML/CSS/JS files in the `out/` directory
	// that can be served by any static file server (like Express in the CLI)
	output: "export",

	// Trailing slashes help with static file routing
	// Each page becomes /page/index.html instead of /page.html
	trailingSlash: true,

	// Image optimization requires a Node.js server, which isn't available
	// in static export mode. We serve images as-is.
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
