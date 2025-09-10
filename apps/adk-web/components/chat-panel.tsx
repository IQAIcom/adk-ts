"use client";

import type { Agent, Message as ChatMessage } from "@/app/(dashboard)/_schema";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageAvatar,
	MessageContent,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputButton,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { cn } from "@/lib/utils";
import { Bot, MessageSquare, Paperclip, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatPanelProps {
	selectedAgent: Agent | null;
	messages: ChatMessage[];
	onSendMessage: (message: string, attachments?: File[]) => void;
	isSendingMessage?: boolean;
}

export function ChatPanel({
	selectedAgent,
	messages,
	onSendMessage,
	isSendingMessage = false,
}: ChatPanelProps) {
	const [inputMessage, setInputMessage] = useState("");
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const {
		attachedFiles,
		fileInputRef,
		handleFileAttach,
		handleFileChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		removeFile,
		resetAttachments,
		isDragOver,
	} = useChatAttachments();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if ((!inputMessage.trim() && attachedFiles.length === 0) || !selectedAgent)
			return;

		onSendMessage(inputMessage, attachedFiles);
		setInputMessage("");
		resetAttachments();
		// Keep focus in the input for rapid follow-ups
		requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
	};

	// Close dropdown when clicking outside (handled by backdrop now)

	if (!selectedAgent) {
		return <EmptyChat />;
	}
	return (
		<div className="relative size-full flex flex-col justify-between h-full">
			<div className="h-full w-full relative text-gray-700">
				{/* Circuit Board - Light Pattern */}
				<div
					className="absolute inset-0 z-0 pointer-events-none"
					style={{
						backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(75, 85, 99, 0.08) 19px, rgba(75, 85, 99, 0.08) 20px, transparent 20px, transparent 39px, rgba(75, 85, 99, 0.08) 39px, rgba(75, 85, 99, 0.08) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(75, 85, 99, 0.08) 19px, rgba(75, 85, 99, 0.08) 20px, transparent 20px, transparent 39px, rgba(75, 85, 99, 0.08) 39px, rgba(75, 85, 99, 0.08) 40px),
        radial-gradient(circle at 20px 20px, rgba(55, 65, 81, 0.12) 2px, transparent 2px),
        radial-gradient(circle at 40px 40px, rgba(55, 65, 81, 0.12) 2px, transparent 2px)
      `,
						backgroundSize: "40px 40px, 40px 40px, 40px 40px, 40px 40px",
					}}
				/>
				<Conversation className="max-h-[calc(100vh-203px)] w-full mx-auto bg-repeat heropattern-jigsaw-red-100">
					<ConversationContent className="max-w-4xl mx-auto">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground">
								<MessageSquare className="h-12 w-12 mb-4 opacity-50" />
								<h3 className="text-lg font-medium mb-2">
									Start a conversation
								</h3>
								<p className="text-sm">
									Send a message to {selectedAgent.name} to get started
								</p>
							</div>
						) : (
							<>
								{messages.map((message) => (
									<Message
										from={message.type === "user" ? "user" : "assistant"}
										key={message.id}
									>
										<MessageContent>
											<Response key={message.id} className="px-2">
												{message.content}
											</Response>
										</MessageContent>
										<MessageAvatar
											icon={
												message.type === "user" ? (
													<UserIcon className="size-4" />
												) : (
													<Bot className="size-4" />
												)
											}
											name={
												message.type === "user" ? "You" : selectedAgent.name
											}
										/>
									</Message>
								))}

								{/* In-conversation loading indicator (appears after user's last message) */}
								{isSendingMessage && (
									<Message from="assistant" key="loading">
										<MessageContent>
											<Response className="px-2 italic animate-pulse text-sm text-muted-foreground">
												Typing...
											</Response>
										</MessageContent>
										<MessageAvatar
											icon={<Bot className="size-4" />}
											name={selectedAgent.name}
										/>
									</Message>
								)}
							</>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>
			</div>

			<div className="border-t">
				<div className="max-w-4xl mx-auto p-4">
					{/* Show attached files above input */}
					{attachedFiles.length > 0 && (
						<div className="py-2">
							<div className="flex flex-wrap gap-2">
								{attachedFiles.map((file: File, index: number) => (
									<div
										key={`${file.name}-${file.size}-${index}`}
										className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm"
									>
										<span className="text-secondary-foreground">
											{file.name}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-4 w-4 text-muted-foreground hover:text-destructive"
											onClick={() => removeFile(index)}
										>
											×
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
					<div
						className={cn(
							"relative w-full max-w-4xl mx-auto transition-all duration-200",
							isDragOver && "bg-accent/10 border-accent rounded-lg p-2",
						)}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<PromptInput onSubmit={handleSubmit} className="w-full">
							<PromptInputTextarea
								ref={inputRef}
								value={inputMessage}
								placeholder={
									isDragOver
										? "Drop files here..."
										: `Message ${selectedAgent.name}...`
								}
								onChange={(e) => setInputMessage(e.target.value)}
							/>
							<PromptInputToolbar>
								<PromptInputTools>
									{/* Simplified Attachment Button */}
									<PromptInputButton
										onClick={handleFileAttach}
										className="transition-colors hover:bg-accent hover:text-accent-foreground"
										title="Attach files"
									>
										<Paperclip className="size-4" />
									</PromptInputButton>
								</PromptInputTools>
								<PromptInputSubmit
									status={isSendingMessage ? "streaming" : "ready"}
									disabled={
										(!inputMessage.trim() && attachedFiles.length === 0) ||
										isSendingMessage
									}
								/>
							</PromptInputToolbar>
						</PromptInput>
						{/* Drag and Drop Overlay */}
						{isDragOver && (
							<div className="absolute inset-0 bg-accent/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
								<div className="text-center">
									<Paperclip className="size-8 mx-auto mb-2 text-primary" />
									<p className="text-sm font-medium text-primary">
										Drop files to attach
									</p>
								</div>
							</div>
						)}
					</div>
					{/* Hidden file input */}
					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={handleFileChange}
						accept="*/*"
					/>
				</div>
			</div>
		</div>
	);
}

function EmptyChat() {
	return (
		<div className="flex flex-col min-h-0 flex-1 h-full">
			{/* Container with borders */}
			<div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full h-full">
				<div className="text-center max-w-md p-8">
					{/* Beautiful illustration placeholder */}
					<div className="mb-8 relative">
						<div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center">
							<MessageSquare className="h-10 w-10 text-primary" />
						</div>
						<div className="absolute top-0 right-1/3 w-3 h-3 bg-primary/40 rounded-full animate-pulse" />
						<div className="absolute top-4 left-1/4 w-2 h-2 bg-accent/50 rounded-full animate-pulse delay-500" />
						<div className="absolute bottom-4 right-1/4 w-4 h-4 bg-secondary/60 rounded-full animate-pulse delay-1000" />
					</div>

					<h3 className="text-xl font-semibold text-foreground mb-3">
						Welcome to ADK Chat
					</h3>
					<p className="text-muted-foreground mb-6 leading-relaxed">
						Choose an AI agent from the dropdown above to start an intelligent
						conversation. Each agent has unique capabilities and expertise.
					</p>
					<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<Bot className="h-4 w-4" />
						<span>Powered by IQ AI</span>
					</div>
				</div>
			</div>
		</div>
	);
}
