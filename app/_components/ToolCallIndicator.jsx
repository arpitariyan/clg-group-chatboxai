'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, X, Loader2, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Mail, Send, Download, ExternalLink, FileText, ImageIcon, File as FileIcon } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ToolCallIndicator - Displays inline tool execution status in chat
 * Matches the app's dark theme with subtle accents
 * Includes download buttons for Drive file results
 */
export default function ToolCallIndicator({
  status,
  appName,
  appIcon,
  toolName,
  toolId,
  actionSummary,
  result,
  parameters,
  driveFiles,
  error,
  onConfirm,
  onCancel,
  onRetry,
}) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [canvaProgress, setCanvaProgress] = useState(0);
  const { currentUser } = useAuth();

  const isEmailTool = toolId === 'gmail_send_email' || toolId === 'gmail_reply_email';
  const isDraft = toolId === 'gmail_create_draft';
  const isDriveSearch = toolId === 'drive_search_files' || toolId === 'drive_list_recent_files';
  const isCanvaGenerate = toolId === 'canva_generate_design' || toolId === 'canva_create_design';
  const isCanvaTool = toolId?.startsWith('canva_');

  useEffect(() => {
    if (!isCanvaGenerate || status !== 'loading') {
      setCanvaProgress(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setCanvaProgress((prev) => {
        if (prev >= 100) return 0;
        const increment = prev < 80 ? Math.random() * 2 + 1 : Math.random() * 0.5 + 0.1;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isCanvaGenerate, status]);

  // Clean error messages — strip raw JSON and show human-readable text
  const cleanErrorMessage = (err) => {
    if (!err) return 'An error occurred';
    let msg = String(err);
    const apiMatch = msg.match(/API returned (\d+):/);
    if (apiMatch) {
      const code = apiMatch[1];
      const jsonMatch = msg.match(/"message"\s*:\s*"([^"]+)"/);
      if (jsonMatch) return `${jsonMatch[1]} (${code})`;
      return `Request failed with status ${code}`;
    }
    const jsonMsgMatch = msg.match(/"message"\s*:\s*"([^"]+)"/);
    if (jsonMsgMatch) return jsonMsgMatch[1];
    if (msg.length > 120) return msg.slice(0, 120) + '...';
    return msg;
  };

  // Download a file from Google Drive
  const handleDownload = useCallback(async (file) => {
    if (!currentUser || downloadingFileId) return;
    setDownloadingFileId(file.id);

    try {
      const token = await currentUser.getIdToken();
      const params = new URLSearchParams({
        fileId: file.id,
        fileName: file.name || 'download',
        mimeType: file.mimeType || '',
      });

      const response = await fetch(`/api/apps/drive-download?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Download failed (${response.status})`);
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDownloadFileName(file);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      if (file.webViewLink) {
        window.open(file.webViewLink, '_blank');
      }
    } finally {
      setDownloadingFileId(null);
    }
  }, [currentUser, downloadingFileId]);

  // Get proper download filename with extension
  const getDownloadFileName = (file) => {
    let name = file.name || 'download';
    const mime = file.mimeType || '';
    if (mime.includes('google-apps.document') && !name.match(/\.\w+$/)) name += '.pdf';
    if (mime.includes('google-apps.spreadsheet') && !name.match(/\.\w+$/)) name += '.xlsx';
    if (mime.includes('google-apps.presentation') && !name.match(/\.\w+$/)) name += '.pptx';
    return name;
  };

  // Get file type icon
  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileIcon className="w-3 h-3 text-gray-500" />;
    if (mimeType.includes('folder')) return <FileIcon className="w-3 h-3 text-gray-500" />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="w-3 h-3 text-blue-600" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileIcon className="w-3 h-3 text-green-600" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileIcon className="w-3 h-3 text-amber-600" />;
    if (mimeType.includes('pdf')) return <FileText className="w-3 h-3 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-3 h-3 text-blue-500" />;
    if (mimeType.includes('video')) return <FileIcon className="w-3 h-3 text-violet-500" />;
    return <FileIcon className="w-3 h-3 text-gray-500" />;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return isCanvaGenerate
          ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          : <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        if (isEmailTool) return <Send className="w-3.5 h-3.5 text-violet-400" />;
        if (isDraft) return <Mail className="w-3.5 h-3.5 text-violet-400" />;
        if (isDriveSearch) return <FileText className="w-3.5 h-3.5 text-violet-400" />;
        return <Check className="w-4 h-4 text-violet-400" />;
      case 'failed':
      case 'timeout':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'awaiting_confirmation':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getContainerStyle = () => {
    switch (status) {
      case 'loading': return isCanvaGenerate ? 'border-violet-500/20 bg-violet-500/3' : 'border-blue-500/15 bg-blue-500/3';
      case 'success': return 'border-violet-500/15 bg-violet-500/3';
      case 'failed':
      case 'timeout': return 'border-red-500/15 bg-red-500/3';
      case 'awaiting_confirmation': return 'border-amber-500/15 bg-amber-500/3';
      case 'cancelled': return 'border-border/30 bg-muted/20';
      default: return 'border-border/30';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loading': return isEmailTool ? 'Sending...' : isDraft ? 'Saving...' : isDriveSearch ? 'Searching...' : isCanvaGenerate ? 'Waiting for Canva...' : isCanvaTool ? 'Processing...' : 'Executing...';
      case 'success': return isEmailTool ? (toolId === 'gmail_reply_email' ? 'Replied ✓' : 'Sent ✓') : isDraft ? 'Saved ✓' : isDriveSearch ? `Found ${driveFiles?.length || result?.count || ''}` : isCanvaGenerate ? 'Design ready ✓' : 'Done';
      case 'failed': return 'Failed';
      case 'timeout': return 'Timed out';
      case 'awaiting_confirmation': return 'Confirm';
      case 'cancelled': return 'Cancelled';
      default: return '';
    }
  };

  // Render email success card
  const renderEmailSuccess = () => {
    const to = parameters?.to || '';
    const subject = parameters?.subject || '';
    const body = parameters?.body || '';
    const finalHtml = result?._finalHtml;
    
    const plainBody = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const bodyPreview = plainBody.length > 250 ? plainBody.slice(0, 250) + '...' : plainBody;

    return (
      <div className="mt-3 rounded-lg border border-border/40 bg-background/50 overflow-hidden">
        <div className="px-3.5 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-2.75 font-medium text-muted-foreground uppercase tracking-wide w-12 shrink-0">To</span>
            <span className="text-xs text-foreground/90 font-medium">{to}</span>
          </div>
          {subject && (
            <div className="flex items-center gap-2">
              <span className="text-2.75 font-medium text-muted-foreground uppercase tracking-wide w-12 shrink-0">Subj</span>
              <span className="text-xs text-foreground/80">{subject}</span>
            </div>
          )}
        </div>
        
        {finalHtml && expanded ? (
          <>
            <div className="border-t border-border/30 flex items-center justify-between px-3.5 py-2 bg-muted/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">HTML Preview</span>
              <button onClick={() => setExpanded(false)} className="text-2.5 text-violet-400 hover:text-violet-300 font-medium flex items-center gap-0.5 transition-colors">
                <ChevronUp className="w-3 h-3" /> Hide preview
              </button>
            </div>
            <div className="bg-white rounded-b-lg overflow-hidden border-t border-border/30">
              <iframe 
                srcDoc={finalHtml} 
                className="w-full h-[500px] bg-white border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </>
        ) : plainBody ? (
          <>
            <div className="border-t border-border/30" />
            <div className="px-3.5 py-3">
              <p className="text-2.75 text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
                {expanded ? plainBody : bodyPreview}
              </p>
              {(plainBody.length > 250 || finalHtml) && (
                <button onClick={() => setExpanded(!expanded)} className="mt-2 text-2.5 text-violet-400 hover:text-violet-300 font-medium flex items-center gap-0.5 transition-colors">
                  {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> {finalHtml ? 'View designed email' : 'Read full'}</>}
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  };

  // Render Drive file search results with download buttons
  const renderDriveFiles = () => {
    const files = driveFiles || [];
    if (files.length === 0) return null;

    return (
      <div className="mt-3 space-y-1.5">
        {files.slice(0, expanded ? 15 : 5).map((file) => (
          <div key={file.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/30 bg-background/40 group hover:border-border/50 transition-colors">
            <span className="text-sm shrink-0">{getFileIcon(file.mimeType)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/90 font-medium truncate">{file.name}</p>
              <p className="text-2.5 text-muted-foreground/60 truncate">{file.mimeType?.split('.').pop() || 'file'}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {file.webViewLink && (
                <button
                  onClick={() => window.open(file.webViewLink, '_blank')}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                  title="Open in Drive"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => handleDownload(file)}
                disabled={downloadingFileId === file.id}
                className="h-6 px-2 flex items-center gap-1 rounded-md bg-violet-600/80 hover:bg-violet-600 text-white text-2.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Download"
              >
                {downloadingFileId === file.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{downloadingFileId === file.id ? '' : 'Download'}</span>
              </button>
            </div>
          </div>
        ))}
        {files.length > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="w-full text-2.5 text-violet-400 hover:text-violet-300 font-medium py-1.5 flex items-center justify-center gap-0.5 transition-colors">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {files.length} files</>}
          </button>
        )}
      </div>
    );
  };

  // Render Canva design result with image preview and download
  const isCanvaDesign = result?._canvaDesign || (toolId?.startsWith('canva_') && (result?.imageUrl || result?.designs));
  const renderCanvaLoadingCard = () => {
    return (
      <div className="mt-3">
        <div
          className="w-full max-w-5xl aspect-21/9 sm:aspect-[1.9/1] rounded-[18px] relative overflow-hidden shadow-2xl flex p-5 sm:p-6"
          style={{
            background: 'linear-gradient(145deg, #54575E 0%, #28292B 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 30px 60px -10px rgba(0,0,0,0.8)'
          }}
        >
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/4 to-transparent pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeIn' }}
          />

          <div className="flex justify-between items-start w-full relative z-10 text-[#a0a3aa]">
            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" strokeWidth={1.5} />
            <span className="text-sm sm:text-base font-medium tracking-wide">
              {Math.round(canvaProgress)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCanvaDesign = () => {
    const imageUrl = result?.imageUrl || result?.thumbnailUrl || result?.downloadUrl;
    const imageUrls = result?.imageUrls || [];
    const designs = result?.designs || [];
    const editUrl = result?.editUrl;
    const designId = result?.designId;
    const prompt = result?.prompt || parameters?.prompt || '';
    const isMultiple = result?._canvaMultiple || designs.length > 1 || imageUrls.length > 1;

    // Multiple designs — carousel layout (like Claude)
    if (isMultiple && (designs.length > 0 || imageUrls.length > 0)) {
      const items = designs.length > 0 ? designs : imageUrls.map((url, i) => ({
        id: `design_${i}`,
        title: `Design ${i + 1}`,
        thumbnail: url,
        editUrl: editUrl,
      }));

      return (
        <div className="mt-3 space-y-3">
          {/* Horizontal scrollable carousel */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {items.map((design, idx) => (
              <div key={design.id || idx} className="shrink-0 snap-start w-50 sm:w-60 rounded-xl overflow-hidden border border-border/30 bg-background/40 group">
                {design.thumbnail ? (
                  <div className="relative aspect-square bg-neutral-950/30">
                    <img
                      src={design.thumbnail}
                      alt={design.title || `Design ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        {design.editUrl && (
                          <a href={design.editUrl} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors" title="Edit in Canva">
                            <ExternalLink className="w-3.5 h-3.5 text-gray-800" />
                          </a>
                        )}
                        <a href={design.thumbnail} download={`canva-${design.id || idx}.png`} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors" title="Download">
                          <Download className="w-3.5 h-3.5 text-white" />
                        </a>
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="aspect-square bg-muted/8 flex items-center justify-center">
                    {appIcon ? (
                      <img src={appIcon} alt="Canva" className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-sky-400" />
                    )}
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-2.75 font-medium text-foreground/80 truncate">{design.title || `Design ${idx + 1}`}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Scroll indicator */}
          {items.length > 2 && (
            <p className="text-2.5 text-muted-foreground/50 text-center">← Scroll to see all {items.length} designs →</p>
          )}
        </div>
      );
    }

    // Single design with image
    if (imageUrl) {
      return (
        <div className="mt-3 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border/30 bg-background/40">
            <img
              src={imageUrl}
              alt={prompt || 'Canva Design'}
              className="w-full max-h-100 object-contain bg-neutral-950/50"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent flex items-center justify-between">
              <span className="text-2.75 text-white/80 truncate max-w-[60%]">{prompt || 'Canva Design'}</span>
              <div className="flex items-center gap-2">
                {editUrl && (
                  <a href={editUrl} target="_blank" rel="noopener noreferrer" className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-2.5 font-medium transition-colors">
                    <ExternalLink className="w-3 h-3" /> Edit in Canva
                  </a>
                )}
                <a href={imageUrl} download={`canva-design-${designId || 'export'}.png`} target="_blank" rel="noopener noreferrer" className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-violet-600/90 hover:bg-violet-600 text-white text-2.5 font-medium transition-colors">
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // No image but has edit URL
    if (editUrl) {
      return (
        <div className="mt-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-background/40">
            <div className="w-10 h-10 rounded-lg bg-muted/8 flex items-center justify-center">
              {appIcon ? (
                <img src={appIcon} alt="Canva" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <ImageIcon className="w-5 h-5 text-sky-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/90 truncate">{prompt || 'Design Created'}</p>
              <p className="text-2.5 text-muted-foreground/60">{designId ? `ID: ${designId}` : 'Ready to edit'}</p>
            </div>
            <a href={editUrl} target="_blank" rel="noopener noreferrer" className="h-7 px-3 flex items-center gap-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-2.5 font-medium transition-colors shrink-0">
              <ExternalLink className="w-3 h-3" /> Open in Canva
            </a>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render generic success result
  const renderGenericSuccess = () => {
    // If this is a Canva design result, use the Canva renderer
    if (isCanvaDesign) return renderCanvaDesign();

    const resultSummary = result ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2)).slice(0, 300) : '';
    const hasLongResult = resultSummary.length >= 300;
    if (!resultSummary && actionSummary) return <p className="mt-2 text-2.75 text-muted-foreground">{actionSummary}</p>;
    if (!resultSummary) return null;

    return (
      <div className="mt-2.5 rounded-lg border border-border/30 bg-background/40 p-3">
        <p className="text-2.75 text-muted-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">
          {expanded ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2)) : resultSummary}
          {hasLongResult && !expanded && '...'}
        </p>
        {hasLongResult && (
          <button onClick={() => setExpanded(!expanded)} className="text-2.5 text-violet-400 hover:text-violet-300 mt-2 flex items-center gap-0.5 font-medium transition-colors">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`my-3 rounded-xl border p-3.5 text-sm transition-all duration-200 ${getContainerStyle()}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {appIcon && <img src={appIcon} alt="" className="w-4 h-4 rounded-sm opacity-80" onError={(e) => { e.target.style.display = 'none'; }} />}
          <span className="font-medium text-xs text-foreground/90 truncate">{appName || 'App'}</span>
          <span className="text-muted-foreground/40 text-2.5">→</span>
          <span className="text-2.75 text-muted-foreground/70 truncate">{toolName}</span>
        </div>
        <span className={`text-2.5 font-medium whitespace-nowrap px-1.5 py-0.5 rounded ${
          status === 'success' ? 'text-violet-400/90' : status === 'loading' ? 'text-blue-400/90' :
          status === 'failed' || status === 'timeout' ? 'text-red-400/90' : 'text-muted-foreground/60'
        }`}>{getStatusText()}</span>
      </div>

      {/* Loading */}
      {status === 'loading' && !isCanvaGenerate && (
          <div className="mt-3 h-0.5 bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-linear-to-r from-transparent via-sky-400/50 to-transparent rounded-full animate-[shimmer_2s_linear_infinite]" />
        </div>
      )}

      {/* Canva Design Generation Loading */}
      {status === 'loading' && isCanvaGenerate && renderCanvaLoadingCard()}

      {/* Success */}
      {status === 'success' && (isEmailTool || isDraft) && renderEmailSuccess()}
      {status === 'success' && isDriveSearch && renderDriveFiles()}
      {status === 'success' && !isEmailTool && !isDraft && !isDriveSearch && renderGenericSuccess()}

      {/* Error */}
      {(status === 'failed' || status === 'timeout') && (
        <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg border border-red-500/10 bg-red-500/3">
          <p className="text-2.75 text-red-400/90">{cleanErrorMessage(error)}</p>
          {onRetry && (
            <Button size="sm" variant="ghost" className="h-6 text-2.5 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={onRetry}>
              <RotateCcw className="w-3 h-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}

      {/* Confirmation */}
      {status === 'awaiting_confirmation' && (
        <div className="mt-3">
          {actionSummary && <p className="text-2.75 text-muted-foreground/80 mb-3 whitespace-pre-line p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/3">{actionSummary}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-6 text-2.5 bg-violet-600 hover:bg-violet-700 text-white border-0" onClick={onConfirm}><Check className="w-3 h-3 mr-1" /> Confirm</Button>
            <Button size="sm" variant="outline" className="h-6 text-2.5 border-border/40" onClick={onCancel}><X className="w-3 h-3 mr-1" /> Cancel</Button>
          </div>
        </div>
      )}

      {status === 'cancelled' && <p className="mt-2 text-2.75 text-muted-foreground/60 italic">Action was cancelled.</p>}
    </div>
  );
}
