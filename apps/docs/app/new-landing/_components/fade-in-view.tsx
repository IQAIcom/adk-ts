"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface FadeInViewProps {
	children: ReactNode;
	className?: string;
	/** Additional inline styles (merged with animation styles) */
	style?: React.CSSProperties;
	/** Delay in seconds before the animation starts */
	delay?: number;
	/** Duration of the transition in seconds */
	duration?: number;
	/** Vertical offset in pixels */
	y?: number;
	/** Only animate once (default true) */
	once?: boolean;
}

/**
 * Lightweight viewport-triggered fade-in using IntersectionObserver + CSS transitions.
 * Replaces motion.div whileInView entrance animations without any animation library.
 */
export function FadeInView({
	children,
	className = "",
	style: styleProp,
	delay = 0,
	duration = 0.6,
	y = 20,
	once = true,
}: FadeInViewProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [isVisible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					if (once) observer.disconnect();
				} else if (!once) {
					setVisible(false);
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [once]);

	return (
		<div
			ref={ref}
			className={className}
			style={{
				...styleProp,
				opacity: isVisible ? 1 : 0,
				transform: isVisible ? "translateY(0)" : `translateY(${y}px)`,
				transition: `opacity ${duration}s ease, transform ${duration}s ease`,
				transitionDelay: `${delay}s`,
				willChange: isVisible ? "auto" : "opacity, transform",
			}}
		>
			{children}
		</div>
	);
}
