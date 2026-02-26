import type { MetadataRoute } from "next";

const BASE_URL = "https://adk-web.iqai.com";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: BASE_URL,
			changeFrequency: "monthly",
			priority: 1.0,
			lastModified: new Date(),
		},
	];
}
