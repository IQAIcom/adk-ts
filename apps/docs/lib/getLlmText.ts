import { remarkInclude } from "fumadocs-mdx/config";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { type Page } from "@/lib/source";

const processor = remark()
	.use(remarkMdx)
	// needed for Fumadocs MDX
	.use(remarkInclude)
	.use(remarkGfm);

export async function getLlmText(page: Page) {
	const content = await page.data.getText("raw");
	const processed = await processor.process({
		path: page.data.info.fullPath,
		value: content,
	});

	return `# ${page.data.title}
URL: ${page.url}

${page.data.description}

${processed.value}`;
}
