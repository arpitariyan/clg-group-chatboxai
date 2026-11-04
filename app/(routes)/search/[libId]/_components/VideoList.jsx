'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Play, ExternalLink, Share2, X, Check } from '@/components/ui/animated-icon';
import { FOCUS_RING, ICON_BUTTON, LABEL, QUIET_BUTTON, TILE } from './answerSurface'

/* Visual vocabulary comes from ./answerSurface.js. Same two removals as
   ImageList: the blue hover border (blue means Deep Research here) and the blue
   title-hover, both of which spent the accent on decoration. The YouTube pill
   keeps its red — that is a brand mark, not a UI accent. */

const FALLBACK_THUMB =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDMyMCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTkyIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9Ijk2IiByPSIzMiIgZmlsbD0iIzlCOUJBMiIvPgo8cGF0aCBkPSJNMTQ4IDg0TDE3NiA5NkwxNDggMTA4Vjg0WiIgZmlsbD0id2hpdGUiLz4KPHR4dCB4PSIxNjAiIHk9IjE0NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyNzkiPlZpZGVvIE5vdCBGb3VuZDwvdHh0Pgo8L3N2Zz4K'

/* Rendering this inline used to throw and take the whole message down when a
   result carried a malformed URL. */
const hostLabel = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'Video';
    }
};

