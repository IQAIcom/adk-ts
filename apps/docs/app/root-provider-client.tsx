"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

export function RootProviderClient({ children }: { children: ReactNode }) {
	return <RootProvider>{children}</RootProvider>;
}
