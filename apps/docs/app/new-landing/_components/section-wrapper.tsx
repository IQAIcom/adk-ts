import { clsx } from "clsx";
import type { ReactNode } from "react";

interface SectionWrapperProps {
	children: ReactNode;
	className?: string;
	id?: string;
}

export function SectionWrapper({
	children,
	className = "",
	id,
}: SectionWrapperProps) {
	return (
		<section
			id={id}
			className={clsx(
				"relative border-b border-[#FFFFFF33] landing-border p-6 py-10 md:py-20 lg:p-16 lg:py-24",
				className,
			)}
		>
			{children}
		</section>
	);
}