function VideoList({ searchResult, variant = 'default' }) {
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Filter video URLs from searchResult
    const videos = useMemo(() => {
        const raw = searchResult?.searchResult;
        let items = [];
        if (Array.isArray(raw)) {
            items = raw;
        } else if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.results)) items = raw.results;
            else if (Array.isArray(raw.videos)) items = raw.videos;
            else if (Array.isArray(raw.items)) items = raw.items;
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) items = parsed;
                else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.results)) items = parsed.results;
                    else if (Array.isArray(parsed.videos)) items = parsed.videos;
                }
            } catch {
                items = [];
            }
        }

        if (items.length === 0 && Array.isArray(searchResult?.categorizedResults?.videos)) {
            items = searchResult.categorizedResults.videos;
        }

        if (!Array.isArray(items) || items.length === 0) return [];

        const videoList = [];
        items.forEach((item, index) => {
            if (!item || typeof item?.url !== 'string') return;
            // Check if URL contains video patterns
            const videoPatterns = [
                'youtube.com/watch',
                'youtu.be/',
                'vimeo.com/',
                'dailymotion.com/',
                'twitch.tv/',
                '.mp4',
                '.webm',
                '.avi',
                '.mov',
                'video'
            ];

            const isVideo = videoPatterns.some(pattern =>
                item.url.toLowerCase().includes(pattern.toLowerCase())
            );

            if (isVideo) {
                // Extract video ID for YouTube videos
                let videoId = null;
                let embedUrl = null;

                if (item.url.includes('youtube.com/watch?v=')) {
                    videoId = item.url.split('v=')[1]?.split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}`;
                } else if (item.url.includes('youtu.be/')) {
                    videoId = item.url.split('youtu.be/')[1]?.split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }

                videoList.push({
                    id: `video-${index}`,
                    url: item.url,
                    embedUrl: embedUrl,
                    title: item.title || 'Video',
                    description: item.description || '',
                    thumbnail: item.thumbnail || item.image || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    source: item.name || item.url,
                    isYouTube: item.url.includes('youtube.com') || item.url.includes('youtu.be')
                });
            }
        });

        return videoList;
    }, [searchResult]);

    const closeVideoPopup = useCallback(() => {
        setSelectedVideo(null);
        setIsPopupOpen(false);
        setCopySuccess(false);
    }, []);

    const openVideoPopup = (video) => {
        setSelectedVideo(video);
        setIsPopupOpen(true);
    };

    /* Escape closes the player and the page behind is scroll-locked while it is
       open — a modal with no keyboard exit is a trap. */
    useEffect(() => {
        if (!isPopupOpen) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') closeVideoPopup();
        };
        document.addEventListener('keydown', onKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isPopupOpen, closeVideoPopup]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(selectedVideo.url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy video URL:', error);
        }
    };

    if (videos.length === 0) {
        if (variant === 'embedded') return null;
        return (
            <div className="mt-4 py-8 text-center">
                <div className="rounded-xl bg-inset p-8 shadow-hairline">
                    <p className="mb-1 text-[0.9375rem] font-medium text-ink">No videos found</p>
                    <p className="text-[0.8125rem] text-ink-2">Video sources will appear here when available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={variant === 'embedded' ? 'mt-2' : 'mt-5 mb-20'}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                    /* Was a bare <div onClick>: unreachable by keyboard. It opens a
                       dialog, so it is a button. */
                    <button
                        key={video.id}
                        type="button"
                        aria-label={`Play video: ${video.title}`}
                        className={`${TILE} flex cursor-pointer flex-col text-left ${FOCUS_RING}`}
                        onClick={() => openVideoPopup(video)}
                    >
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                            <img
                                src={video.thumbnail}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                loading="lazy"
                                onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors duration-300 group-hover:bg-black/10">
                                <span className="flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                                    <Play size={17} className="ml-0.5 text-white" fill="currentColor" aria-hidden="true" />
                                </span>
                            </span>
                            {video.isYouTube && (
                                <span className={`${LABEL} absolute bottom-2 right-2 rounded-[5px] bg-red-600/90 px-1.5 py-0.5 text-white backdrop-blur-sm`}>
                                    YouTube
                                </span>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col p-3.5">
                            <h3 className="mb-1 line-clamp-2 text-[0.875rem] font-medium leading-snug text-ink">
                                {video.title}
                            </h3>
                            <p className="mb-2.5 line-clamp-2 flex-1 text-[0.8125rem] leading-[1.55] text-ink-2">
                                {video.description}
                            </p>
                            <p className={`${LABEL} truncate text-ink-3`}>
                                {hostLabel(video.url)}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Video Popup Modal */}
            {isPopupOpen && selectedVideo && (
                <div
                    className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
                    onClick={closeVideoPopup}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="video-dialog-title"
                        className="flex max-h-[90vh] w-full max-w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl md:max-w-6xl md:flex-row animate-in fade-in zoom-in-95 duration-200"
                        style={{ boxShadow: '0 0 0 1px var(--line), 0 32px 64px -24px rgba(0,0,0,0.45)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Video Player Section */}
                        <div className="flex min-h-[30vh] flex-1 items-center justify-center bg-black md:min-h-[500px]">
                            {selectedVideo.embedUrl ? (
                                <iframe
                                    src={selectedVideo.embedUrl}
                                    title={selectedVideo.title}
                                    className="h-full min-h-[30vh] w-full md:min-h-[500px]"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                        <Play size={26} className="ml-1 text-white/40" aria-hidden="true" />
                                    </div>
                                    <p className="mb-5 text-[0.9375rem] font-medium text-white/70">Video preview not available</p>
                                    <a
                                        href={selectedVideo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex h-10 items-center gap-2 rounded-control border border-white/15
                                                    bg-white/10 px-4 text-[0.8125rem] font-medium text-white
                                                    transition-colors duration-150 hover:bg-white/15 ${FOCUS_RING}`}
                                    >
                                        <ExternalLink size={15} aria-hidden="true" />
                                        Watch on original site
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Details & Controls Section */}
                        <div className="custom-scrollbar flex w-full flex-col overflow-y-auto border-t border-line bg-surface p-5 md:w-80 md:border-l md:border-t-0 md:p-6">
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <h3
                                    id="video-dialog-title"
                                    className="text-[0.9375rem] font-semibold leading-snug text-ink wrap-break-word"
                                >
                                    {selectedVideo.title}
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeVideoPopup}
                                    aria-label="Close video preview"
                                    className={ICON_BUTTON}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>

                            {selectedVideo.description && (
                                <p className="mb-6 text-[0.8125rem] leading-[1.6] text-ink-2">
                                    {selectedVideo.description}
                                </p>
                            )}

                            <div className="mt-auto space-y-2">
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className={`flex h-10 w-full items-center justify-center gap-2
                                                rounded-control text-[0.8125rem] font-medium ${QUIET_BUTTON}`}
                                >
                                    {copySuccess
                                        ? <Check size={15} className="text-emerald-500" aria-hidden="true" />
                                        : <Share2 size={15} className="text-ink-3" aria-hidden="true" />}
                                    {copySuccess ? 'Link copied' : 'Copy link'}
                                </button>

                                <a
                                    href={selectedVideo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-control
                                                bg-primary text-[0.8125rem] font-medium text-primary-foreground
                                                transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                >
                                    <ExternalLink size={15} aria-hidden="true" />
                                    <span>Watch on {selectedVideo.isYouTube ? 'YouTube' : 'site'}</span>
                                </a>
                            </div>

                            <div className="mt-6 border-t border-line pt-5">
                                <p className={`${LABEL} mb-1.5 text-ink-3`}>Source URL</p>
                                <p className="rounded-control bg-inset p-2.5 text-[0.75rem] leading-[1.6] text-ink-2 shadow-hairline [overflow-wrap:anywhere]">
                                    {selectedVideo.url}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoList
