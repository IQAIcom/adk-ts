import { ChevronDown, ChevronRight, Edit, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface StateCardProps {
	stateKey: string;
	value: any;
	onUpdate: (key: string, value: any) => Promise<void>;
	onDelete: (key: string) => Promise<void>;
}

function ValueRenderer({ value, depth = 0 }: { value: any; depth?: number }) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (value === null) {
		return <span className="text-muted-foreground italic">null</span>;
	}

	if (value === undefined) {
		return <span className="text-muted-foreground italic">undefined</span>;
	}

	if (typeof value === "boolean") {
		return (
			<span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
		);
	}

	if (typeof value === "number") {
		return <span className="text-green-600 dark:text-green-400">{value}</span>;
	}

	if (typeof value === "string") {
		return (
			<span className="text-orange-600 dark:text-orange-400">"{value}"</span>
		);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-muted-foreground">[]</span>;
		}

		return (
			<div className="space-y-1">
				<Button
					onClick={() => setIsExpanded(!isExpanded)}
					className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground hover:bg-transparent flex items-center gap-1"
					variant="ghost"
					type="button"
				>
					{isExpanded ? (
						<ChevronDown className="h-3 w-3" />
					) : (
						<ChevronRight className="h-3 w-3" />
					)}
					<span>Array [{value.length}]</span>
				</Button>

				{isExpanded && (
					<div className="ml-4 space-y-1 border-l border-border/50 pl-3 overflow-x-auto max-w-full">
						{value.map((item, index) => (
							<div key={`item-${index + 1}`}>
								<ValueRenderer value={item} depth={depth + 1} />
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	if (typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0) {
			return <span className="text-muted-foreground">{"{}"}</span>;
		}

		return (
			<div className="space-y-1">
				<Button
					onClick={() => setIsExpanded(!isExpanded)}
					className="h-auto p-0 font-normal text-xs text-muted-foreground hover:text-foreground hover:bg-transparent flex items-center gap-1"
					variant="ghost"
					type="button"
				>
					{isExpanded ? (
						<ChevronDown className="h-3 w-3" />
					) : (
						<ChevronRight className="h-3 w-3" />
					)}
					<span>Object {`{${entries.length}}`}</span>
				</Button>

				{isExpanded && (
					<div className="ml-4 space-y-1 border-l border-border/50 pl-3 overflow-x-auto max-w-full">
						{entries.map(([key, val]) => (
							<div key={key} className="flex gap-2">
								<span className="text-purple-600 dark:text-purple-400 text-xs font-medium min-w-fit">
									{key}:
								</span>
								<div className="flex-1">
									<ValueRenderer value={val} depth={depth + 1} />
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	return <span>{String(value)}</span>;
}

export function StateCard({
	stateKey,
	value,
	onUpdate,
	onDelete,
}: StateCardProps) {
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");

	const startEditing = (key: string, value: any) => {
		setEditingKey(key);
		setEditValue(JSON.stringify(value, null, 2));
	};

	const cancelEditing = () => {
		setEditingKey(null);
		setEditValue("");
	};

	const handleSave = async () => {
		try {
			const parsedValue = JSON.parse(editValue);
			await onUpdate(stateKey, parsedValue);
			toast.success(`State "${stateKey}" updated successfully!`);
			setEditingKey(null);
			setEditValue("");
		} catch {
			toast.error(
				"Invalid JSON format. Please check your syntax and try again.",
			);
		}
	};

	const handleDelete = async () => {
		try {
			await onDelete(stateKey);
			toast.success(`State "${stateKey}" deleted successfully!`);
		} catch {
			toast.error(`Failed to delete state "${stateKey}". Please try again.`);
		}
	};

	return (
		<Card className="border border-border/50 w-full overflow-hidden">
			<CardHeader>
				<div className="flex items-center justify-between min-w-0">
					<CardTitle className="font-mono text-muted-foreground truncate min-w-0">
						{stateKey}
					</CardTitle>
					<div className="flex items-center gap-0.5 shrink-0">
						<CardAction>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 hover:bg-muted/60"
								onClick={() => startEditing(stateKey, value)}
							>
								<Edit className="h-3 w-3" />
							</Button>
						</CardAction>
						<CardAction>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
								onClick={handleDelete}
							>
								<X className="h-3 w-3" />
							</Button>
						</CardAction>
					</div>
				</div>
			</CardHeader>

			<CardContent className="w-full overflow-auto max-h-[400px]">
				{editingKey === stateKey ? (
					<div className="space-y-2">
						<Textarea
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							rows={2}
							className="font-mono text-xs min-h-[60px] resize-y"
							placeholder="Enter valid JSON..."
						/>
						<div className="flex justify-end gap-1">
							<Button
								variant="outline"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={cancelEditing}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleSave}
							>
								Save
							</Button>
						</div>
					</div>
				) : (
					<div className="text-xs bg-muted/40 p-3 rounded-sm border border-border/30 overflow-auto max-h-[300px] w-full">
						<div>
							<ValueRenderer value={value} />
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
