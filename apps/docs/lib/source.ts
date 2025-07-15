import { loader } from "fumadocs-core/source";
import { HomeIcon, icons } from "lucide-react";
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
