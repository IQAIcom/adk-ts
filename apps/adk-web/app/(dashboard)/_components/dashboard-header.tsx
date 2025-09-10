import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
	apiUrl: string;
	connected: boolean;
}

export function DashboardHeader({ apiUrl, connected }: DashboardHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6">
			<div>
				<h1 className="text-3xl font-bold">🤖 ADK-TS Web</h1>
				<p className="text-muted-foreground">Connected to {apiUrl}</p>
			</div>
			<div className="flex items-center gap-4">
				<ThemeToggle />
				<Badge
					variant="outline"
					className={
						connected
							? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
							: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
					}
				>
					{connected ? "Connected" : "Disconnected"}
				</Badge>
			</div>
		</div>
	);
}
