import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/app/layout.config";

export default function ShowcaseLayout({ children }: { children: ReactNode }) {
	return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
