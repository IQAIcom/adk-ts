import { cn } from "@/lib/utils";
import type { Agent } from "../_schema";

interface AgentCardProps {
	agent: Agent;
	isSelected: boolean;
	onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, isSelected, onSelect }: AgentCardProps) {
	return (
		<button
			type="button"
			className={cn(
				"w-full p-3 rounded-lg border cursor-pointer transition-colors text-left",
				isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted",
			)}
			onClick={() => onSelect(agent)}
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
