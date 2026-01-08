import type { InferPageType } from "fumadocs-core/source";
import { source } from "@/lib/source";
import { readFile } from "fs/promises";
import { join } from "path";

export async function getLlmText(page: InferPageType<typeof source>) {
	try {
		// Read the actual MDX file content from the filesystem
		const filePath = join(process.cwd(), "content/docs", page.path);
		const content = await readFile(filePath, "utf-8");
		return content;
	} catch (error) {
		// Fallback to metadata if file read fails
		console.error(`Failed to read MDX file for ${page.path}:`, error);
		return `# ${page.data.title}
URL: ${page.url}

${page.data.description || ""}`;
	}
}
