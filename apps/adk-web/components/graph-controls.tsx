"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Eye, EyeOff, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface GraphControlsProps {
	searchTerm: string;
	nodeTypeFilter: string;
	toolCategoryFilter: string;
	showControls: boolean;
	onSearchChange: (value: string) => void;
	onNodeTypeChange: (value: string) => void;
	onToolCategoryChange: (value: string) => void;
	onControlsToggle: (show: boolean) => void;
	onClearFilters: () => void;
	onFitView?: () => void;
}

export function GraphControls({
	searchTerm,
	nodeTypeFilter,
	toolCategoryFilter,
	showControls,
	onSearchChange,
	onNodeTypeChange,
	onToolCategoryChange,
	onControlsToggle,
	onClearFilters,
	onFitView,
}: GraphControlsProps) {
	return (
		<>
			{/* Control Panel */}
			{showControls && (
				<div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg max-w-sm">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">Graph Controls</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onControlsToggle(false)}
								className="h-6 w-6 p-0"
							>
								<EyeOff className="h-4 w-4" />
							</Button>
						</div>

						{/* Search */}
						<div className="space-y-2">
							<label
								htmlFor="search-input"
								className="text-xs font-medium text-muted-foreground"
							>
								Search
							</label>
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="search-input"
									placeholder="Search nodes..."
									value={searchTerm}
									onChange={(e) => onSearchChange(e.target.value)}
									className="pl-8 h-8 text-xs"
								/>
							</div>
						</div>

						{/* Node Type Filter */}
						<div className="space-y-2">
							<label
								htmlFor="node-type-filter"
								className="text-xs font-medium text-muted-foreground"
							>
								Node Type
							</label>
							<Select value={nodeTypeFilter} onValueChange={onNodeTypeChange}>
								<SelectTrigger id="node-type-filter" className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Nodes</SelectItem>
									<SelectItem value="agent">Agents Only</SelectItem>
									<SelectItem value="tool">Tools Only</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Tool Category Filter */}
						<div className="space-y-2">
							<label
								htmlFor="tool-category-filter"
								className="text-xs font-medium text-muted-foreground"
							>
								Tool Category
							</label>
							<Select
								value={toolCategoryFilter}
								onValueChange={onToolCategoryChange}
							>
								<SelectTrigger
									id="tool-category-filter"
									className="h-8 text-xs"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									<SelectItem value="search">Search Tools</SelectItem>
									<SelectItem value="data">Data Tools</SelectItem>
									<SelectItem value="api">API Tools</SelectItem>
									<SelectItem value="file">File Tools</SelectItem>
									<SelectItem value="ai">AI Tools</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={onClearFilters}
								className="flex-1 h-8 text-xs"
							>
								Clear Filters
							</Button>
							{onFitView && (
								<Button
									variant="outline"
									size="sm"
									onClick={onFitView}
									className="h-8 px-3 text-xs"
									title="Fit to view"
								>
									<Maximize2 className="h-3 w-3" />
								</Button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Show Controls Button */}
			{!showControls && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => onControlsToggle(true)}
					className="absolute top-4 right-4 z-10 h-8"
				>
					<Eye className="h-4 w-4 mr-2" />
					Show Controls
				</Button>
			)}
		</>
	);
}

// Hook for managing graph controls state and URL persistence
export function useGraphControls() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Initialize state from URL parameters
	const [searchTerm, setSearchTerm] = useState(
		searchParams.get("search") || "",
	);
	const [nodeTypeFilter, setNodeTypeFilter] = useState<string>(
		searchParams.get("nodeType") || "all",
	);
	const [toolCategoryFilter, setToolCategoryFilter] = useState<string>(
		searchParams.get("toolCategory") || "all",
	);
	const [showControls, setShowControls] = useState(
		searchParams.get("showControls") !== "false",
	);

	// Update URL when state changes
	const updateURL = (updates: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams.toString());

		Object.entries(updates).forEach(([key, value]) => {
			if (value === null || value === "" || value === "all") {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		});

		const newURL = params.toString()
			? `?${params.toString()}`
			: window.location.pathname;
		router.replace(newURL, { scroll: false });
	};

	// Handle search term changes
	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		updateURL({ search: value });
	};

	// Handle node type filter changes
	const handleNodeTypeChange = (value: string) => {
		setNodeTypeFilter(value);
		updateURL({ nodeType: value });
	};

	// Handle tool category filter changes
	const handleToolCategoryChange = (value: string) => {
		setToolCategoryFilter(value);
		updateURL({ toolCategory: value });
	};

	// Handle controls visibility changes
	const handleControlsToggle = (show: boolean) => {
		setShowControls(show);
		updateURL({ showControls: show.toString() });
	};

	// Clear all filters
	const clearFilters = () => {
		setSearchTerm("");
		setNodeTypeFilter("all");
		setToolCategoryFilter("all");
		updateURL({ search: null, nodeType: null, toolCategory: null });
	};

	// Sync state with URL parameters when they change externally
	useEffect(() => {
		const search = searchParams.get("search") || "";
		const nodeType = searchParams.get("nodeType") || "all";
		const toolCategory = searchParams.get("toolCategory") || "all";
		const showControlsParam = searchParams.get("showControls");

		if (search !== searchTerm) setSearchTerm(search);
		if (nodeType !== nodeTypeFilter) setNodeTypeFilter(nodeType);
		if (toolCategory !== toolCategoryFilter)
			setToolCategoryFilter(toolCategory);
		if (
			showControlsParam !== null &&
			showControlsParam !== showControls.toString()
		) {
			setShowControls(showControlsParam !== "false");
		}
	}, [
		searchParams,
		searchTerm,
		nodeTypeFilter,
		toolCategoryFilter,
		showControls,
	]);

	return {
		searchTerm,
		nodeTypeFilter,
		toolCategoryFilter,
		showControls,
		handleSearchChange,
		handleNodeTypeChange,
		handleToolCategoryChange,
		handleControlsToggle,
		clearFilters,
	};
}
