"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type AgentListItemDto,
	type AgentsListResponseDto,
	Api,
	type EventItemDto,
	type EventsResponseDto,
} from "../Api";
import type { Message } from "../app/(dashboard)/_schema";
import { useApiUrl } from "./use-api-url";

export function useAgents(currentSessionId?: string | null) {
	const queryClient = useQueryClient();
	const apiUrl = useApiUrl();
	const apiClient = useMemo(() => new Api({ baseUrl: apiUrl }), [apiUrl]);
	const [selectedAgent, setSelectedAgent] = useState<AgentListItemDto | null>(
		null,
	);
	const [messages, setMessages] = useState<Message[]>([]);

	// Fetch available agents
	const {
		data: agents = [],
		isLoading: loading,
		error,
		refetch: refreshAgents,
	} = useQuery({
		queryKey: ["agents", apiUrl],
		queryFn: async (): Promise<AgentListItemDto[]> => {
			if (!apiClient) throw new Error("API URL is required");
			const res = await apiClient.api.agentsControllerListAgents();
			const data: AgentsListResponseDto = res.data;
			return data.agents;
		},
		enabled: !!apiClient,
		staleTime: 30000,
		retry: 2,
	});

	// Fetch messages for selected agent and session
	const { data: sessionEvents } = useQuery({
		queryKey: [
			"agent-messages",
			apiUrl,
			selectedAgent?.relativePath,
			currentSessionId,
		],
		queryFn: async (): Promise<EventsResponseDto> => {
			if (!apiClient || !selectedAgent || !currentSessionId) {
				return { events: [], totalCount: 0 };
			}
			const res = await apiClient.api.eventsControllerGetEvents(
				encodeURIComponent(selectedAgent.relativePath),
				currentSessionId,
			);
			return res.data as EventsResponseDto;
		},
		enabled: !!apiClient && !!selectedAgent && !!currentSessionId,
		staleTime: 10000,
	});

	useEffect(() => {
		if (!selectedAgent) return;

		if (sessionEvents?.events) {
			const asMessages: Message[] = sessionEvents.events
				.map((ev: EventItemDto) => {
					let text = "";

					if (isEventContent(ev.content)) {
						const textParts = ev.content.parts
							.filter(isTextPart)
							.map((p) => p.text);

						text = textParts.join("").trim();
					}

					return {
						id: ev.timestamp,
						type: ev.author === "user" ? "user" : "assistant",
						content: text,
						timestamp: new Date(ev.timestamp * 1000),
						author: ev.author,
					} as Message;
				})
				.filter((m) => m.content.length > 0);

			setMessages(asMessages);
		} else if (!currentSessionId) {
			setMessages([]);
		}
	}, [sessionEvents, selectedAgent, currentSessionId]);

	// Send message mutation
	const sendMessageMutation = useMutation({
		mutationFn: async ({
			agent,
			message,
			attachments,
		}: {
			agent: AgentListItemDto;
			message: string;
			attachments?: File[];
		}) => {
			const userMessage: Message = {
				id: Date.now(),
				type: "user",
				content: message,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, userMessage]);

			// Handle attachments
			const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
			let encodedAttachments:
				| Array<{ name: string; mimeType: string; data: string }>
				| undefined;

			if (attachments?.length) {
				const tooLarge = attachments.filter(
					(f) => f.size > MAX_FILE_SIZE_BYTES,
				);
				if (tooLarge.length) {
					toast.error(
						`Some files exceed ${Math.round(
							MAX_FILE_SIZE_BYTES / (1024 * 1024),
						)}MB and were skipped: ${tooLarge.map((f) => f.name).join(", ")}`,
					);
				}

				const filesToProcess = attachments.filter(
					(f) => f.size <= MAX_FILE_SIZE_BYTES,
				);

				const fileToBase64 = (file: File) =>
					new Promise<string>((resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => {
							const result = reader.result as string;
							resolve(result.includes(",") ? result.split(",")[1] : result);
						};
						reader.onerror = () => reject(reader.error);
						reader.readAsDataURL(file);
					});

				encodedAttachments = await Promise.all(
					filesToProcess.map(async (file) => ({
						name: file.name,
						mimeType:
							file.type && file.type !== "application/octet-stream"
								? file.type
								: "text/plain",
						data: await fileToBase64(file),
					})),
				);
			}

			const body = { message, attachments: encodedAttachments };
			if (!apiClient) throw new Error("API client not ready");

			try {
				const res = await apiClient.api.messagingControllerPostAgentMessage(
					encodeURIComponent(agent.relativePath),
					body,
				);
				return res.data;
			} catch (e: any) {
				setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
				const msg =
					e?.message ||
					("status" in (e ?? {}) && (e as any).statusText) ||
					"Failed to send message";
				toast.error(msg);
				throw new Error(msg);
			}
		},
		onSuccess: () => {
			if (currentSessionId && selectedAgent) {
				queryClient.invalidateQueries({
					queryKey: [
						"agent-messages",
						apiUrl,
						selectedAgent.relativePath,
						currentSessionId,
					],
				});
			}
		},
		onError: (error) => {
			console.error(error);
			toast.error("Failed to send message. Please try again.");
		},
	});

	// Select agent
	const selectAgent = useCallback(
		(agent: AgentListItemDto) => {
			if (selectedAgent) {
				try {
					queryClient.cancelQueries({
						queryKey: ["agent-messages", apiUrl, selectedAgent.relativePath],
					});
				} catch {}
			}
			setSelectedAgent(agent);
		},
		[apiUrl, queryClient, selectedAgent],
	);

	const sendMessage = useCallback(
		(message: string, attachments?: File[]) => {
			if (!selectedAgent) return;
			sendMessageMutation.mutate({
				agent: selectedAgent,
				message,
				attachments,
			});
		},
		[selectedAgent, sendMessageMutation],
	);

	return {
		agents,
		selectedAgent,
		messages,
		agentStatus: {},
		connected: !!apiUrl,
		loading,
		error,
		sendMessage,
		selectAgent,
		refreshAgents,
		isSendingMessage: sendMessageMutation.isPending,
	};
}

interface TextPart {
	text: string;
}

interface EventContent {
	parts: unknown[];
}

/** ✅ Type Guards */
function isEventContent(value: unknown): value is EventContent {
	return (
		typeof value === "object" &&
		value !== null &&
		Array.isArray((value as any).parts)
	);
}

function isTextPart(value: unknown): value is TextPart {
	return (
		typeof value === "object" &&
		value !== null &&
		"text" in value &&
		typeof (value as any).text === "string"
	);
}
