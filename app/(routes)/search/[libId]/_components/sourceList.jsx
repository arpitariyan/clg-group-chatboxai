'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import { ExternalLink, Globe, Calendar, ChevronDown, ChevronUp } from '@/components/ui/animated-icon'
import { FOCUS_RING, GHOST_BUTTON, LABEL, QUIET_BUTTON, TILE } from './answerSurface'

/* Visual vocabulary comes from ./answerSurface.js. The `embedded` variant is the
   one DisplayResult actually renders under the "Sources" section header; the
   `default` variant is the standalone page treatment. Both now draw from the same
   ink / line / inset ramp so a source chip in a message and a source card on the
   page are recognisably the same object. */

const CHIP_LIMIT = 8

function SourceList({ searchResult, variant = 'default' }) {
    // Get the mixed results or categorized web results
    const rawResults = searchResult?.searchResult;
    let webResults = [];
    if (Array.isArray(rawResults)) {
        webResults = rawResults;
    } else if (rawResults && typeof rawResults === 'object') {
        if (Array.isArray(rawResults.results)) webResults = rawResults.results;
        else if (Array.isArray(rawResults.items)) webResults = rawResults.items;
        else if (Array.isArray(rawResults.web)) webResults = rawResults.web;
    } else if (typeof rawResults === 'string') {
        try {
            const parsed = JSON.parse(rawResults);
            if (Array.isArray(parsed)) webResults = parsed;
            else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.results)) webResults = parsed.results;
                else if (Array.isArray(parsed.web)) webResults = parsed.web;
            }
        } catch {
            webResults = [];
        }
    }

    if (webResults.length === 0) {
        if (Array.isArray(searchResult?.categorizedResults?.web)) {
            webResults = searchResult.categorizedResults.web;
        } else if (Array.isArray(searchResult?.mixedResults)) {
            webResults = searchResult.mixedResults.filter(item => item?.resultType === 'web');
        }
    }

    // State for showing all results
    const [showAll, setShowAll] = useState(false);

    /* The first row used to be sized by reading window.innerWidth during render —
       that produced a hydration mismatch on every non-desktop viewport and never
       updated on resize. A fixed count of 4 lets CSS own the reflow instead. */
    const VISIBLE_CARDS = 4;
    const firstRowCards = webResults.slice(0, VISIBLE_CARDS);
    const remainingCards = webResults.slice(VISIBLE_CARDS);

    const getDomainLabel = (item) => {
        const fileName = item?.fileName || item?.metadata?.fileName || item?.title;
        if (item?.type === 'file_analysis' && fileName) return fileName;

        const raw = item?.url || item?.link || '';
        if (!raw) return fileName || item?.name || item?.displayLink || 'Source';

        try {
            const host = new URL(raw).hostname.replace(/^www\./, '');
            const isUploadHost = host.includes('appwrite.io') || host.includes('appwrite');
            return isUploadHost && fileName ? fileName : host;
        } catch {
            return fileName || item?.name || item?.displayLink || 'Source';
        }
    };

    // Safe Image Component with error handling
    const SafeImage = ({ src, alt, width, height, className, unoptimized = true }) => {
        const [imageError, setImageError] = useState(false);
        const [imageLoading, setImageLoading] = useState(true);

        if (imageError || !src) {
            return <Globe className={`text-ink-3 ${width <= 20 ? 'h-4 w-4' : 'h-8 w-8'}`} aria-hidden="true" />;
        }

        return (
            <div className="relative">
                {imageLoading && (
                    <div className={`animate-pulse rounded bg-hover-2 ${className}`}
                        style={{ width, height }}>
                    </div>
                )}
                <Image
                    src={src}
                    alt={alt || "Image"}
                    width={width}
                    height={height}
                    className={`${className} ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                    onError={() => {
                        setImageError(true);
                        setImageLoading(false);
                    }}
                    onLoad={() => setImageLoading(false)}
                    unoptimized={unoptimized}
                />
            </div>
        );
    };

    /* Hover no longer scales the whole card. A 1.02 scale on a text card blurs the
       type mid-transition and nudged neighbours; the hairline edge carries the
       affordance instead, and only the title shifts colour. */
    const CardComponent = ({ item }) => (
        <a
            href={item.url || item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block h-full no-underline ${FOCUS_RING} rounded-xl`}
        >
            <div className={`${TILE} h-full cursor-pointer p-3.5`}>
                <div className="flex h-full flex-col gap-2.5">
                    {/* Top - Platform Info */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-hover-2">
                            <SafeImage
                                src={item.thumbnail || item.image || item.pagemap?.cse_thumbnail?.[0]?.src}
                                alt=""
                                width={16}
                                height={16}
                                className="rounded"
                            />
                        </div>
                        <span className={`${LABEL} truncate text-ink-3`}>
                            {item.name || item.displayLink || (() => {
                                try {
                                    const url = item.url || item.link;
                                    return url ? new URL(url).hostname.replace('www.', '') : 'Website';
                                } catch {
                                    return 'Website';
                                }
                            })()}
                        </span>
                        <ExternalLink
                            className="ml-auto h-3 w-3 shrink-0 text-ink-3 transition-colors group-hover:text-ink-2"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Title - if available */}
                    {item.title && (
                        <h3 className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-ink">
                            {item.title}
                        </h3>
                    )}

                    {/* Description/Snippet - Exactly 2 lines with ellipsis */}
                    <p className="line-clamp-2 grow text-[0.8125rem] leading-[1.55] text-ink-2">
                        {item.description || item.snippet || 'No description available'}
                    </p>

                    {/* Additional metadata */}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2 text-[0.75rem] text-ink-3">
                        {(item.name || item.displayLink) && (
                            <div className="flex min-w-0 items-center gap-1 truncate">
                                <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                    {item.name || item.displayLink}
                                </span>
                            </div>
                        )}

                        {item.pagemap?.metatags?.[0]?.['article:published_time'] && (
                            <div className="ml-auto flex shrink-0 items-center gap-1">
                                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="tabular-nums">
                                    {new Date(item.pagemap.metatags[0]['article:published_time']).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </a>
    );

    const wrapperClass = variant === 'embedded' ? 'mt-2' : 'mt-5 mb-20';

    if (variant === 'embedded') {
        if (!webResults?.length) return null;

        /* The overflow used to be a silent `.slice(0, 8)` — anything past the
           eighth source simply vanished with no indication it existed. The tail is
           now a real disclosure the user can open. */
        const hiddenCount = Math.max(0, webResults.length - CHIP_LIMIT);
        const visible = showAll ? webResults : webResults.slice(0, CHIP_LIMIT);

        return (
            <div className={wrapperClass}>
                <div className="flex flex-wrap gap-1.5">
                    {visible.map((item, index) => {
                        const label = getDomainLabel(item);
                        const title = item?.title || item?.description || label;
                        return (
                            <a
                                key={`source-chip-${index}`}
                                href={item.url || item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex h-7 max-w-full items-center gap-1.5
                                            rounded-full px-2.5 text-[0.75rem] ${QUIET_BUTTON}`}
                                title={title}
                            >
                                <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="min-w-0 max-w-37.5 truncate">{label}</span>
                            </a>
                        );
                    })}

                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            aria-expanded={showAll}
                            onClick={() => setShowAll(!showAll)}
                            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5
                                        text-[0.75rem] font-medium ${GHOST_BUTTON}`}
                        >
                            {showAll ? 'Show less' : `+${hiddenCount} more`}
                            {showAll
                                ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
                                : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (

        <div className={wrapperClass}>
            <div className="mb-6">
                <h2 className="mb-1 text-lg font-semibold tracking-[-0.008em] text-ink">
                    Source Results
                </h2>
                <p className="text-[0.8125rem] text-ink-2">
                    {webResults?.length > 0
                        ? `Found ${webResults.length} relevant source${webResults.length === 1 ? '' : 's'}`
                        : 'No sources found'
                    }
                </p>
            </div>

            {webResults?.length > 0 ? (
                <div>
                    {/* First Row - Always Visible */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {firstRowCards.map((item, index) => (
                            <CardComponent key={index} item={item} />
                        ))}
                    </div>

                    {/* Remaining Rows - Collapsible.
                        Uses the grid-template-rows 1fr/0fr trick rather than the old
                        max-h-0 → max-h-none pair, which never animated: `none` is not
                        an interpolatable length, so the panel snapped open. */}
                    {remainingCards.length > 0 && (
                        <div>
                            <div
                                className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
                                style={{
                                    gridTemplateRows: showAll ? '1fr' : '0fr',
                                    opacity: showAll ? 1 : 0,
                                }}
                            >
                                <div className="overflow-hidden">
                                    <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                        {remainingCards.map((item, index) => (
                                            <CardComponent key={VISIBLE_CARDS + index} item={item} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center pt-4">
                                <button
                                    type="button"
                                    aria-expanded={showAll}
                                    onClick={() => setShowAll(!showAll)}
                                    className={`flex h-9 cursor-pointer items-center gap-2 rounded-control
                                                px-4 text-[0.8125rem] font-medium ${QUIET_BUTTON}`}
                                >
                                    <span>{showAll ? 'Show less' : `Show ${remainingCards.length} more source${remainingCards.length === 1 ? '' : 's'}`}</span>
                                    {showAll ? (
                                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-inset shadow-hairline">
                        <Globe className="h-6 w-6 text-ink-3" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1 text-[0.9375rem] font-medium text-ink">
                        No web results found
                    </h3>
                    <p className="text-[0.8125rem] text-ink-2">
                        Try searching with different keywords or check your search query.
                    </p>
                </div>
            )}
        </div>

    )

}

export default SourceList
