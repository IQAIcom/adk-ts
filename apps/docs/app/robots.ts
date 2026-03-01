import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/docs-og/", "/llms.mdx/", "/ingest/"],
			},
		],
		sitemap: "https://adk.iqai.com/sitemap.xml",
		host: "https://adk.iqai.com",
	};
}
