import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import type { HTMLAttributes } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
	from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
	<div
		className={cn(
			"group flex w-full items-end justify-end gap-2 py-4",
			from === "user" ? "is-user" : "is-assistant flex-row-reverse justify-end",
			"[&>div]:max-w-[80%]",
			className,
		)}
		{...props}
	/>
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
	children,
	className,
	...props
}: MessageContentProps) => (
	<div
		className={cn(
			"flex flex-col gap-2 rounded-lg text-sm text-foreground px-4 py-3 overflow-hidden",
			"group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
			"group-[.is-assistant]:bg-secondary group-[.is-assistant]:text-foreground",
			className,
		)}
		{...props}
	>
		<div className="is-user:dark">{children}</div>
	</div>
);

export type MessageAvatarProps = HTMLAttributes<HTMLDivElement> & {
	/** icon to render inside the avatar (required for icon-only use) */
	icon?: React.ReactNode;
	/** optional fallback name rendered as text when no icon */
	name?: string;
};

export const MessageAvatar = ({
	icon,
	name,
	className,
	...props
}: MessageAvatarProps) => (
	<div
		role="img"
		aria-label={name}
		className={cn(
			"size-8 ring-1 ring-border flex items-center justify-center rounded-full bg-muted text-muted-foreground",
			className,
		)}
		{...props}
	>
		{icon ?? <span className="font-medium">{name?.slice(0, 3) || "ME"}</span>}
	</div>
);
