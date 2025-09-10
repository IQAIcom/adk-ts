import type { Agent } from "@/app/(dashboard)/_schema";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface AgentsPanelProps {
	agents: Agent[];
	selectedAgent: Agent | null;
	onSelectAgent: (agent: Agent) => void;
}

export function AgentsPanel({
	agents,
	selectedAgent,
	onSelectAgent,
}: AgentsPanelProps) {
	return (
		<Card className="lg:col-span-1">
			<CardHeader>
				<CardTitle>Available Agents ({agents.length})</CardTitle>
				<CardDescription>Select an agent to start testing</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[calc(100vh-300px)]">
					{agents.length === 0 ? (
						<EmptyAgentsState />
					) : (
						<div className="space-y-2 p-4">
							{agents.map((agent) => (
								<AgentItem
									key={agent.relativePath}
									agent={agent}
									isSelected={
										selectedAgent?.relativePath === agent.relativePath
									}
									onSelect={() => onSelectAgent(agent)}
								/>
							))}
						</div>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function EmptyAgentsState() {
	return (
		<div className="p-6 text-center text-muted-foreground">
			<Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
			<p>No agents found</p>
			<p className="text-sm">Create agent files to get started</p>
		</div>
	);
}

interface AgentItemProps {
	agent: Agent;
	isSelected: boolean;
	onSelect: () => void;
}

function AgentItem({ agent, isSelected, onSelect }: AgentItemProps) {
	return (
		<button
			type="button"
			className={cn(
				"w-full p-3 rounded-lg border cursor-pointer transition-colors text-left",
				isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted",
			)}
			onClick={onSelect}
		>
			<div className="flex items-center justify-between">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<p className="font-medium truncate">{agent.name}</p>
					</div>
					<p className="text-sm text-muted-foreground truncate">
						{agent.relativePath}
					</p>
				</div>
			</div>
		</button>
	);
}

interface StatusIndicatorProps {
	status?: "running" | "stopped" | "error";
}

function StatusIndicator({ status }: StatusIndicatorProps) {
	const getStatusColor = () => {
		switch (status) {
			case "running":
				return "bg-green-500";
			case "error":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	return <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />;
}
