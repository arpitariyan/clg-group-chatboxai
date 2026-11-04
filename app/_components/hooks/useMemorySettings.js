import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/auth-fetch';

/**
 * Hook for managing conversation memory settings and operations
 * Handles fetching, toggling, and deleting memories
 */
export const useMemorySettings = (userEmail) => {
	const [memories, setMemories] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [total, setTotal] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [importLoading, setImportLoading] = useState(false);
	const [importError, setImportError] = useState(null);

	const pageSize = 10;

	// Fetch memories for user
	const fetchMemories = useCallback(
		async (page = 0) => {
			if (!userEmail) return;

			setLoading(true);
			setError(null);

			try {
				const response = await authFetch(
					`/api/memory/list?userEmail=${encodeURIComponent(userEmail)}&limit=${pageSize}&offset=${page * pageSize}`
				);

				if (!response.ok) {
					throw new Error('Failed to fetch memories');
				}

				const data = await response.json();
				setMemories(data.memories || []);
				setTotal(data.total || 0);
				setCurrentPage(page);
			} catch (err) {
				setError(err.message);
				console.error('Error fetching memories:', err);
			} finally {
				setLoading(false);
			}
		},
		[userEmail]
	);

	// Toggle memory inclusion in context
	const toggleMemoryInclusion = useCallback(
		async (memoryId, includedInContext) => {
			try {
				const response = await authFetch(`/api/memory/${memoryId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ includedInContext: !includedInContext }),
				});

				if (!response.ok) {
					throw new Error('Failed to update memory');
				}

				// Update local state
				setMemories(prevMemories =>
					prevMemories.map(m =>
						m.$id === memoryId ? { ...m, includedInContext: !m.includedInContext } : m
					)
				);
			} catch (err) {
				setError(err.message);
				console.error('Error toggling memory:', err);
				throw err;
			}
		},
		[]
	);

	// Delete a specific memory
	const deleteMemory = useCallback(async (memoryId) => {
		try {
			const response = await authFetch(`/api/memory/${memoryId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete memory');
			}

			// Update local state
			setMemories(prevMemories => prevMemories.filter(m => m.$id !== memoryId));
			setTotal(prev => Math.max(0, prev - 1));
		} catch (err) {
			setError(err.message);
			console.error('Error deleting memory:', err);
			throw err;
		}
	}, []);

	// Clear all memories
	const clearAllMemories = useCallback(async () => {
		if (!userEmail) return;

		try {
			const response = await authFetch('/api/memory/all', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userEmail }),
			});

			if (!response.ok) {
				throw new Error('Failed to clear memories');
			}

			setMemories([]);
			setTotal(0);
			setCurrentPage(0);
		} catch (err) {
			setError(err.message);
			console.error('Error clearing all memories:', err);
			throw err;
		}
	}, [userEmail]);

	// Calculate pagination info
	const totalPages = Math.ceil(total / pageSize);
	const hasNextPage = currentPage < totalPages - 1;
	const hasPrevPage = currentPage > 0;

	const previewImport = useCallback(
		async ({ provider, sourceType = 'upload', file = null, pastedText = '' }) => {
			if (!userEmail) {
				throw new Error('userEmail is required for memory import');
			}

			setImportLoading(true);
			setImportError(null);

			try {
				let response;

				if (sourceType === 'upload') {
					const formData = new FormData();
					formData.append('provider', provider);
					formData.append('userEmail', userEmail);
					formData.append('sourceType', 'upload');
					formData.append('includeInContext', 'true');
					if (file) formData.append('file', file);

					response = await authFetch('/api/memory/import/preview', {
						method: 'POST',
						body: formData,
					});
				} else {
					response = await authFetch('/api/memory/import/preview', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							provider,
							userEmail,
							sourceType: 'paste',
							pastedText,
						}),
					});
				}

				const data = await response.json();
				if (!response.ok) {
					throw new Error(data.error || 'Failed to preview import');
				}

				return data;
			} catch (err) {
				setImportError(err.message);
				throw err;
			} finally {
				setImportLoading(false);
			}
		},
		[userEmail]
	);

	const importMemory = useCallback(
		async ({ provider, sourceType = 'upload', file = null, pastedText = '', includeInContext = true }) => {
			if (!userEmail) {
				throw new Error('userEmail is required for memory import');
			}

			setImportLoading(true);
			setImportError(null);

			try {
				let response;

				if (sourceType === 'upload') {
					const formData = new FormData();
					formData.append('provider', provider);
					formData.append('userEmail', userEmail);
					formData.append('sourceType', 'upload');
					formData.append('includeInContext', includeInContext ? 'true' : 'false');
					if (file) formData.append('file', file);

					response = await authFetch('/api/memory/import', {
						method: 'POST',
						body: formData,
					});
				} else {
					response = await authFetch('/api/memory/import', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							provider,
							userEmail,
							sourceType: 'paste',
							pastedText,
							includeInContext,
						}),
					});
				}

				const data = await response.json();
				if (!response.ok) {
					throw new Error(data.error || 'Failed to import memory');
				}

				await fetchMemories(0);
				return data;
			} catch (err) {
				setImportError(err.message);
				throw err;
			} finally {
				setImportLoading(false);
			}
		},
		[userEmail, fetchMemories]
	);

	return {
		// State
		memories,
		loading,
		error,
		total,
		currentPage,
		pageSize,
		totalPages,
		hasNextPage,
		hasPrevPage,
		importLoading,
		importError,

		// Methods
		fetchMemories,
		toggleMemoryInclusion,
		deleteMemory,
		clearAllMemories,
		previewImport,
		importMemory,
	};
};
