import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Trash2, Eye, EyeOff, Loader, AlertTriangle } from '@/components/ui/animated-icon';
import { useMemorySettings } from './hooks/useMemorySettings';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * MemoryManager Component
 * Displays user's conversation memories with ability to view, toggle, and delete
 */
export const MemoryManager = ({ userEmail }) => {
	const {
		memories,
		loading,
		error,
		total,
		currentPage,
		totalPages,
		hasNextPage,
		hasPrevPage,
		fetchMemories,
		toggleMemoryInclusion,
		deleteMemory,
		clearAllMemories,
	} = useMemorySettings(userEmail);

	const [deletingId, setDeletingId] = useState(null);
	const [togglingId, setTogglingId] = useState(null);
	const [clearingAll, setClearingAll] = useState(false);
	const [showClearConfirm, setShowClearConfirm] = useState(false);

	// Load memories on mount
	useEffect(() => {
		if (userEmail) {
			fetchMemories(0);
		}
	}, [userEmail, fetchMemories]);

	const handleToggle = async (memoryId, included) => {
		setTogglingId(memoryId);
		try {
			await toggleMemoryInclusion(memoryId, included);
		} finally {
			setTogglingId(null);
		}
	};

	const handleDelete = async (memoryId) => {
		setDeletingId(memoryId);
		try {
			await deleteMemory(memoryId);
		} finally {
			setDeletingId(null);
		}
	};

	const handleClearAll = async () => {
		setClearingAll(true);
		try {
			await clearAllMemories();
			setShowClearConfirm(false);
		} finally {
			setClearingAll(false);
		}
	};

	const handlePrevPage = () => {
		if (hasPrevPage) {
			fetchMemories(currentPage - 1);
		}
	};

	const handleNextPage = () => {
		if (hasNextPage) {
			fetchMemories(currentPage + 1);
		}
	};

	// Loading state
	if (loading && memories.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader className="h-6 w-6 animate-spin text-primary" />
				<span className="ml-2 text-sm text-muted-foreground">Loading memories...</span>
			</div>
		);
	}

	// Empty state
	if (!loading && memories.length === 0) {
		return (
			<div className="py-8 text-center">
				<AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<p className="text-sm text-muted-foreground">
					No memories yet. Start a search or research to build your memory history.
				</p>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<Card className="p-4 border-red-200 bg-red-50">
				<div className="flex items-start gap-2">
					<AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
					<div>
						<p className="font-medium text-red-900">Error loading memories</p>
						<p className="text-sm text-red-800 mt-1">{error}</p>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Memories List */}
			<div className="space-y-3 max-h-[50vh] sm:max-h-96 overflow-y-auto">
				{memories.map((memory) => {
					const summary = memory.summary || {};
					const isIncluded = memory.includedInContext !== false;
					const isToggling = togglingId === memory.$id;
					const isDeleting = deletingId === memory.$id;

					return (
						<Card
							key={memory.$id}
							className={`p-4 transition-opacity ${
								!isIncluded ? 'opacity-50 bg-muted/30' : ''
							}`}
						>
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
								<div className="flex-1 min-w-0">
									<h4 className="font-medium text-sm truncate text-foreground">
										{summary.topic || 'Untitled Conversation'}
									</h4>
									<p className="text-xs text-muted-foreground mt-1">
										{new Date(memory.createdAt).toLocaleDateString()} •{' '}
										{memory.conversationType === 'research' ? 'Deep Research' : 'Search'}
									</p>

									{/* Key Findings Preview */}
									{summary.keyFindings && summary.keyFindings.length > 0 && (
										<div className="mt-2 text-xs text-muted-foreground">
											<p className="font-medium mb-1">Key findings:</p>
											<ul className="list-disc list-inside space-y-0.5">
												{summary.keyFindings.slice(0, 2).map((finding, idx) => (
													<li key={idx} className="truncate">
														{finding}
													</li>
												))}
												{summary.keyFindings.length > 2 && (
													<li className="text-muted-foreground/70">
														+{summary.keyFindings.length - 2} more
													</li>
												)}
											</ul>
										</div>
									)}
								</div>

								{/* Action Buttons */}
							<div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
									{/* Toggle Include/Exclude */}
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleToggle(memory.$id, isIncluded)}
										disabled={isToggling}
										title={
											isIncluded
												? 'Exclude from context'
												: 'Include in context'
										}
										className="h-8 w-8 p-0"
									>
										{isToggling ? (
											<Loader className="h-4 w-4 animate-spin" />
										) : isIncluded ? (
											<Eye className="h-4 w-4" />
										) : (
											<EyeOff className="h-4 w-4 text-muted-foreground" />
										)}
									</Button>

									{/* Delete Button */}
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												disabled={isDeleting}
												className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
											>
												{isDeleting ? (
													<Loader className="h-4 w-4 animate-spin" />
												) : (
													<Trash2 className="h-4 w-4" />
												)}
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogTitle>Delete Memory</AlertDialogTitle>
											<AlertDialogDescription>
												This action cannot be undone. This conversation will be removed from your
												memory.
											</AlertDialogDescription>
											<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => handleDelete(memory.$id)}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													Delete
												</AlertDialogAction>
											</div>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60">
					<p className="text-xs text-muted-foreground">
						Page {currentPage + 1} of {totalPages} ({total} total)
					</p>
					<div className="flex w-full sm:w-auto gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevPage}
							disabled={!hasPrevPage}
							className="flex-1 sm:flex-none"
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleNextPage}
							disabled={!hasNextPage}
							className="flex-1 sm:flex-none"
						>
							Next
						</Button>
					</div>
				</div>
			)}

			{/* Clear All Button */}
			{total > 0 && (
				<AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
						>
							Clear All Memories
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogTitle>Clear All Memories?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all {total} conversation memory/memories. This action cannot be
							undone.
						</AlertDialogDescription>
						<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleClearAll}
								disabled={clearingAll}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{clearingAll ? (
									<>
										<Loader className="h-4 w-4 animate-spin mr-2" />
										Clearing...
									</>
								) : (
									'Clear All'
								)}
							</AlertDialogAction>
						</div>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
};

export default MemoryManager;
