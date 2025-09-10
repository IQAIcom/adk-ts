"use client";

import { useCallback, useState } from "react";
import type { Agent, Message } from "../_schema";

export function useChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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

	const selectAgent = useCallback((agent: Agent) => {
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
