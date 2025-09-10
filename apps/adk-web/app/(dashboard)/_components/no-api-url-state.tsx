import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react";

export function NoApiUrlState() {
	return (
		<div className="container mx-auto p-8">
			<div className="max-w-2xl mx-auto text-center">
				<Bot className="h-16 w-16 mx-auto mb-4" />
				<h1 className="text-3xl font-bold mb-4">ADK-TS Web</h1>
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This interface needs to be launched from the ADK CLI. Run{" "}
						<code className="bg-muted px-1 py-0.5 rounded">adk web</code> to
						start.
					</AlertDescription>
				</Alert>
			</div>
		</div>
	);
}
