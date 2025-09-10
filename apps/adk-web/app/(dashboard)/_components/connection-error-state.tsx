import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Bot } from "lucide-react";

interface ConnectionErrorStateProps {
	apiUrl: string;
	onRetry: () => void;
}

export function ConnectionErrorState({
	apiUrl,
	onRetry,
}: ConnectionErrorStateProps) {
	return (
		<div className="container mx-auto p-8">
			<div className="max-w-2xl mx-auto text-center">
				<Bot className="h-16 w-16 mx-auto mb-4" />
				<h1 className="text-3xl font-bold mb-4">ADK-TS Web</h1>
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Failed to connect to ADK server at {apiUrl}. Make sure the server is
						running.
					</AlertDescription>
				</Alert>
				<Button onClick={onRetry} className="mt-4">
					Retry Connection
				</Button>
			</div>
		</div>
	);
}
