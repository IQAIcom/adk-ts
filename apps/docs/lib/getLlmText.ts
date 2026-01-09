import type { InferPageType } from "fumadocs-core/source";
import { source } from "@/lib/source";
import { readFile } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";

export async function getLlmText(page: InferPageType<typeof source>) {
	try {
		// Read the actual MDX file content from the filesystem
		// The path construction now includes content files in production via outputFileTracingIncludes
		const filePath = join(process.cwd(), "content/docs", page.path);
		const fileContent = await readFile(filePath, "utf-8");
		const { content } = matter(fileContent);
		return content;
	} catch (error) {
		// Fallback to metadata if file read fails
		console.error(`Failed to read MDX file for ${page.path}:`, error);
		return `# ${page.data.title}
URL: ${page.url}

${page.data.description || ""}`;
	}
}
