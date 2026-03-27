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
			className={`relative border-b landing-border p-6 sm:p-10 lg:p-16 ${className}`}
		>
			{children}
		</section>
	);
}
