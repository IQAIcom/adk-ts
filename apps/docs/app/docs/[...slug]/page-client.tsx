"use client";

import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";
import type { ReactNode } from "react";

export interface DocsPageClientProps {
	title: string;
	description?: string;
	toc: any[];
	full?: boolean;
	children: ReactNode;
}

export function DocsPageClient({
	title,
	description,
	toc,
	full,
	children,
}: DocsPageClientProps) {
	return (
		<DocsPage toc={toc} full={full}>
			<DocsTitle>{title}</DocsTitle>
			<DocsDescription className="!mb-0">{description}</DocsDescription>
			<DocsBody>{children}</DocsBody>
		</DocsPage>
	);
}
