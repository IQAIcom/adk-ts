import { Badge } from "@/components/ui/badge";

interface HeaderProps {
	apiUrl: string;
}

export function Header({ apiUrl }: HeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6">
			<div>
				<h1 className="text-3xl font-bold">🤖 ADK-TS Web</h1>
				<p className="text-muted-foreground">Connected to {apiUrl}</p>
			</div>
			<Badge
				variant="outline"
				className="bg-green-50 text-green-700 border-green-200"
			>
				Connected
			</Badge>
		</div>
	);
}
