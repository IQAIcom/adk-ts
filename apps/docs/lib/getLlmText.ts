import type { InferPageType } from "fumadocs-core/source";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { source } from "@/lib/source";

export async function getLlmText(page: InferPageType<typeof source>) {
	try {
		const filePath = join(process.cwd(), "content/docs", page.path);
		const fileContent = await readFile(filePath, "utf-8");
		const { content } = matter(fileContent);

		return content;
	} catch (error) {
		console.error(`Failed to read MDX file for ${page.path}:`, error);

		return [
			`# ${page.data.title}`,
			`URL: ${page.url}`,
			"",
			page.data.description || "",
		].join("\n");
	}
}
