"use client";

import { SessionCard } from "@/components/session-card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Database, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Session {
	id: string;
	appName: string;
	userId: string;
	state: Record<string, any>;
	eventCount: number;
	lastUpdateTime: number;
	createdAt: number;
}

interface SessionsPanelProps {
	sessions: Session[];
	currentSessionId: string | null;
	onCreateSession: (
		state?: Record<string, any>,
		sessionId?: string,
	) => Promise<void>;
	onDeleteSession: (sessionId: string) => Promise<void>;
	onSwitchSession: (sessionId: string) => Promise<void>;
	isLoading?: boolean;
}

export function SessionsPanel({
	sessions,
	currentSessionId,
	onCreateSession,
	onDeleteSession,
	onSwitchSession,
	isLoading = false,
}: SessionsPanelProps) {
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newSessionState, setNewSessionState] = useState("");
	const [newSessionId, setNewSessionId] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleCreateSession = async () => {
		setIsCreating(true);
		try {
			let state: Record<string, any> | undefined;
			if (newSessionState.trim()) {
				try {
					state = JSON.parse(newSessionState);
				} catch (error) {
					toast.error(
						"Invalid JSON in session state. Using as plain text instead.",
					);
					state = { description: newSessionState };
				}
			}

			const created = await onCreateSession(
				state,
				newSessionId.trim() || undefined,
			);

			toast.success("Session created successfully!");
			setNewSessionState("");
			setNewSessionId("");
			setIsCreateDialogOpen(false);

			// Auto-switch to newly created session if returned with id
			try {
				const createdId = (created as any)?.id ?? newSessionId.trim();
				if (createdId) {
					await onSwitchSession(createdId);
				}
			} catch (e) {
				toast.warning("Session created but failed to switch automatically.");
			}
		} catch (error) {
			toast.error("Failed to create session. Please try again.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteSession = (sessionId: string) => {
		setSessionToDelete(sessionId);
		setIsDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!sessionToDelete) return;

		setIsDeleting(true);
		try {
			await onDeleteSession(sessionToDelete);
			toast.success("Session deleted successfully!");
			setIsDeleteDialogOpen(false);
			setSessionToDelete(null);
		} catch (error) {
			toast.error("Failed to delete session. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCancelDelete = () => {
		setIsDeleteDialogOpen(false);
		setSessionToDelete(null);
	};

	const handleSwitchSession = async (sessionId: string) => {
		try {
			await onSwitchSession(sessionId);
		} catch (error) {
			toast.error("Failed to switch session. Please try again.");
		}
	};

	return (
		<div className="h-full flex flex-col bg-background">
			{/* New Session Button */}
			<div className="p-4 border-b">
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button size="sm" className="w-full">
							<Plus className="h-4 w-4 mr-2" />
							New Session
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Session</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="sessionId">Session ID (optional)</Label>
								<Input
									id="sessionId"
									placeholder="Leave empty for auto-generated ID"
									value={newSessionId}
									onChange={(e) => setNewSessionId(e.target.value)}
								/>
							</div>
							<div>
								<Label htmlFor="sessionState">
									Initial State (JSON, optional)
								</Label>
								<Textarea
									id="sessionState"
									placeholder='{"key": "value"} or leave empty'
									value={newSessionState}
									onChange={(e) => setNewSessionState(e.target.value)}
									rows={3}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setIsCreateDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button onClick={handleCreateSession} disabled={isCreating}>
									{isCreating ? "Creating..." : "Create"}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Session</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this session? This action cannot
							be undone. All session data, including state and conversation
							history, will be permanently removed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={handleCancelDelete}
							disabled={isDeleting}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? <>Deleting...</> : <>Delete</>}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Sessions List */}
			<ScrollArea className="flex-1">
				<div className="p-4 space-y-3">
					{isLoading ? (
						<div className="text-center text-muted-foreground py-8">
							Loading sessions...
						</div>
					) : sessions.length === 0 ? (
						<div className="text-center text-muted-foreground py-8">
							<Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="text-sm">No sessions found</p>
							<p className="text-xs">
								Create your first session to get started
							</p>
						</div>
					) : (
						sessions.map((session) => (
							<SessionCard
								key={session.id}
								session={session}
								active={currentSessionId === session.id}
								onClick={() => handleSwitchSession(session.id)}
								onDelete={() => handleDeleteSession(session.id)}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
