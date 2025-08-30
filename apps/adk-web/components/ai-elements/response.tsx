"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

const defaultComponents = {
	pre: ({ className, children, ...props }: any) => (
		<pre
			className={cn(
				"bg-card border border-border rounded-lg p-4 overflow-x-auto text-sm",
				"text-card-foreground",
				className,
			)}
			{...props}
		>
			{children}
		</pre>
	),
	code: ({ className, children, ...props }: any) => {
		// Inline code (not in a pre block)
		if (!className?.includes("language-")) {
			return (
				<code
					className={cn(
						"bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-sm font-mono",
						className,
					)}
					{...props}
				>
					{children}
				</code>
			);
		}
		// Code block (inside pre)
		return (
			<code
				className={cn("font-mono text-card-foreground", className)}
				{...props}
			>
				{children}
			</code>
		);
	},
};

export const Response = memo(
	({ className, components, ...props }: ResponseProps) => (
		<Streamdown
			className={cn(
				"size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
				className,
			)}
			components={{
				...defaultComponents,
				...components,
			}}
			{...props}
		/>
	),
	(prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
