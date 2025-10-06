"use client";

import { AgentListItemDto } from "@/Api";
import { useCallback, useState } from "react";
import type { Message } from "../_schema";

export function useChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedAgent, setSelectedAgent] = useState<AgentListItemDto | null>(
		null,
	);

	const addMessage = useCallback((type: Message["type"], content: string) => {
		setMessages((prev) => [
			...prev,
			{
				id: Date.now(),
				type,
				content,
				timestamp: new Date(),
			},
		]);
	}, []);

	const selectAgent = useCallback((agent: AgentListItemDto) => {
		setSelectedAgent(agent);
		setMessages([
			{
				id: Date.now(),
				type: "system",
				content: `Selected agent: ${agent.name}`,
				timestamp: new Date(),
			},
		]);
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		messages,
		selectedAgent,
		addMessage,
		selectAgent,
		clearMessages,
	};
}
