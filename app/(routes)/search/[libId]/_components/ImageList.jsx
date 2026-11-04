'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Download, Share2, X, Check, ChevronDown, ChevronUp } from '@/components/ui/animated-icon';
import { FOCUS_RING, GHOST_BUTTON, ICON_BUTTON, LABEL, QUIET_BUTTON, TILE } from './answerSurface'

/* Visual vocabulary comes from ./answerSurface.js.

   Two things were deliberately removed here rather than restyled:

   1. The "Top Image" hero card — a bordered panel with a blue dot, an uppercase
      label and a 16:9 well, sitting above a 4:3 grid of the same objects. It was
      the only thing in the result UI using that treatment, and the hierarchy it
      implied was not real: images[0] is just the first source that happened to
      carry an image, not a better one. One uniform grid now, under the "Images"
      section header DisplayResult already renders.
   2. The blue hover border. Blue means Deep Research in this UI; using it as
      generic hover decoration made the accent meaningless.
*/

const GRID_LIMIT = 8

const FALLBACK_TILE =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3Mjc5Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+Cjwvc3ZnPgo='

function ImageList({ searchResult, variant = 'default' }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // Filter images and thumbnails from searchResult
    const images = useMemo(() => {
        const raw = searchResult?.searchResult;
        let items = [];
        if (Array.isArray(raw)) {
            items = raw;
        } else if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.results)) items = raw.results;
            else if (Array.isArray(raw.images)) items = raw.images;
            else if (Array.isArray(raw.items)) items = raw.items;
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) items = parsed;
                else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.results)) items = parsed.results;
                    else if (Array.isArray(parsed.images)) items = parsed.images;
                }
            } catch {
                items = [];
            }
        }

        if (items.length === 0 && Array.isArray(searchResult?.categorizedResults?.images)) {
            items = searchResult.categorizedResults.images;
        }

        if (!Array.isArray(items) || items.length === 0) return [];

        const imageList = [];
        items.forEach((item, index) => {
            if (!item) return;
            // Add main image if exists
            if (item.image) {
                imageList.push({
                    id: `image-${index}`,
                    url: item.image,
                    thumbnail: item.thumbnail || item.image,
                    title: item.title || 'Image',
                    source: item.url || '#'
                });
            }

            // Add thumbnail if different from main image
            if (item.thumbnail && item.thumbnail !== item.image) {
                imageList.push({
                    id: `thumbnail-${index}`,
                    url: item.thumbnail,
                    thumbnail: item.thumbnail,
                    title: item.title || 'Thumbnail',
                    source: item.url || '#'
                });
            }
        });

        return imageList;
    }, [searchResult]);

    const closeImagePopup = useCallback(() => {
        setSelectedImage(null);
        setIsPopupOpen(false);
        setCopySuccess(false);
    }, []);

    const openImagePopup = (image) => {
        setSelectedImage(image);
        setIsPopupOpen(true);
    };

    /* A lightbox with no keyboard exit is a trap. Escape closes it, and the page
       behind is scroll-locked so the wheel does not move content the user cannot
       see. */
    useEffect(() => {
        if (!isPopupOpen) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') closeImagePopup();
        };
        document.addEventListener('keydown', onKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isPopupOpen, closeImagePopup]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(selectedImage.url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy image URL:', error);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = selectedImage.url;
        link.download = `image-${Date.now()}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (images.length === 0) {
        if (variant === 'embedded') return null;
        return (
            <div className="mt-4 py-8 text-center">
                <div className="rounded-xl bg-inset p-8 shadow-hairline">
                    <p className="mb-1 text-[0.9375rem] font-medium text-ink">No images found</p>
                    <p className="text-[0.8125rem] text-ink-2">Image sources will appear here when available</p>
                </div>
            </div>
        );
    }

    const hiddenCount = Math.max(0, images.length - GRID_LIMIT);
    const visible = showAll ? images : images.slice(0, GRID_LIMIT);

    return (
        <div className={variant === 'embedded' ? 'mt-2 space-y-2.5' : 'mt-5 mb-20 space-y-3'}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((image) => (
                    /* Was a bare <div onClick>: unreachable by keyboard and invisible
                       to assistive tech. It opens a dialog, so it is a button. */
                    <button
                        key={image.id}
                        type="button"
                        aria-label={`View image: ${image.title}`}
                        className={`${TILE} aspect-4/3 cursor-pointer ${FOCUS_RING}`}
                        onClick={() => openImagePopup(image)}
                    >
                        <img
                            src={image.thumbnail}
                            alt={image.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                            onError={(e) => { e.target.src = FALLBACK_TILE; }}
                        />
                        <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                    </button>
                ))}
            </div>

            {hiddenCount > 0 && (
                <button
                    type="button"
                    aria-expanded={showAll}
                    onClick={() => setShowAll(!showAll)}
                    className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5
                                text-[0.75rem] font-medium ${GHOST_BUTTON}`}
                >
                    {showAll ? 'Show fewer images' : `+${hiddenCount} more image${hiddenCount === 1 ? '' : 's'}`}
                    {showAll
                        ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
                        : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                </button>
            )}

            {/* Image Popup Modal */}
            {isPopupOpen && selectedImage && (
                <div
                    className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
                    onClick={closeImagePopup}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="image-dialog-title"
                        className="flex max-h-[90vh] w-full max-w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl md:max-w-5xl md:flex-row animate-in fade-in zoom-in-95 duration-200"
                        style={{ boxShadow: '0 0 0 1px var(--line), 0 32px 64px -24px rgba(0,0,0,0.45)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Image Preview Section */}
                        <div className="flex min-h-[30vh] flex-1 items-center justify-center bg-canvas p-4 md:min-h-[500px] md:p-8">
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.title}
                                className="max-h-[50vh] max-w-full rounded-control object-contain md:max-h-[80vh]"
                                onError={(e) => { e.target.src = selectedImage.thumbnail; }}
                            />
                        </div>

                        {/* Details & Controls Section */}
                        <div className="custom-scrollbar flex w-full flex-col overflow-y-auto border-t border-line bg-surface p-5 md:w-80 md:border-l md:border-t-0 md:p-6">
                            <div className="mb-5 flex items-start justify-between gap-3">
                                <h3
                                    id="image-dialog-title"
                                    className="text-[0.9375rem] font-semibold leading-snug text-ink wrap-break-word"
                                >
                                    {selectedImage.title}
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeImagePopup}
                                    aria-label="Close image preview"
                                    className={ICON_BUTTON}
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            </div>

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

                                {/* Was hard-coded blue-600. On --primary it now follows the
                                    user's accent choice instead of fighting it. */}
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-control
                                                bg-primary text-[0.8125rem] font-medium text-primary-foreground
                                                transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                >
                                    <Download size={15} aria-hidden="true" />
                                    Download image
                                </button>
                            </div>

                            <div className="mt-6 border-t border-line pt-5">
                                <p className={`${LABEL} mb-1.5 text-ink-3`}>Source URL</p>
                                <a
                                    href={selectedImage.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block rounded-control p-2.5 text-[0.75rem]
                                                leading-[1.6] [overflow-wrap:anywhere] ${QUIET_BUTTON}`}
                                >
                                    {selectedImage.source}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ImageList
