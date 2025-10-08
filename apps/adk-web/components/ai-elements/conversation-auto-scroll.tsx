"use client";

import { ArrowDown } from "lucide-react";
import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Conversation, ConversationContent } from "./conversation";

export interface ConversationAutoScrollProps
	extends React.HTMLAttributes<HTMLDivElement> {
	contentClassName?: string;
	scrollerClassName?: string;
	// Whether to show a loading message sentinel as part of content (optional/ignored here)
	isSendingMessage?: boolean;
	// Used to trigger auto-scroll when message count changes
	messageCount: number;
	// Optional: resets scroll on context change (e.g., agent switch)
	resetKey?: string | number | null;
	// Offset from bottom where the jump button should float
	jumpOffsetClassName?: string; // e.g., "bottom-16"
}

export interface ConversationAutoScrollHandle {
	scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export const ConversationAutoScroll = forwardRef<
	ConversationAutoScrollHandle,
	ConversationAutoScrollProps
>(
	(
		{
			className,
			scrollerClassName,
			contentClassName,
			isSendingMessage,
			messageCount,
			resetKey,
			children,
			jumpOffsetClassName = "bottom-16",
			...rest
		},
		ref,
	) => {
		const bottomRef = useRef<HTMLDivElement | null>(null);
		const [isAtBottom, setIsAtBottom] = useState(true);
		const [showJumpToLatest, setShowJumpToLatest] = useState(false);

		const computeIsAtBottom = (el: HTMLElement | null) => {
			if (!el) return true;
			const threshold = 40; // px tolerance
			return (
				Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= threshold
			);
		};

		const scrollToBottom = useCallback(
			(behavior: ScrollBehavior = "smooth") => {
				bottomRef.current?.scrollIntoView({ behavior, block: "end" });
			},
			[],
		);

		useImperativeHandle(ref, () => ({ scrollToBottom }), [scrollToBottom]);

		const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
			setIsAtBottom(computeIsAtBottom(e.currentTarget));
		};

		// Auto-scroll when new messages arrive
		useEffect(() => {
			if (isAtBottom) {
				scrollToBottom(messageCount <= 1 ? "auto" : "smooth");
			}
		}, [messageCount, isAtBottom, scrollToBottom]);

		// Reset on context change
		useEffect(() => {
			// reference resetKey in dep list
			void resetKey;
			setIsAtBottom(true);
			requestAnimationFrame(() => scrollToBottom("auto"));
		}, [resetKey, scrollToBottom]);

		// Flicker-safe show/hide
		useEffect(() => {
			const SHOW_DELAY = 300;
			const HIDE_DELAY = 200;
			let showTimer: ReturnType<typeof setTimeout> | undefined;
			let hideTimer: ReturnType<typeof setTimeout> | undefined;

			if (!isAtBottom) {
				showTimer = setTimeout(() => setShowJumpToLatest(true), SHOW_DELAY);
				if (hideTimer) clearTimeout(hideTimer);
			} else {
				hideTimer = setTimeout(() => setShowJumpToLatest(false), HIDE_DELAY);
				if (showTimer) clearTimeout(showTimer);
			}

			return () => {
				if (showTimer) clearTimeout(showTimer);
				if (hideTimer) clearTimeout(hideTimer);
			};
		}, [isAtBottom]);

		return (
			<div className={cn("relative", className)} {...rest}>
				<Conversation
					onScroll={handleScroll}
					className={cn("overflow-y-auto", scrollerClassName)}
				>
					<ConversationContent className={contentClassName}>
						{children}
					</ConversationContent>
					<div ref={bottomRef} />
				</Conversation>

				{showJumpToLatest && (
					<div
						className={cn(
							"absolute left-1/2 -translate-x-1/2 z-10",
							jumpOffsetClassName,
						)}
					>
						<Button
							aria-label="Jump to latest"
							size="icon"
							variant="secondary"
							className="rounded-full backdrop-blur-md bg-background/60 border border-border/50 shadow-md hover:bg-background/80"
							onClick={() => scrollToBottom("smooth")}
						>
							<ArrowDown className="size-4" />
						</Button>
					</div>
				)}
			</div>
		);
	},
);

ConversationAutoScroll.displayName = "ConversationAutoScroll";
