import { Bot } from "lucide-react";

export function EmptyAgentsState() {
	return (
		<div className="p-6 text-center text-muted-foreground">
			<Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
			<p>No agents found</p>
			<p className="text-sm">Create agent files to get started</p>
		</div>
	);
}
