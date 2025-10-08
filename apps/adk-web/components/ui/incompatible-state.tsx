"use client";

import { AlertTriangle, Copy } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function IncompatibleState({
	cliVersion,
	minCliVersion,
}: {
	cliVersion: string | null;
	minCliVersion: string | null;
}) {
	const [copied, setCopied] = useState(false);
	const cmd = "npm install -g @iqai/adk-cli@latest";
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(cmd);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch (err) {
			console.error("Failed to copy command:", err);
		}
	};

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
				<h1 className="text-3xl font-bold mb-4">Incompatible CLI Version</h1>
				<Alert className="max-w-xl mx-auto text-left">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						Your installed ADK CLI version {cliVersion ?? "unknown"} is not
						compatible with this web app. Please update to at least version{" "}
						{minCliVersion ?? "(see docs)"}.
					</AlertDescription>
				</Alert>
				<div className="mt-6 text-left max-w-xl mx-auto">
					<p className="text-sm font-medium mb-2">Update the CLI:</p>
					<div className="flex items-center gap-2">
						<pre className="bg-background p-2 rounded text-xs overflow-auto flex-1">
							<code>{cmd}</code>
						</pre>
						<Button variant="outline" size="icon" onClick={copy}>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
					{copied && (
						<p className="text-xs text-muted-foreground mt-1">Copied</p>
					)}
					<p className="text-sm mt-4">
						After updating, restart the CLI and relaunch the web UI:{" "}
						<code>adk web</code>
					</p>
				</div>
			</div>
		</div>
	);
}
