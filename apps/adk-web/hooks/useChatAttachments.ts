import { useRef, useState } from "react";
import { toast } from "sonner";

export interface UseChatAttachmentsReturn {
	attachedFiles: File[];
	setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	handleFileAttach: () => void;
	handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleDragOver: (e: React.DragEvent) => void;
	handleDragLeave: (e: React.DragEvent) => void;
	handleDrop: (e: React.DragEvent) => void;
	removeFile: (index: number) => void;
	resetAttachments: () => void;
	isDragOver: boolean;
}

export function useChatAttachments(): UseChatAttachmentsReturn {
	const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileAttach = () => {
		fileInputRef.current?.click();
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			setAttachedFiles((prev) => [...prev, ...files]);
			toast.success(
				`${files.length} file${files.length > 1 ? "s" : ""} attached successfully!`,
			);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		setAttachedFiles((prev) => [...prev, ...files]);
		e.target.value = ""; // Reset input
		if (files.length > 0) {
			toast.success(
				`${files.length} file${files.length > 1 ? "s" : ""} attached successfully!`,
			);
		}
	};

	const removeFile = (index: number) => {
		setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const resetAttachments = () => {
		setAttachedFiles([]);
	};

	return {
		attachedFiles,
		setAttachedFiles,
		fileInputRef,
		handleFileAttach,
		handleFileChange,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		removeFile,
		resetAttachments,
		isDragOver,
	};
}
