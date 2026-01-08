"use client";

import * as PageTree from "fumadocs-core/page-tree";
import { DocsLayout, type DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export function DocsLayoutClient({
	children,
	tree,
	...props
}: Omit<DocsLayoutProps, "tree"> & {
	tree: PageTree.Root;
	children: ReactNode;
}) {
	return (
		<DocsLayout
			{...props}
			tree={tree}
			sidebar={{
				tabs: {
					transform(option, node) {
						// Basic transform without server calls
						// Icon styling is handled at this level
						return option;
					},
				},
			}}
		>
			{children}
		</DocsLayout>
	);
}
