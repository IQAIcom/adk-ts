import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
			},
		],
		sitemap: "https://adk-web.iqai.com/sitemap.xml",
		host: "https://adk-web.iqai.com",
	};
}
