import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { logger } from "../logger.js";
import type { DocCategory, DocSection } from "../types.js";
import { buildRouteManifest } from "./manifest-builder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, "../..", ".cache");
const CACHE_FILE = join(CACHE_DIR, "docs-cache.json");

const BASE_URL = "https://adk.iqai.com";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Cache structure
interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

// Global cache
const cache = {
	routes: null as CacheEntry<string[]> | null,
	pages: new Map<string, CacheEntry<string>>(),
	docs: null as CacheEntry<DocSection[]> | null,
};

// Helper to check if cache is valid (24 hours for persistent cache)
const PERSISTENT_CACHE_TTL = 1000 * 60 * 60 * 24;

function isCacheValid<T>(
	entry: CacheEntry<T> | null,
	ttl = CACHE_TTL,
): boolean {
	if (!entry) return false;
	return Date.now() - entry.timestamp < ttl;
}

// Persistent cache helpers
async function saveToDisk(sections: DocSection[]) {
	try {
		await mkdir(CACHE_DIR, { recursive: true });
		const entry: CacheEntry<DocSection[]> = {
			data: sections,
			timestamp: Date.now(),
		};
		await writeFile(CACHE_FILE, JSON.stringify(entry, null, 2), "utf-8");
		logger.debug(`Saved ${sections.length} sections to persistent cache`);
	} catch (error) {
		logger.error("Failed to save cache to disk", error);
	}
}

async function loadFromDisk(): Promise<DocSection[] | null> {
	try {
		const content = await readFile(CACHE_FILE, "utf-8");
		const entry = JSON.parse(content) as CacheEntry<DocSection[]>;

		if (isCacheValid(entry, PERSISTENT_CACHE_TTL)) {
			logger.info(
				`Loaded ${entry.data.length} documentation sections from disk cache`,
			);
			return entry.data;
		}
		logger.debug("Disk cache is expired");
		return null;
	} catch (error) {
		logger.debug("No disk cache found or failed to read");
		return null;
	}
}

// Fetch with caching
async function fetchWithCache(url: string): Promise<string> {
	const cacheKey = url;

	// Check page cache
	if (cache.pages.has(cacheKey) && isCacheValid(cache.pages.get(cacheKey)!)) {
		logger.debug(`Cache hit for ${url}`);
		return cache.pages.get(cacheKey)!.data;
	}

	logger.debug(`Fetching ${url}`);
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const text = await response.text();

		// Cache the response
		cache.pages.set(cacheKey, {
			data: text,
			timestamp: Date.now(),
		});

		return text;
	} catch (error) {
		logger.error(`Failed to fetch ${url}`, error);
		throw error;
	}
}

// Get documentation routes from manifest
async function fetchDocumentationRoutes(): Promise<string[]> {
	if (cache.routes && isCacheValid(cache.routes)) {
		return cache.routes.data;
	}

	logger.debug("Building route manifest");
	const routes = await buildRouteManifest();

	cache.routes = {
		data: routes,
		timestamp: Date.now(),
	};

	return routes;
}

// Map route to category
function getCategory(route: string): DocCategory {
	const parts = route.split("/");
	const firstDir = parts[0];

	const categoryMap: Record<string, DocCategory> = {
		framework: "framework",
		agents: "agents",
		tools: "tools",
		sessions: "sessions",
		memory: "memory",
		"mcp-servers": "mcp-servers",
		cli: "cli",
		examples: "examples",
		api: "api",
		concepts: "concepts",
		reference: "reference",
	};

	return categoryMap[firstDir] ?? "reference";
}

// Fetch a single MDX page
async function fetchMdxPage(route: string): Promise<DocSection | null> {
	try {
		const url = `${BASE_URL}/docs/${route}.mdx`;
		const content = await fetchWithCache(url);

		// Parse frontmatter
		const { data: frontmatter, content: rawContent } = matter(content);

		// Extract title and description
		const title =
			frontmatter.title ?? extractTitle(rawContent) ?? route.split("/").pop();
		const description =
			frontmatter.description ?? extractDescription(rawContent);
		const category =
			(frontmatter.category as DocCategory) ?? getCategory(route);

		return {
			id: route.replace(/\//g, ":"),
			title: title ?? "Untitled",
			description,
			content: stripMdxComponents(rawContent),
			path: route,
			category,
			frontmatter,
		};
	} catch (error) {
		// Only log if it's not a 404 (404s are expected for index pages)
		if (error instanceof Error && !error.message.includes("404")) {
			logger.error(`Failed to fetch page ${route}`, error);
		}
		return null;
	}
}

// Strip MDX/JSX components from content
function stripMdxComponents(content: string): string {
	return (
		content
			// Remove import statements
			.replace(/^import\s+.*$/gm, "")
			// Remove export statements
			.replace(/^export\s+.*$/gm, "")
			// Remove JSX/TSX components
			.replace(
				/<[A-Z][a-zA-Z]*[^>]*>|<\/[A-Z][a-zA-Z]*>|<[A-Z][a-zA-Z]*[^>]*\/>/g,
				"",
			)
			// Remove MDX comments
			.replace(/{\/\*.*\*\/}/g, "")
			// Clean up extra whitespace
			.replace(/\n{3,}/g, "\n\n")
			.trim()
	);
}

// Extract title from content
function extractTitle(content: string): string | undefined {
	const titleMatch = content.match(/^#\s+(.+)$/m);
	return titleMatch?.[1]?.trim();
}

// Extract description from content
function extractDescription(content: string): string | undefined {
	const lines = content.split("\n");
	let inParagraph = false;
	const paragraphLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (
			trimmed.startsWith("#") ||
			trimmed.startsWith("import") ||
			(trimmed === "" && !inParagraph)
		) {
			continue;
		}

		if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
			continue;
		}

		if (trimmed !== "" && !inParagraph) {
			inParagraph = true;
		}

		if (trimmed === "" && inParagraph) {
			break;
		}

		if (inParagraph) {
			paragraphLines.push(trimmed);
		}
	}

	const description = paragraphLines.join(" ").slice(0, 200);
	return description || undefined;
}

