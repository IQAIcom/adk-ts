"use client";

import { Bot, MessageSquare, Paperclip, User as UserIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Message as ChatMessage } from "@/app/(dashboard)/_schema";
import { ConversationAutoScroll } from "@/components/ai-elements/conversation-auto-scroll";
import {
	Message,
	MessageAvatar,
	MessageContent,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputButton,
	PromptInputMicButton,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatAttachments } from "@/hooks/use-chat-attachments";
import useVoiceRecording from "@/hooks/use-voice-recording";
import { getAudioUnsupportedMessage } from "@/lib/model-capabilities";
import { cn } from "@/lib/utils";
import type { AgentListItemDto as Agent } from "../Api";

interface ChatPanelProps {
	selectedAgent: Agent | null;
	messages: ChatMessage[];
	onSendMessage: (message: string, attachments?: File[]) => void;
	isSendingMessage?: boolean;
	isLoading?: boolean;
}

export function ChatPanel({
	selectedAgent,
	messages,
	onSendMessage,
	isSendingMessage = false,
	isLoading = false,
}: ChatPanelProps) {
	const [inputMessage, setInputMessage] = useState("");
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	// Scroll handled by ConversationAutoScroll
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

	// Infer model name from agent name or path
	// This is a best-effort approach; we can enhance this later with actual model info from backend
	// Handles:
	// - Direct model names in agent name: "gpt-4o-agent", "gemini-agent"
	// - OpenRouter format in path: "agents/openai-gpt-4o-agent"
	// - Common patterns: "gpt4o", "gemini-2.5", etc.
	const inferredModelName = useMemo(() => {
		if (!selectedAgent) return null;

		const name = selectedAgent.name.toLowerCase();
		const path = selectedAgent.relativePath?.toLowerCase() || "";
		const combined = `${name} ${path}`;

		// Check for OpenRouter format patterns (provider/model)
		if (
			combined.includes("openai/gpt-4o") ||
			combined.includes("openai/gpt4o")
		) {
			return "openai/gpt-4o";
		}
		if (combined.includes("google/gemini")) {
			return "google/gemini-2.5-flash";
		}

		// Check for direct model patterns in agent name
		if (name.includes("gpt-4o") || name.includes("gpt4o")) return "gpt-4o";
		if (name.includes("gemini")) {
			// Try to extract specific version if present
			const geminiMatch = name.match(/gemini[-\s]?([\d.]+)?/);
			if (geminiMatch?.[1]) {
				return `gemini-${geminiMatch[1]}`;
			}
			return "gemini-2.5-flash";
		}
		if (name.includes("gpt-4") || name.includes("gpt4")) return "gpt-4";
		if (name.includes("gpt-3.5")) return "gpt-3.5-turbo";
		if (name.includes("claude")) return "claude-3-5-sonnet";

		// Check path for model indicators
		if (path.includes("gpt-4o") || path.includes("gpt4o")) return "gpt-4o";
		if (path.includes("gemini")) return "gemini-2.5-flash";

		return null;
	}, [selectedAgent]);

	const {
		recording,
		error,
		transcribedText,
		isTranscribing,
		startRecording,
		stopRecording,
		clearAudio,
		audioSupported,
	} = useVoiceRecording({ modelName: inferredModelName });

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

	const handleVoiceRecording = async () => {
		if (recording) {
			// Stop recording and get both the audio file and transcript
			const { file, transcript, hasValidTranscript } = await stopRecording();

			if (file) {
				// Check if we have valid transcription
				if (!hasValidTranscript) {
					toast.error(
						"Transcription failed or is too short. Please try speaking more clearly or use text input.",
					);
					clearAudio();
					return;
				}

				// Use the transcribed text as the message
				const messageText = transcript?.trim() || "";

				if (!messageText) {
					toast.error("No transcription available. Please try again.");
					clearAudio();
					return;
				}

				// Send the transcribed text along with the audio file
				// The agent receives the text message, and optionally the audio file as attachment
				onSendMessage(messageText, [file]);
				clearAudio();
			} else {
				toast.error("No audio was recorded");
			}
		} else {
			// Start recording (transcription starts automatically)
			await startRecording();
		}
	};

	// Show error toast if recording fails
	useEffect(() => {
		if (error) {
			toast.error(error);
			clearAudio();
		}
	}, [error, clearAudio]);

	// Scroll logic moved to ConversationAutoScroll

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
				{/* Scroll container for conversation */}
				<ConversationAutoScroll
					scrollerClassName="max-h-[calc(100vh-203px)] w-full mx-auto bg-repeat heropattern-jigsaw-red-100"
					contentClassName="max-w-4xl mx-auto"
					messageCount={messages.length}
					resetKey={selectedAgent?.name ?? ""}
					jumpOffsetClassName="bottom-4"
				>
					{messages.length === 0 ? (
						<div className="flex flex-col items-center justify-center min-h-100 text-center text-muted-foreground">
							<MessageSquare className="h-12 w-12 mb-4 opacity-50" />
							<h3 className="text-lg font-medium mb-2">Start a conversation</h3>
							<p className="text-sm">
								Send a message to {selectedAgent.name} to get started
							</p>
						</div>
					) : (
						<>
							{messages.map((message) => (
								<Message
									from={message.type === "user" ? "user" : "assistant"}
									key={`from-${message.type === "user" ? "user" : "assistant"}-${message.id}`}
								>
									<MessageContent
										className={cn(
											"md:min-w-35",
											message.type === "user" ? "text-right" : "",
										)}
									>
										{(message.type === "assistant" ||
											message.type === "user") && (
											<div className="px-2 pb-1 text-[11px] w-full uppercase tracking-wide text-muted-foreground">
												{message.type === "assistant"
													? message.author || selectedAgent.name || "Assistant"
													: "You"}
											</div>
										)}
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
											message.type === "user"
												? "You"
												: message.author || selectedAgent.name || "Assistant"
										}
									/>
								</Message>
							))}

							{recording && (
								<>
									<Message from="user" key="recording">
										<MessageContent>
											<div className="px-2 text-sm">
												{transcribedText ? (
													<>
														<span className="text-foreground">
															{transcribedText}
														</span>
														{isTranscribing && (
															<span className="ml-2 inline-block w-2 h-4 bg-primary animate-pulse" />
														)}
													</>
												) : (
													<span className="italic animate-pulse text-muted-foreground">
														{isTranscribing
															? "Listening and transcribing..."
															: "Recording..."}
													</span>
												)}
											</div>
										</MessageContent>
										<MessageAvatar
											icon={<UserIcon className="size-4" />}
											name="You"
										/>
									</Message>
									<Message from="assistant" key="listening">
										<MessageContent>
											<Response className="px-2 italic animate-pulse text-sm text-muted-foreground">
												Listening...
											</Response>
										</MessageContent>
										<MessageAvatar
											icon={<Bot className="size-4" />}
											name={selectedAgent.name || "Assistant"}
										/>
									</Message>
								</>
							)}

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

							{/* Bottom sentinel handled by ConversationAutoScroll */}
						</>
					)}
				</ConversationAutoScroll>
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
					<section
						className={cn(
							"relative w-full max-w-4xl mx-auto transition-all duration-200",
							isDragOver && "bg-accent/10 border-accent rounded-lg p-2",
						)}
						aria-label="Message input drop zone"
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
								disabled={isLoading || isSendingMessage}
							/>
							<PromptInputToolbar>
								<PromptInputTools>
									{/* Simplified Attachment Button */}
									<PromptInputButton
										onClick={handleFileAttach}
										className="transition-colors hover:bg-accent hover:text-accent-foreground"
										title="Attach files"
										disabled={isLoading || isSendingMessage}
									>
										<Paperclip className="size-4" />
									</PromptInputButton>
								</PromptInputTools>
								<div>
									{audioSupported ? (
										<PromptInputMicButton
											variant={"secondary"}
											status={{ recording }}
											onClick={handleVoiceRecording}
											disabled={isLoading || isSendingMessage}
										/>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<PromptInputMicButton
														variant={"secondary"}
														onClick={() => {
															// Show tooltip message
															toast.error(
																getAudioUnsupportedMessage(inferredModelName),
															);
														}}
														disabled={true}
													/>
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p className="max-w-xs">
													{getAudioUnsupportedMessage(inferredModelName)}
												</p>
											</TooltipContent>
										</Tooltip>
									)}
									<PromptInputSubmit
										status={isSendingMessage ? "streaming" : "ready"}
										disabled={
											(!inputMessage.trim() && attachedFiles.length === 0) ||
											isSendingMessage ||
											isLoading
										}
									/>
								</div>
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
					</section>
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
						<div className="w-24 h-24 mx-auto mb-4 rounded-full bg-linear-to-br from-primary/20 to-accent/30 flex items-center justify-center">
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
