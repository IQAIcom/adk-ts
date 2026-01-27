import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { DocSection, DocCategory } from "../types.js";
import { logger } from "../logger.js";

// Find docs root relative to the package directory
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const pkgRoot = path.resolve(__dirname, "../../");
const DOCS_ROOT = path.resolve(pkgRoot, "../../apps/docs/content/docs");
const MCP_SERVERS_DOCS = path.resolve(
	pkgRoot,
	"../../apps/docs/content/docs/mcp-servers",
);

// Meta.json structure
interface MetaJson {
	title?: string;
	icon?: string;
	root?: boolean;
	pages?: string[];
}

// Cache for meta.json files
const metaCache = new Map<string, MetaJson>();

// Load meta.json from a directory
async function loadMeta(dirPath: string): Promise<MetaJson | null> {
	const metaPath = path.join(dirPath, "meta.json");

	if (metaCache.has(metaPath)) {
		return metaCache.get(metaPath)!;
	}

	try {
		const content = await fs.readFile(metaPath, "utf-8");
		const meta = JSON.parse(content) as MetaJson;
		metaCache.set(metaPath, meta);
		return meta;
	} catch {
		return null;
	}
}

// Map directory names to categories
function getCategory(filePath: string): DocCategory {
	const parts = filePath.split("/");
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

	// Try first directory
	if (categoryMap[firstDir]) {
		return categoryMap[firstDir];
	}

	// Try second directory (for framework/agents etc)
	if (parts.length > 1 && categoryMap[parts[1]]) {
		return categoryMap[parts[1]];
	}

	return "reference";
}

// Strip MDX/JSX components from content for plain text
function stripMdxComponents(content: string): string {
	return (
		content
			// Remove import statements
			.replace(/^import\s+.*$/gm, "")
			// Remove export statements
			.replace(/^export\s+.*$/gm, "")
			// Remove code blocks (we want to search text, but maybe keep content? Let's keep for now but strip tags)
			// Remove JSX/TSX components like <Steps>, <Callout>, <Tabs>, <Tab>, <Cards>, <Card>
			// This matches <Component ...> or <Component> and their closing tags OR self-closing <Component />
			.replace(
				/<[A-Z][a-zA-Z]*[^>]*>| <\/[A-Z][a-zA-Z]*>|<[A-Z][a-zA-Z]*[^>]*\/>/g,
				"",
			)
			// Remove specific fumadocs components that might be missed or have special syntax
			.replace(/{\/\*.*\*\/}/g, "") // Remove MDX comments
			// Clean up extra whitespace
			.replace(/\n{3,}/g, "\n\n")
			.trim()
	);
}

