import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const BASE_URL = "https://adk.iqai.com";

export default function sitemap(): MetadataRoute.Sitemap {
	const docPages = source.getPages().map((page) => ({
		url: `${BASE_URL}${page.url}`,
		changeFrequency: "weekly" as const,
		priority: page.url === "/docs" ? 0.9 : 0.7,
		lastModified: new Date(),
	}));

	const staticPages: MetadataRoute.Sitemap = [
		{
			url: BASE_URL,
			changeFrequency: "weekly",
			priority: 1.0,
			lastModified: new Date(),
		},
		{
			url: `${BASE_URL}/showcase`,
			changeFrequency: "monthly",
			priority: 0.5,
			lastModified: new Date(),
		},
	];

	return [...staticPages, ...docPages];
}
