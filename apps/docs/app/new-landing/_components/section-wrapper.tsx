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
				"relative border-b border-[#FFFFFF33] landing-border px-2 py-10 md:px-6 md:py-20 lg:px-16 lg:py-24",
				className,
			)}
		>
			{children}
		</section>
	);
}