export async function loadDocs(): Promise<DocSection[]> {
	logger.debug("Loading documentation files", { root: DOCS_ROOT });

	// Support both .md and .mdx files
	const files = await fg("**/*.{md,mdx}", { cwd: DOCS_ROOT });
	logger.info(`Found ${files.length} documentation files`);

	const sections: DocSection[] = [];

	for (const file of files) {
		// Skip meta.json files
		if (file.endsWith("meta.json")) continue;

		try {
			const fullPath = path.join(DOCS_ROOT, file);
			const raw = await fs.readFile(fullPath, "utf-8");

			// Parse frontmatter using gray-matter
			const { data: frontmatter, content: rawContent } = matter(raw);

			// Strip MDX components from content
			const content = stripMdxComponents(rawContent);

			// Extract title from frontmatter or first heading
			const title =
				frontmatter.title ??
				extractTitle(content) ??
				path.basename(file, path.extname(file));
			const description =
				frontmatter.description ?? extractDescription(content);
			const category =
				(frontmatter.category as DocCategory) ?? getCategory(file);

			// Get ordering from parent meta.json
			const parentDir = path.dirname(fullPath);
			const meta = await loadMeta(parentDir);
			const baseName = path.basename(file, path.extname(file));
			const order = meta?.pages?.indexOf(baseName) ?? -1;

			sections.push({
				id: file.replace(/\//g, ":").replace(/\.(md|mdx)$/, ""),
				title,
				description,
				content,
				path: file,
				category,
				frontmatter: {
					...frontmatter,
					order: order >= 0 ? order : undefined,
					icon: frontmatter.icon,
				},
			});
		} catch (error) {
			logger.error(`Failed to load doc: ${file}`, error);
		}
	}

	// Sort by order if available
	sections.sort((a, b) => {
		const orderA = (a.frontmatter?.order as number) ?? 999;
		const orderB = (b.frontmatter?.order as number) ?? 999;
		return orderA - orderB;
	});

	logger.info(`Loaded ${sections.length} documentation sections`);
	return sections;
}

function extractTitle(content: string): string | undefined {
	const titleMatch = content.match(/^#\s+(.+)$/m);
	return titleMatch?.[1]?.trim();
}

function extractDescription(content: string): string | undefined {
	// Skip heading and get first paragraph
	const lines = content.split("\n");
	let inParagraph = false;
	const paragraphLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip headings, empty lines, and imports before first paragraph
		if (
			trimmed.startsWith("#") ||
			trimmed.startsWith("import") ||
			(trimmed === "" && !inParagraph)
		) {
			continue;
		}

		// Skip JSX-like elements
		if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
			continue;
		}

		// Start of paragraph
		if (trimmed !== "" && !inParagraph) {
			inParagraph = true;
		}

		// End of paragraph
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

// Build navigation structure from meta.json
export async function getNavigationStructure(): Promise<object> {
	const rootMeta = await loadMeta(DOCS_ROOT);

	if (!rootMeta?.pages) {
		return { sections: [] };
	}

	const sections = [];

	for (const page of rootMeta.pages) {
		const sectionPath = path.join(DOCS_ROOT, page);
		const sectionMeta = await loadMeta(sectionPath);

		if (sectionMeta) {
			sections.push({
				name: page,
				title: sectionMeta.title ?? page,
				icon: sectionMeta.icon,
				pages: sectionMeta.pages ?? [],
			});
		}
	}

	return { sections };
}

// List directory contents for path exploration
export async function listDocsDirectory(
	dirPath: string,
): Promise<{ dirs: string[]; files: string[]; meta: MetaJson | null }> {
	const fullPath = path.join(DOCS_ROOT, dirPath);

	// Security: prevent path traversal
	const resolvedPath = path.resolve(fullPath);
	if (!resolvedPath.startsWith(path.resolve(DOCS_ROOT))) {
		logger.error("Path traversal attempt detected", { path: dirPath });
		return { dirs: [], files: [], meta: null };
	}

	try {
		const entries = await fs.readdir(fullPath, { withFileTypes: true });
		const dirs: string[] = [];
		const files: string[] = [];

		for (const entry of entries) {
			if (entry.name === "meta.json") continue;

			if (entry.isDirectory()) {
				dirs.push(entry.name + "/");
			} else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
				files.push(entry.name);
			}
		}

		// Load meta for ordering
		const meta = await loadMeta(fullPath);

		// Sort by meta.pages order if available
		if (meta?.pages) {
			const order = meta.pages;
			files.sort((a, b) => {
				const aBase = a.replace(/\.(md|mdx)$/, "");
				const bBase = b.replace(/\.(md|mdx)$/, "");
				const aIdx = order.indexOf(aBase);
				const bIdx = order.indexOf(bBase);
				if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
				if (aIdx === -1) return 1;
				if (bIdx === -1) return -1;
				return aIdx - bIdx;
			});
			dirs.sort((a, b) => {
				const aBase = a.replace(/\/$/, "");
				const bBase = b.replace(/\/$/, "");
				const aIdx = order.indexOf(aBase);
				const bIdx = order.indexOf(bBase);
				if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
				if (aIdx === -1) return 1;
				if (bIdx === -1) return -1;
				return aIdx - bIdx;
			});
		}

		return { dirs, files, meta };
	} catch (error) {
		logger.debug("Directory not found", { path: dirPath });
		return { dirs: [], files: [], meta: null };
	}
}

// Get available top-level paths for documentation
export async function getAvailablePaths(): Promise<string> {
	const { dirs, files, meta } = await listDocsDirectory("");

	const lines = ["Available documentation paths:", ""];

	if (meta?.title) {
		lines.push(`Documentation: ${meta.title}`);
		lines.push("");
	}

	if (dirs.length > 0) {
		lines.push("Sections:");
		for (const d of dirs) {
			const sectionMeta = await loadMeta(
				path.join(DOCS_ROOT, d.replace(/\/$/, "")),
			);
			const title = sectionMeta?.title ?? d.replace(/\/$/, "");
			lines.push(`- ${d} (${title})`);
		}
		lines.push("");
	}

	if (files.length > 0) {
		lines.push("Files:");
		lines.push(...files.map((f) => `- ${f}`));
	}

	return lines.filter(Boolean).join("\n");
}

// Read specific documentation path
export async function readDocPath(
	docPath: string,
): Promise<
	{ found: true; content: string } | { found: false; suggestion: string }
> {
	const fullPath = path.join(DOCS_ROOT, docPath);

	// Security: prevent path traversal
	const resolvedPath = path.resolve(fullPath);
	if (!resolvedPath.startsWith(path.resolve(DOCS_ROOT))) {
		return { found: false, suggestion: "Invalid path" };
	}

	try {
		const stats = await fs.stat(fullPath);

		if (stats.isDirectory()) {
			const { dirs, files, meta } = await listDocsDirectory(docPath);

			const lines = [`## Directory: ${docPath}`];

			if (meta?.title) {
				lines.push(`**${meta.title}**`);
			}
			lines.push("");

			if (dirs.length > 0) {
				lines.push("### Subdirectories:");
				for (const d of dirs) {
					const subMeta = await loadMeta(
						path.join(fullPath, d.replace(/\/$/, "")),
					);
					lines.push(`- [${subMeta?.title ?? d}](${docPath}/${d})`);
				}
				lines.push("");
			}

			if (files.length > 0) {
				lines.push("### Files:");
				lines.push(...files.map((f) => `- ${docPath}/${f}`));
			}

			return { found: true, content: lines.filter(Boolean).join("\n") };
		}

		// It's a file - read and strip MDX
		const raw = await fs.readFile(fullPath, "utf-8");
		const { content: rawContent, data: frontmatter } = matter(raw);
		const content = stripMdxComponents(rawContent);

		// Add frontmatter info to output
		const header = [];
		if (frontmatter.title) header.push(`# ${frontmatter.title}`);
		if (frontmatter.description) header.push(`\n${frontmatter.description}\n`);

		return { found: true, content: header.join("") + "\n" + content };
	} catch {
		const availablePaths = await getAvailablePaths();
		return {
			found: false,
			suggestion: `Path "${docPath}" not found.\n\n${availablePaths}`,
		};
	}
}
