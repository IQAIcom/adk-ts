import { getLlmText } from "@/lib/getLlmText";
import { source } from "@/lib/source";

// cached forever
export const revalidate = false;

export async function GET() {
	const scan = source.getPages().map(getLlmText);
	const scanned = await Promise.all(scan);

	return new Response(scanned.join("\n\n"));
}
