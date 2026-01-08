import type { InferPageType } from "fumadocs-core/source";
import { source } from "@/lib/source";

export async function getLlmText(page: InferPageType<typeof source>) {
	return `# ${page.data.title}
URL: ${page.url}

${page.data.description || ""}`;
}
