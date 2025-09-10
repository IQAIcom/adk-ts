import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import Image from "next/image";

interface LoadingStateProps {
	message: string;
}

export function LoadingState({ message }: LoadingStateProps) {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
				<p>{message}</p>
			</div>
		</div>
	);
}

interface ErrorStateProps {
	title: string;
	message: string;
	actionLabel?: string;
	onAction?: () => void;
}

export function ErrorState({
	title,
	message,
	actionLabel,
	onAction,
}: ErrorStateProps) {
	return (
		<div className="min-h-screen flex items-center justify-center p-8">
			<div className="max-w-2xl w-full text-center">
				<div className="flex items-center justify-center mb-6">
					<div className="relative">
						<Image
							src="/adk.png"
							alt="ADK Logo"
							width={80}
							height={80}
							className="dark:hidden"
						/>
						<Image
							src="/dark-adk.png"
							alt="ADK Logo"
							width={80}
							height={80}
							className="hidden dark:block"
						/>
					</div>
				</div>
				<h1 className="text-3xl font-bold mb-4">{title}</h1>
				<Alert className="max-w-xl mx-auto text-left">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{message}</AlertDescription>
				</Alert>
				{actionLabel && onAction && (
					<Button
						onClick={onAction}
						variant="outline"
						className="mt-4 inline-flex items-center gap-2"
					>
						<RotateCcw className="h-4 w-4" />
						{actionLabel}
					</Button>
				)}

				{/* Quick instructions to run ADK Web locally */}
				<div className="mt-6 text-left max-w-xl mx-auto">
					<p className="text-sm font-medium mb-2">How to run ADK Web locally</p>
					<div className="rounded-md border p-4 bg-muted/30">
						<p className="text-sm mb-2">1. Install the CLI:</p>
						<pre className="bg-background p-2 rounded text-xs overflow-auto">
							<code>npm install -g @iqai/adk-cli</code>
						</pre>
						<p className="text-sm mt-3 mb-2">2. Start the web interface:</p>
						<pre className="bg-background p-2 rounded text-xs overflow-auto">
							<code>adk web</code>
						</pre>
						<p className="text-sm mt-3 mb-2">Optional:</p>
						<ul className="list-disc pl-5 text-sm space-y-1">
							<li>
								Use specific API server port: <code>adk web --port 8080</code>
							</li>
							<li>
								Custom web app port:{" "}
								<code>adk web --local --web-port 3000</code>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
