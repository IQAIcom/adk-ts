import { loader } from "fumadocs-core/source";
import type { InferPageType } from "fumadocs-core/source";
import type { TOCItemType } from "fumadocs-core/toc";
import type { MDXContent } from "mdx/types";
import { icons } from "lucide-react";
import { createElement } from "react";
import { docs } from "@/.source";

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
	// it assigns a URL to your pages
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),

	// Icon support for navigation
	icon(icon) {
		if (!icon) {
			return;
		}
		if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
		console.log("icon not found", icon);
	},
});

// Extended page data type that includes fumadocs-mdx DocData and DocMethods
export interface PageData {
	title: string;
	description?: string;
	full?: boolean;
	// DocData from fumadocs-mdx
	body: MDXContent;
	toc: TOCItemType[];
	structuredData: unknown;
	_exports: Record<string, unknown>;
	// DocMethods from fumadocs-mdx
	info: {
		path: string;
		fullPath: string;
	};
	getText: (type: "raw" | "processed") => Promise<string>;
}

export type Page = InferPageType<typeof source> & { data: PageData };
