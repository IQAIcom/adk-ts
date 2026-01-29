import { logger } from "../logger.js";

const BASE_URL = "https://adk.iqai.com";

/**
 * Dynamically discover documentation routes from the live website
 * Attempts multiple strategies in order:
 * 1. Fetch sitemap.xml
 * 2. Crawl from homepage navigation
 * 3. Fall back to manifest builder
 */

// Strategy 1: Try to fetch and parse sitemap.xml
async function fetchRoutesFromSitemap(): Promise<string[] | null> {
	try {
		logger.debug("Attempting to fetch sitemap.xml");

		const sitemapUrls = [
			`${BASE_URL}/sitemap.xml`,
			`${BASE_URL}/sitemap-0.xml`,
			`${BASE_URL}/sitemap_index.xml`,
		];

		for (const url of sitemapUrls) {
			try {
				const response = await fetch(url);
				if (!response.ok) continue;

				const xml = await response.text();

				// Parse URLs from sitemap
				const urlMatches = xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
				const routes: string[] = [];

				for (const match of urlMatches) {
					const fullUrl = match[1];
					if (fullUrl.includes("/docs/")) {
						// Extract route from URL
						const route = fullUrl
							.replace(`${BASE_URL}/docs/`, "")
							.replace(/\/$/, "") // Remove trailing slash
							.trim();

						if (route && !routes.includes(route)) {
							routes.push(route);
						}
					}
				}

				if (routes.length > 0) {
					logger.info(
						`Discovered ${routes.length} routes from sitemap: ${url}`,
					);
					return routes;
				}
			} catch (error) {}
		}

		logger.debug("No routes found in sitemap");
		return null;
	} catch (error) {
		logger.debug("Failed to fetch sitemap", error);
		return null;
	}
}

// Strategy 2: Parse homepage to extract navigation links
async function fetchRoutesFromNavigation(): Promise<string[] | null> {
	try {
		logger.debug("Attempting to parse navigation from homepage");

		const response = await fetch(`${BASE_URL}/docs`);
		if (!response.ok) return null;

		const html = await response.text();
		const routes: string[] = [];

		// Match all href="/docs/..." links
		const hrefMatches = html.matchAll(/href="\/docs\/([^"]+)"/g);

		for (const match of hrefMatches) {
			const route = match[1].trim();
			if (route && !routes.includes(route)) {
				routes.push(route);
			}
		}

		if (routes.length > 0) {
			logger.info(`Discovered ${routes.length} routes from navigation`);
			return routes;
		}

		logger.debug("No routes found in navigation");
		return null;
	} catch (error) {
		logger.debug("Failed to parse navigation", error);
		return null;
	}
}

// Strategy 3: Use Fumadocs API if available
async function fetchRoutesFromApi(): Promise<string[] | null> {
	try {
		logger.debug("Attempting to fetch routes from API");

		// Try common API endpoints
		const apiUrls = [
			`${BASE_URL}/api/docs/routes`,
			`${BASE_URL}/api/search.json`,
			`${BASE_URL}/_next/data/routes.json`,
		];

		for (const url of apiUrls) {
			try {
				const response = await fetch(url);
				if (!response.ok) continue;

				const data = await response.json();

				// Extract routes from various JSON structures
				let routes: string[] = [];

				if (Array.isArray(data)) {
					routes = data
						.filter((item) => item && typeof item === "object")
						.map((item) => item.slug || item.path || item.route)
						.filter(Boolean);
				} else if (data.routes && Array.isArray(data.routes)) {
					routes = data.routes;
				}

				if (routes.length > 0) {
					logger.info(`Discovered ${routes.length} routes from API: ${url}`);
					return routes;
				}
			} catch (error) {}
		}

		logger.debug("No API endpoint found");
		return null;
	} catch (error) {
		logger.debug("Failed to fetch from API", error);
		return null;
	}
}

// Main function to dynamically discover routes
export async function discoverRoutesFromWebsite(): Promise<string[] | null> {
	logger.info("Starting dynamic route discovery from website");

	// Try strategies in order of reliability
	const strategies = [
		fetchRoutesFromSitemap,
		fetchRoutesFromApi,
		fetchRoutesFromNavigation,
	];

	for (const strategy of strategies) {
		const routes = await strategy();
		if (routes && routes.length > 0) {
			// Filter out index routes and clean up
			const cleanRoutes = routes
				.filter((route) => !route.endsWith("/index") && route !== "index")
				.filter((route) => route.length > 0);

			logger.info(
				`Successfully discovered ${cleanRoutes.length} routes dynamically`,
			);
			return cleanRoutes;
		}
	}

	logger.warn("All dynamic route discovery strategies failed");
	return null;
}
