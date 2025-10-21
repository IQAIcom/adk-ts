"use client";

import { Bot, SendHorizonal, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { askAgent } from "./_actions";

type Message = {
	role: "user" | "agent";
	content: string;
	id: string;
};

export const Demo = () => {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const chatRef = useRef<HTMLDivElement>(null);

	const generateId = () =>
		crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 10);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!input.trim() || isLoading) return;

		const userMessage: Message = {
			id: generateId(),
			role: "user",
			content: input,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		try {
			const result = await askAgent(input);
			const agentMessage: Message = {
				id: generateId(),
				role: "agent",
				content: result,
			};
			setMessages((prev) => [...prev, agentMessage]);
		} catch (error) {
			console.error("Error:", error);
			setMessages((prev) => [
				...prev,
				{
					id: generateId(),
					role: "agent",
					content: "❌ Something went wrong.",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: Trigger when messages update
	useEffect(() => {
		if (chatRef.current) {
			chatRef.current.scrollTo({
				top: chatRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [messages]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					size="lg"
					variant="default"
					className="flex w-full sm:w-auto items-center gap-2 border-primary transition-all duration-200 hover:scale-[1.02]"
				>
					<Bot className="w-5 h-5" />
					Try Demo
				</Button>
			</SheetTrigger>

			<SheetContent className="flex flex-col h-full sm:max-w-md w-full">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
						<Sparkles className="w-4 h-4 text-primary" />
						Agent Demo
					</SheetTitle>
					<SheetDescription className="text-muted-foreground text-sm sm:text-base">
						Chat with an AI agent for a{" "}
						<span className="text-primary">joke</span> or{" "}
						<span className="text-primary">weather update</span>, powered by{" "}
						<strong>ADK-TS</strong>.
					</SheetDescription>
				</SheetHeader>

				<div
					ref={chatRef}
					className="flex-1 overflow-y-auto mt-4 sm:mt-6 px-3 sm:px-5 space-y-3 sm:space-y-4 border border-border/50 rounded-lg bg-muted/10 p-3 sm:p-4 mx-2 sm:mx-5 scroll-smooth"
				>
					{messages.length === 0 && (
						<p className="text-center text-sm text-muted-foreground mt-4 sm:mt-6">
							Ask something like “Tell me a joke” or “What’s the weather like
							today?”
						</p>
					)}

					{messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex items-start gap-2 transition-opacity duration-300 ${
								msg.role === "user" ? "justify-end" : "justify-start"
							}`}
						>
							{msg.role === "agent" && (
								<div className="p-2 rounded-full bg-primary/10">
									<Bot className="w-4 h-4 text-primary" />
								</div>
							)}

							<div
								className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2 text-sm leading-relaxed ${
									msg.role === "user"
										? "bg-primary text-primary-foreground rounded-br-none"
										: "bg-card border border-border text-muted-foreground rounded-bl-none"
								}`}
							>
								{msg.content}
							</div>

							{msg.role === "user" && (
								<div className="p-2 rounded-full bg-primary/10">
									<User className="w-4 h-4 text-primary" />
								</div>
							)}
						</div>
					))}

					{isLoading && (
						<div className="flex items-start gap-2 justify-start">
							<div className="p-2 rounded-full bg-primary/10">
								<Bot className="w-4 h-4 text-primary" />
							</div>
							<div className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-muted-foreground flex items-center gap-1">
								<span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
								<span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
								<span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" />
							</div>
						</div>
					)}
				</div>

				<form
					onSubmit={handleSubmit}
					className="mt-3 sm:mt-4 px-3 sm:px-5 pb-3 sm:pb-4 space-y-2 sm:space-y-3 border-t border-border/50 pt-3 bg-background"
				>
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message..."
						disabled={isLoading}
						className="min-h-[70px] sm:min-h-[80px] resize-none border-border focus:ring-2 focus:ring-primary transition-all text-sm sm:text-base"
					/>
					<Button
						type="submit"
						size="lg"
						disabled={!input.trim() || isLoading}
						className="w-full flex items-center justify-center gap-2"
					>
						{isLoading ? (
							<span className="animate-pulse">Thinking...</span>
						) : (
							<>
								<SendHorizonal className="w-4 h-4" />
								Send
							</>
						)}
					</Button>
				</form>
			</SheetContent>
		</Sheet>
	);
};