// Load all documentation from remote site
export async function loadDocsFromRemote(): Promise<DocSection[]> {
	// 1. Check in-memory cache
	if (cache.docs && isCacheValid(cache.docs)) {
		logger.debug("Using in-memory documentation cache");
		return cache.docs.data;
	}

	// 2. Check disk cache
	const diskSections = await loadFromDisk();
	if (diskSections) {
		cache.docs = {
			data: diskSections,
			timestamp: Date.now(),
		};
		return diskSections;
	}

	logger.info("Loading documentation from remote site", { url: BASE_URL });

	// Fetch routes from llm.txt
	const routes = await fetchDocumentationRoutes();
	logger.info(`Found ${routes.length} documentation routes`);

	// Fetch all pages in parallel (with concurrency limit)
	const sections: DocSection[] = [];
	const BATCH_SIZE = 10;

	for (let i = 0; i < routes.length; i += BATCH_SIZE) {
		const batch = routes.slice(i, i + BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map((route) => fetchMdxPage(route)),
		);

		for (const result of results) {
			if (result.status === "fulfilled" && result.value) {
				sections.push(result.value);
			}
		}

		logger.debug(`Loaded ${sections.length}/${routes.length} pages`);
	}

	logger.info(`Successfully loaded ${sections.length} documentation sections`);

	// Cache the results in-memory
	cache.docs = {
		data: sections,
		timestamp: Date.now(),
	};

	// Save to disk cache
	await saveToDisk(sections);

	return sections;
}

// Get available paths by fetching navigation structure
export async function getAvailablePathsFromRemote(): Promise<string> {
	const routes = await fetchDocumentationRoutes();

	const lines = ["Available documentation paths:", ""];

	// Group routes by category
	const categories = new Map<string, string[]>();

	for (const route of routes) {
		const parts = route.split("/");
		const category = parts[0];

		if (!categories.has(category)) {
			categories.set(category, []);
		}
		categories.get(category)!.push(route);
	}

	for (const [category, paths] of categories.entries()) {
		lines.push(`**${category}/**`);
		for (const path of paths.slice(0, 5)) {
			// Show first 5
			lines.push(`  - ${path}`);
		}
		if (paths.length > 5) {
			lines.push(`  ... and ${paths.length - 5} more`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

// Read specific documentation path from remote
export async function readDocPathFromRemote(
	docPath: string,
): Promise<
	{ found: true; content: string } | { found: false; suggestion: string }
> {
	try {
		// Normalize path (remove leading/trailing slashes, .mdx extension)
		const normalizedPath = docPath
			.replace(/^\/+|\/+$/g, "")
			.replace(/\.mdx?$/, "");

		const section = await fetchMdxPage(normalizedPath);

		if (!section) {
			const availablePaths = await getAvailablePathsFromRemote();
			return {
				found: false,
				suggestion: `Path "${docPath}" not found.\n\n${availablePaths}`,
			};
		}

		// Format content with frontmatter
		const header: string[] = [];
		if (section.title) header.push(`# ${section.title}`);
		if (section.description) header.push(`\n${section.description}\n`);

		return {
			found: true,
			content: `${header.join("")}\n${section.content}`,
		};
	} catch (error) {
		const availablePaths = await getAvailablePathsFromRemote();
		return {
			found: false,
			suggestion: `Failed to fetch "${docPath}".\n\n${availablePaths}`,
		};
	}
}

// Clear cache (useful for testing or manual refresh)
export function clearCache() {
	cache.routes = null;
	cache.pages.clear();
	cache.docs = null;
	logger.info("Cache cleared");
}
