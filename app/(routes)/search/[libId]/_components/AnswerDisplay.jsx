'use client'

import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { ExternalLink, Globe, Calendar, ChevronDown, ChevronUp, FolderClosed, Loader2Icon } from 'lucide-react'
import DisplaySummery from './DisplaySummery';

function AnswerDisplay({ searchResult, isLatestMessage = false, isLoadingAnswer = false }) {
    // Add state to force re-renders when searchResult changes
    const [currentSearchResult, setCurrentSearchResult] = useState(searchResult);

    // Update local state when prop changes
    useEffect(() => {
        if (searchResult) {
            setCurrentSearchResult(searchResult);
        }
    }, [searchResult, searchResult?.aiResp]); // Also depend on aiResp specifically

    // Get the mixed results or categorized web results
    const webResults = currentSearchResult?.searchResult || currentSearchResult?.categorizedResults?.web || currentSearchResult?.mixedResults?.filter(item => item.resultType === 'web') || []

    // Check if this is a file analysis result
    const isFileAnalysis = currentSearchResult?.analyzedFilesCount > 0 ||
        (currentSearchResult?.processedFiles && currentSearchResult.processedFiles.length > 0) ||
        (webResults?.length > 0 && webResults[0]?.type === 'file_analysis');
    const analyzedFilesCount = currentSearchResult?.analyzedFilesCount || 0;
    const processedFiles = currentSearchResult?.processedFiles || [];

    // Detect research mode via enriched source fields (no longer relying on metadata column)
    const isResearchResult = webResults?.some(item => item?.deepResearch || item?.summary || (item?.keyPoints && item.keyPoints.length > 0));
    const researchMetadata = {
        enrichedSources: webResults.filter(item => item.summary).length,
        totalSources: webResults.length
    };

    // State for showing all results
    const [showAll, setShowAll] = useState(false);

    // Check if Google API was used for this search
    // Determine this based on whether searchResult exists and has content
    // If there are searchResults, Google API was used; otherwise it was a direct AI fallback
    const googleApiUsed = webResults && webResults.length > 0;

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
            className="no-underline block"
        >
            <div className="bg-gray-200 dark:bg-[oklch(0.3092_0_0)] rounded-lg border border-gray-400 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-[oklch(0.3092_0_0)] p-3 cursor-pointer h-fit transition-colors">
                <div className="flex flex-col gap-2.5">
                    {/* Top - Platform Info */}
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full shrink-0">
                            <SafeImage
                                src={item.thumbnail || item.image || item.pagemap?.cse_thumbnail?.[0]?.src}
                                alt="Site favicon"
                                width={14}
                                height={14}
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
                        <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-300 shrink-0" />
                    </div>

                    {/* Description or enriched research summary */}
                    {item.summary ? (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3">
                                {item.summary}
                            </p>
                            {item.keyPoints && item.keyPoints.length > 0 && (
                                <ul className="text-[10px] text-gray-600 dark:text-gray-300 list-disc ml-4 space-y-0.5 max-h-16 overflow-y-auto">
                                    {item.keyPoints.slice(0, 4).map((kp, i) => (
                                        <li key={i}>{kp}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed overflow-hidden line-clamp-2"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis'
                            }}>
                            {item.description || item.snippet || item.title || 'No description available'}
                        </p>
                    )}

                    {/* Additional metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto">
                        {/* Channel/Author name */}
                        {(item.name || item.displayLink) && (
                            <div className="flex items-center gap-1 truncate">
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
        <div className="mt-5 min-w-0 w-full overflow-hidden">
            <div className="min-w-0">

                {/* Research Mode Indicator */}
                {isResearchResult && (
                    <div className="mb-4">
                        <div className="flex items-center space-x-3 p-3 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Deep Research Mode</h3>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                    Enriched {researchMetadata.enrichedSources} / {researchMetadata.totalSources} sources (summaries & key points)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* File Analysis Indicator */}
                {isFileAnalysis && (
                    <div className="mb-6">
                        <div className="flex items-center space-x-3 p-4 dark:bg-[oklch(0.209_0_0)] dark:border-gray-600 rounded-lg">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">

                                {/* Display new searchResult format for file analysis */}
                                {webResults?.length > 0 && webResults[0]?.type === 'file_analysis' && (
                                    <div className="space-y-1">
                                        {webResults.map((result, index) => (
                                            <div key={index} className="text-xs flex items-center space-x-2">
                                                <span className="truncate">{result.title}</span>
                                                {result.metadata?.size && (
                                                    <span >
                                                        ({result.metadata.size})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Web Results Section - only show if Google API was used and not file analysis */}
                {googleApiUsed && !isFileAnalysis && webResults?.length > 0 ? (
                    <div>
                        {/* First Row - Always Visible */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                                        {remainingCards.map((item, index) => (
                                            <CardComponent key={cardsPerRow + index} item={item} index={cardsPerRow + index} />
                                        ))}
                                    </div>
                                </div>

                                {/* Show All / Show Less Button */}
                                <div className="flex items-end justify-end">
                                    <button
                                        onClick={() => setShowAll(!showAll)}
                                        className="flex items-center gap-2 px-4 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-pointer"
                                    >
                                        <span>{showAll ? 'Show Less' : `Show All (${remainingCards.length} more)`}</span>
                                        {showAll ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        <hr className='my-5 text-gray-700 dark:border-gray-600' />
                    </div>
                ) : googleApiUsed && !isFileAnalysis ? (

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
                ) : null}

                {/* AI Response Section - Now properly contained and scrollable */}
                {isLoadingAnswer ? (
                    <div className="mt-6 min-w-0 w-full overflow-hidden">
                        <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <Loader2Icon className="w-4 h-4 text-gray-500 dark:text-gray-300 animate-spin" />
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                AI is thinking and preparing your answer...
                            </div>
                        </div>
                    </div>
                ) : currentSearchResult?.aiResp ? (
                    <div className="mt-6 min-w-0 w-full overflow-hidden">
                        <DisplaySummery
                            key={`summary-${currentSearchResult?.id}-${currentSearchResult?.aiResp?.length || 0}`} // Force re-render with key
                            aiResp={currentSearchResult?.aiResp}
                            usedModel={currentSearchResult?.usedModel}
                            modelApi={currentSearchResult?.modelApi}
                            isFileAnalysis={isFileAnalysis}
                            analyzedFilesCount={analyzedFilesCount}
                        />
                    </div>
                ) : null}

            </div>
        </div>
    )
}

export default AnswerDisplay
