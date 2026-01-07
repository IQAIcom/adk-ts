import { getLlmText } from "@/lib/getLlmText";
import { source, type Page } from "@/lib/source";

// cached forever
export const revalidate = false;

export async function GET() {
	const pages = source.getPages() as Page[];
	const scan = pages.map(getLlmText);
	const scanned = await Promise.all(scan);

	return new Response(scanned.join("\n\n"));
}
