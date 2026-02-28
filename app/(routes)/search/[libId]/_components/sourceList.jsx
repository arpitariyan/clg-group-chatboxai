'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import { ExternalLink, Globe, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

function SourceList({ searchResult }) {
    // Get the mixed results or categorized web results
    const webResults = searchResult?.searchResult || searchResult?.categorizedResults?.web || searchResult?.mixedResults?.filter(item => item.resultType === 'web') || []

    // State for showing all results
    const [showAll, setShowAll] = useState(false);

    // Determine how many cards to show in first row based on screen size
    const getCardsPerRow = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth >= 1024) return 4; // lg screens
            if (window.innerWidth >= 768) return 3;  // md screens
            if (window.innerWidth >= 640) return 2;  // sm screens
            return 1; // mobile
        }
        return 4; // default for SSR
    };

    const cardsPerRow = getCardsPerRow();
    const firstRowCards = webResults.slice(0, cardsPerRow);
    const remainingCards = webResults.slice(cardsPerRow);

    // Safe Image Component with error handling
    const SafeImage = ({ src, alt, width, height, className, unoptimized = true }) => {
        const [imageError, setImageError] = useState(false);
        const [imageLoading, setImageLoading] = useState(true);

        if (imageError || !src) {
            return <Globe className={`text-gray-400 dark:text-gray-300 ${width <= 20 ? 'w-4 h-4' : 'w-8 h-8'}`} />;
        }

        return (
            <div className="relative">
                {imageLoading && (
                    <div className={`animate-pulse bg-gray-200 rounded ${className}`}
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

    const CardComponent = ({ item, index }) => (
        <a
            href={item.url || item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline block group"
        >
            <div className="bg-white dark:bg-[oklch(0.3092_0_0)] rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md p-4 cursor-pointer h-full transition-all duration-200 group-hover:scale-[1.02]">
                <div className="flex flex-col gap-3 h-full">
                    {/* Top - Platform Info */}
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full shrink-0">
                            <SafeImage
                                src={item.thumbnail || item.image || item.pagemap?.cse_thumbnail?.[0]?.src}
                                alt="Site favicon"
                                width={16}
                                height={16}
                                className="rounded"
                            />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide truncate">
                            {item.name || item.displayLink || (() => {
                                try {
                                    const url = item.url || item.link;
                                    return url ? new URL(url).hostname.replace('www.', '') : 'Website';
                                } catch {
                                    return 'Website';
                                }
                            })()}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-300 shrink-0 group-hover:text-gray-600 dark:group-hover:text-white transition-colors" />
                    </div>

                    {/* Title - if available */}
                    {item.title && (
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                        </h3>
                    )}

                    {/* Description/Snippet - Exactly 2 lines with ellipsis */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed overflow-hidden line-clamp-2 grow"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            textOverflow: 'ellipsis'
                        }}>
                        {item.description || item.snippet || 'No description available'}
                    </p>

                    {/* Additional metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2 border-t border-gray-100 dark:border-gray-600">
                        {/* Channel/Author name */}
                        {(item.name || item.displayLink) && (
                            <div className="flex items-center gap-1 truncate">
                                <Globe className="w-3 h-3 shrink-0 dark:text-gray-300" />
                                <span className="truncate">
                                    {item.name || item.displayLink}
                                </span>
                            </div>
                        )}

                        {/* Publish date */}
                        {item.pagemap?.metatags?.[0]?.['article:published_time'] && (
                            <div className="flex items-center gap-1 ml-auto">
                                <Calendar className="w-3 h-3 shrink-0 dark:text-gray-300" />
                                <span className="truncate">
                                    {new Date(item.pagemap.metatags[0]['article:published_time']).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </a>
    );

    return (

        <div className="mt-5 mb-20">
            {/* Title Section */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                    Source Results
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {webResults?.length > 0 
                        ? `Found ${webResults.length} relevant source${webResults.length === 1 ? '' : 's'}`
                        : 'No sources found'
                    }
                </p>
            </div>

            {webResults?.length > 0 ? (
                <div>
                    {/* First Row - Always Visible */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {firstRowCards.map((item, index) => (
                            <CardComponent key={index} item={item} index={index} />
                        ))}
                    </div>

                    {/* Remaining Rows - Collapsible */}
                    {remainingCards.length > 0 && (
                        <div className="space-y-4">
                            {/* Collapsible Content */}
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showAll ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                                    {remainingCards.map((item, index) => (
                                        <CardComponent key={cardsPerRow + index} item={item} index={cardsPerRow + index} />
                                    ))}
                                </div>
                            </div>

                            {/* Show All / Show Less Button */}
                            <div className="flex items-center justify-center pt-4">
                                <button
                                    onClick={() => setShowAll(!showAll)}
                                    className="flex items-center gap-2 px-6 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-lg cursor-pointer transition-colors border border-gray-200 dark:border-gray-600"
                                >
                                    <span>{showAll ? 'Show Less' : `Show ${remainingCards.length} More Source${remainingCards.length === 1 ? '' : 's'}`}</span>
                                    {showAll ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600" />
                </div>
            ) : (

                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8 text-gray-400 dark:text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-600 dark:text-white mb-2">
                        No web results found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Try searching with different keywords or check your search query.
                    </p>
                </div>
            )}
        </div>

    )

}

export default SourceList
