"use client";

import { ConnectionStatus } from "@/components/connection-status";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Bot } from "lucide-react";
import type { AgentListItemDto as Agent } from "../Api";

interface NavbarProps {
	apiUrl: string;
	agents: Agent[];
	selectedAgent: Agent | null;
	onSelectAgent: (agent: Agent) => void;
}

export function Navbar({
	apiUrl,
	agents,
	selectedAgent,
	onSelectAgent,
}: NavbarProps) {
	return (
		<nav className="border-b bg-background/95 backdrop-blur h-[60px] supports-[backdrop-filter]:bg-background/60">
			<div className="px-4 py-3">
				<div className="flex items-center justify-between">
					{/* Connection Status */}
					<ConnectionStatus apiUrl={apiUrl} />

					{/* Agent Selector */}
					<div className="flex items-center space-x-3">
						{agents.length > 0 && (
							<div className="flex items-center space-x-2">
								<Select
									value={selectedAgent?.relativePath || ""}
									onValueChange={(value) => {
										const agent = agents.find((a) => a.relativePath === value);
										if (agent) onSelectAgent(agent);
									}}
								>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Select an agent">
											{selectedAgent && (
												<div className="flex items-center space-x-1.5 justify-between">
													<Bot className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="text-sm">{selectedAgent.name}</span>
												</div>
											)}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{agents.map((agent) => (
											<SelectItem
												key={agent.relativePath}
												value={agent.relativePath}
											>
												<div className="flex items-center space-x-2">
													<span>{agent.name}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<ThemeToggle />
					</div>
				</div>
			</div>
		</nav>
	);
}
