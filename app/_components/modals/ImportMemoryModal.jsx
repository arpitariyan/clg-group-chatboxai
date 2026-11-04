'use client';

import React, { useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Upload } from '@/components/ui/animated-icon';
import { useMemorySettings } from '@/app/_components/hooks/useMemorySettings';

const PROVIDERS = [
	{ value: 'chatgpt', label: 'ChatGPT' },
	{ value: 'claude', label: 'Claude' },
	{ value: 'gemini', label: 'Gemini' },
	{ value: 'generic', label: 'Generic JSON/CSV' },
];

export default function ImportMemoryModal({ isOpen, onClose, userEmail, onImported }) {
	const { previewImport, importMemory, importLoading, importError } = useMemorySettings(userEmail);
	const [provider, setProvider] = useState('chatgpt');
	const [sourceType, setSourceType] = useState('upload');
	const [selectedFile, setSelectedFile] = useState(null);
	const [pastedText, setPastedText] = useState('');
	const [previewData, setPreviewData] = useState(null);
	const [localError, setLocalError] = useState('');
	const [includeInContext, setIncludeInContext] = useState(true);
	const [importResult, setImportResult] = useState(null);

	const disabledImport = useMemo(() => {
		if (sourceType === 'upload') {
			return !selectedFile;
		}
		return !pastedText.trim();
	}, [sourceType, selectedFile, pastedText]);

	const handleFileChange = event => {
		setLocalError('');
		setImportResult(null);
		setPreviewData(null);
		const file = event.target.files?.[0];
		if (!file) {
			setSelectedFile(null);
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			setLocalError('File exceeds 10MB limit.');
			setSelectedFile(null);
			return;
		}

		setSelectedFile(file);
	};

	const handlePreview = async () => {
		setLocalError('');
		setImportResult(null);
		try {
			const data = await previewImport({
				provider,
				sourceType,
				file: selectedFile,
				pastedText,
			});
			setPreviewData(data);
		} catch (error) {
			setLocalError(error.message || 'Preview failed');
		}
	};

	const handleImport = async () => {
		setLocalError('');
		try {
			const data = await importMemory({
				provider,
				sourceType,
				file: selectedFile,
				pastedText,
				includeInContext,
			});
			setImportResult(data);
			if (typeof onImported === 'function') {
				onImported(data);
			}
		} catch (error) {
			setLocalError(error.message || 'Import failed');
		}
	};

	const effectiveError = localError || importError;

	return (
		<Dialog open={isOpen} onOpenChange={open => (!open ? onClose() : null)}>
			<DialogContent className="max-w-2xl border-border/60 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl">
				<DialogHeader>
					<DialogTitle>Import Memory From Other AI Providers</DialogTitle>
					<DialogDescription>
						Import memory exports from ChatGPT, Claude, Gemini, or a generic JSON/CSV format.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-2">
							<label className="text-sm font-medium">Provider</label>
							<Select value={provider} onValueChange={setProvider}>
								<SelectTrigger>
									<SelectValue placeholder="Select provider" />
								</SelectTrigger>
								<SelectContent>
									{PROVIDERS.map(item => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Import mode</label>
							<div className="flex rounded-md border p-1">
								<Button
									type="button"
									variant={sourceType === 'upload' ? 'default' : 'ghost'}
									onClick={() => setSourceType('upload')}
									className="flex-1"
								>
									Upload File
								</Button>
								<Button
									type="button"
									variant={sourceType === 'paste' ? 'default' : 'ghost'}
									onClick={() => setSourceType('paste')}
									className="flex-1"
								>
									Paste Text
								</Button>
							</div>
						</div>
					</div>

					{sourceType === 'upload' ? (
						<div className="space-y-2">
							<label className="text-sm font-medium">Upload export file</label>
							<div className="border rounded-md p-4 bg-muted/30">
								<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
									<Upload className="w-4 h-4" />
									Supported: .json, .csv, .txt, .md (max 10MB)
								</div>
								<Input
									type="file"
									accept=".json,.csv,.txt,.md,text/plain,text/csv,application/json"
									onChange={handleFileChange}
								/>
								{selectedFile && (
									<p className="text-xs text-muted-foreground mt-2">
										Selected: {selectedFile.name}
									</p>
								)}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<label className="text-sm font-medium">Paste conversation memory</label>
							<Textarea
								value={pastedText}
								onChange={e => {
									setPastedText(e.target.value);
									setPreviewData(null);
									setImportResult(null);
								}}
								placeholder="Paste exported content or conversation text here..."
								className="min-h-36"
							/>
						</div>
					)}

					<div className="flex items-center justify-between rounded-md border p-3">
						<div>
							<p className="text-sm font-medium">Include imported memory in context</p>
							<p className="text-xs text-muted-foreground">Enabled by default, like Claude import behavior.</p>
						</div>
						<Switch checked={includeInContext} onCheckedChange={setIncludeInContext} />
					</div>

					{effectiveError && (
						<Card className="p-3 border-red-300 bg-red-50 dark:bg-red-950/20">
							<div className="flex items-start gap-2 text-red-700 dark:text-red-300 text-sm">
								<AlertCircle className="w-4 h-4 mt-0.5" />
								<span>{effectiveError}</span>
							</div>
						</Card>
					)}

					{previewData?.counts && (
						<Card className="p-4 space-y-2 bg-muted/20">
							<p className="text-sm font-medium">Import Preview</p>
							<p className="text-xs text-muted-foreground">
								Total: {previewData.counts.total} | New: {previewData.counts.importable} | Duplicates: {previewData.counts.duplicates}
							</p>
							<div className="max-h-36 overflow-auto space-y-1">
								{previewData.preview?.items?.map((item, idx) => (
									<div key={idx} className="text-xs p-2 rounded border bg-background/50">
										{item.topic} ({item.conversationType})
									</div>
								))}
							</div>
						</Card>
					)}

					{importResult?.counts && (
						<Card className="p-4 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
							<div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300 text-sm">
								<CheckCircle2 className="w-4 h-4 mt-0.5" />
								<div>
									<p className="font-medium">Import completed</p>
									<p className="text-xs mt-1">
										Imported: {importResult.counts.imported} | Skipped duplicates: {importResult.counts.skippedDuplicates}
									</p>
								</div>
							</div>
						</Card>
					)}

					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={importLoading}>
							Close
						</Button>
						<Button type="button" variant="secondary" onClick={handlePreview} disabled={disabledImport || importLoading}>
							{importLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
							Preview
						</Button>
						<Button type="button" onClick={handleImport} disabled={disabledImport || importLoading}>
							{importLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
							Import Memory
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
