"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import { StateCard } from "@/components/state-card";
import { useJsonEditor } from "@/hooks/useJsonEditor";
import { useStatePanel } from "@/hooks/useStatePanel";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { Code2, Edit, Plus, Settings, Wand2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Agent } from "../app/(dashboard)/_schema";

interface StatePanelProps {
	selectedAgent: Agent | null;
	currentSessionId: string | null;
}

export function StatePanel({
	selectedAgent,
	currentSessionId,
}: StatePanelProps) {
	const searchParams = useSearchParams();
	const apiUrlParam = searchParams.get("apiUrl");
	const portParam = searchParams.get("port");
	const apiUrl =
		apiUrlParam ||
		(portParam ? `http://localhost:${portParam}` : "http://localhost:8042");

	const { currentState, updateState, isLoading, error } = useStatePanel(
		apiUrl,
		selectedAgent,
		currentSessionId,
	);

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const jsonEditor = useJsonEditor({
		placeholder: `Enter state as JSON object, e.g.:
{
  "firstName": "John",
  "age": 30,
  "likings": ["dark humour", "dad jokes"],
  "dislikes": ["racism"]
}

⚠️ Important: Use DOUBLE QUOTES (") for ALL strings in JSON`,
	});

	const handleUpdateState = async (path: string, value: any) => {
		try {
			await updateState(path, value);
			toast.success("State updated successfully!");
		} catch (error) {
			toast.error("Failed to update state. Please try again.");
		}
	};

	if (!selectedAgent || !currentSessionId) {
		return (
			<div className="h-full flex flex-col bg-background">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						<Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>Select an agent and session to view state</p>
					</div>
				</div>
			</div>
		);
	}

	const stateEntries = Object.entries(currentState?.sessionState || {});

	const handleDeleteState = async (key: string) => {
		await handleUpdateState(key, undefined);
	};

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Header */}
			<div className="p-4 border-b">
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button
							size="sm"
							className="w-full"
							onClick={() => {
								const existing = currentState?.sessionState || {};
								const jsonString =
									Object.keys(existing).length > 0
										? JSON.stringify(existing, null, 2)
										: '{\n  "name": "John Doe",\n  "age": 30,\n  "preferences": ["item1", "item2"]\n}';
								jsonEditor.reset(jsonString);
								setIsDialogOpen(true);
							}}
						>
							{Object.keys(currentState?.sessionState || {}).length > 0 ? (
								<Edit className="h-4 w-4 mr-1" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							{Object.keys(currentState?.sessionState || {}).length > 0
								? "Edit State"
								: "Add State"}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{Object.keys(currentState?.sessionState || {}).length > 0
									? "Edit State"
									: "Add State"}
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label>State (JSON)</Label>
								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={jsonEditor.fix}
										className="h-8 px-2"
										title="Fix quotes (convert single to double)"
									>
										<Wand2 className="h-3 w-3 mr-1" />
										Fix Quotes
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={jsonEditor.format}
										className="h-8 px-2"
										title="Format JSON"
									>
										<Code2 className="h-3 w-3 mr-1" />
										Format
									</Button>
								</div>
							</div>
							<div className="relative">
								<CodeEditor
									value={jsonEditor.value}
									language="json"
									placeholder={jsonEditor.placeholder}
									onChange={(evn) => jsonEditor.setValue(evn.target.value)}
									padding={15}
									style={{
										fontSize: 12,
										fontFamily:
											'ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace',
										minHeight: "300px",
									}}
								/>
								{jsonEditor.error && (
									<div className="absolute bottom-2 right-2 text-xs text-destructive bg-background px-2 py-1 rounded border max-w-xs">
										{jsonEditor.error}
									</div>
								)}
							</div>
							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setIsDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={async () => {
										try {
											const parsed = JSON.parse(jsonEditor.value) as Record<
												string,
												any
											>;
											const existing = (currentState?.sessionState ||
												{}) as Record<string, any>;

											// Delete keys that were removed
											const newKeys = new Set(Object.keys(parsed));
											for (const existingKey of Object.keys(existing)) {
												if (!newKeys.has(existingKey)) {
													await updateState(existingKey, undefined);
												}
											}

											// Upsert all provided keys
											for (const [k, v] of Object.entries(parsed)) {
												await updateState(k, v);
											}
											setIsDialogOpen(false);
											jsonEditor.setError(null);
										} catch (e) {
											toast.error(
												"An unexpected error occurred while saving state.",
											);
											jsonEditor.setError("An unexpected error occurred");
										}
									}}
									disabled={!jsonEditor.isValid}
								>
									Save
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Content */}
			<ScrollArea className="flex-1 max-h-[calc(100vh-200px)]">
				<div className="p-4 space-y-3">
					{isLoading ? (
						<div className="text-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
							<p>Loading state...</p>
						</div>
					) : error ? (
						<div className="text-center py-8 text-destructive">
							<p>Error: {error}</p>
						</div>
					) : stateEntries.length === 0 ? (
						<div className="text-center text-muted-foreground py-8">
							<Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="text-sm">No state variables</p>
							<p className="text-xs">Add your first state config above</p>
						</div>
					) : (
						stateEntries.map(([key, value]) => (
							<StateCard
								key={key}
								stateKey={key}
								value={value}
								onUpdate={handleUpdateState}
								onDelete={handleDeleteState}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
