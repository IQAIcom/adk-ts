import { Bot, Loader2 } from "lucide-react";

export function LoadingState() {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
				<p>Connecting to ADK server...</p>
			</div>
		</div>
	);
}
