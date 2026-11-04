'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ImageIcon, Atom, Brain } from '@/components/ui/animated-icon'
import DisplaySummery from './DisplaySummery';
import { MEASURE, LABEL, FOCUS_RING, RESEARCH_BADGE, PROGRESS_BADGE } from './answerSurface'

/* Visual vocabulary comes from ./answerSurface.js — the ink / line / inset ramp,
   the single small-caps LABEL, the shared focus ring and the Deep Research badge.
   This file used to carry its own gray/zinc palette plus a hand-rolled shield
   icon for Deep Research, which made the same feature look different depending
   on whether you were reading the composer or the answer. */

const THINKING_PHRASES = [
    "Analyzing request...",
    "Searching knowledge base...",
    "Evaluating search results...",
    "Formulating reasoning...",
    "Drafting response...",
    "Synthesizing information..."
];

/* Deliberately chrome-free — no background, no border, no circle behind the
   icon. See memory_project/thinking_ui_redesign.md; that shape is a standing
   decision, so only the colour tokens changed here. Kept structurally identical
   to ThinkingBlock in DisplaySummery so the reasoning trace does not visibly
   change shape at the moment the stream starts arriving. */
const ThinkingProcess = ({ isComplete = false }) => {
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(!isComplete);

    useEffect(() => {
        if (isComplete) return;
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isComplete]);

    return (
        <div className="not-prose mb-5 flex w-full flex-col group/thinking">
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className={`-mx-1 flex w-fit cursor-pointer select-none items-center gap-2
                            rounded-control px-1 py-0.5 text-ink-3 transition-colors
                            hover:text-ink-2 ${FOCUS_RING}`}
            >
                <Brain className="h-4 w-4" aria-hidden="true" />
                <span className="text-[0.9375rem] font-medium">
                    {isComplete ? 'Reasoning' : 'Thinking…'}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </motion.div>
            </button>

            {isOpen && (
                <div className="relative ml-[7px] mt-2 pl-5">
                    <div className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-line-strong" />

                    <div className={`${MEASURE} w-full font-sans text-[0.9375rem] leading-[1.7] text-ink-2`}>
                        {!isComplete ? (
                            <motion.div
                                key={phraseIndex}
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center gap-2"
                            >
                                <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ink-3" />
                                {THINKING_PHRASES[phraseIndex]}
                            </motion.div>
                        ) : (
                            <span>Reasoning process complete.</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AnswerDisplay = ({ searchResult, isLatestMessage = false, isLoadingAnswer = false, researchProgress = null, selectedAppId = null, isThinkingMode = false }) => {
    // Add state to force re-renders when searchResult changes
    const [currentSearchResult, setCurrentSearchResult] = useState(searchResult);

    // Track previous aiResp to avoid unnecessary re-renders
    const prevAiRespRef = useRef(searchResult?.aiResp)

    useEffect(() => {
        if (!searchResult) return

        // Only update state if something actually changed
        const aiRespChanged = searchResult.aiResp !== prevAiRespRef.current
        const isNewResult = searchResult.id !== currentSearchResult?.id

        if (aiRespChanged || isNewResult) {
            prevAiRespRef.current = searchResult.aiResp
            setCurrentSearchResult(searchResult)
        }
    }, [searchResult, searchResult?.aiResp, searchResult?.id]) // Also depend on aiResp specifically

    // Get the mixed results or categorized web results
    const rawResults = currentSearchResult?.searchResult;
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
        if (Array.isArray(currentSearchResult?.categorizedResults?.web)) {
            webResults = currentSearchResult.categorizedResults.web;
        } else if (Array.isArray(currentSearchResult?.mixedResults)) {
            webResults = currentSearchResult.mixedResults.filter(item => item?.resultType === 'web');
        }
    }

    // Check if this is a file analysis result
    const processedFiles = Array.isArray(currentSearchResult?.processedFiles) ? currentSearchResult.processedFiles : [];
    const isFileAnalysis = currentSearchResult?.analyzedFilesCount > 0 ||
        (processedFiles.length > 0) ||
        (webResults?.length > 0 && webResults[0]?.type === 'file_analysis');
    const analyzedFilesCount = currentSearchResult?.analyzedFilesCount || 0;

    // Detect research mode via enriched source fields (no longer relying on metadata column)
    const isResearchResult = webResults.some(item => item?.deepResearch || item?.summary || (item?.keyPoints && item.keyPoints.length > 0));
    const researchMetadata = {
        enrichedSources: webResults.filter(item => item.summary).length,
        totalSources: webResults.length
    };
    const researchInsights = webResults.find(item => item?.researchInsights)?.researchInsights || null;
    const phaseDurationsMs = researchInsights?.phaseDurationsMs || null;

    const [canvaProgress, setCanvaProgress] = useState(0);

    useEffect(() => {
        if (selectedAppId !== 'canva' || !isLoadingAnswer) {
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
    }, [selectedAppId, isLoadingAnswer]);

    const CanvaLoadingCard = () => (
        <div
            className="relative flex aspect-21/9 w-full max-w-5xl overflow-hidden rounded-xl p-5 sm:aspect-[1.9/1] sm:p-6"
            style={{
                background: 'linear-gradient(145deg, #54575E 0%, #28292B 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 20px 40px -16px rgba(0,0,0,0.55)',
            }}
            role="status"
            aria-live="polite"
            aria-label={`Generating design, ${Math.round(canvaProgress)} percent complete`}
        >
            <motion.div
                className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/4 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeIn' }}
            />

            <div className="relative z-10 flex w-full items-start justify-between text-[#a0a3aa]">
                <ImageIcon className="h-5 w-5 opacity-80 sm:h-6 sm:w-6" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-sm font-medium tabular-nums sm:text-base">{Math.round(canvaProgress)}%</span>
            </div>
        </div>
    );

    return (
        <div className="min-w-0 w-full overflow-hidden">
            <div className="min-w-0">

                {/* Deep Research header — the same badge the composer uses, so the
                    mode is recognisable from either end of the conversation. */}
                {isResearchResult && (
                    <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <div className={RESEARCH_BADGE}>
                            <Atom className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className={LABEL}>Deep Research</span>
                        </div>
                        <span className="text-[0.75rem] text-ink-3 tabular-nums">
                            {researchMetadata.enrichedSources}/{researchMetadata.totalSources} sources analyzed
                            {phaseDurationsMs && ` · ${Math.round((phaseDurationsMs.total || 0) / 1000)}s`}
                        </span>
                    </div>
                )}

                {/* AI Response Section - Now properly contained and scrollable */}
                {isLoadingAnswer ? (
                    <div className="w-full min-w-0 space-y-3 py-1">
                        {researchProgress?.message && (
                            <div className={PROGRESS_BADGE} role="status" aria-live="polite">
                                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" />
                                <span className="text-[0.75rem] font-medium">{researchProgress.message}</span>
                            </div>
                        )}

                        {/* Canva Design Generation Loading */}
                        {selectedAppId === 'canva' ? (
                            <div className="space-y-4">
                                <CanvaLoadingCard />
                            </div>
                        ) : isThinkingMode ? (
                            <ThinkingProcess isComplete={false} />
                        ) : (
                            /* Placeholder lines are sized to the real body rhythm
                               (16px text on a 28px baseline) so the answer does
                               not jump when it replaces them. */
                            <div
                                className={`${MEASURE} space-y-3`}
                                role="status"
                                aria-live="polite"
                            >
                                <span className="sr-only">Generating answer…</span>
                                <div className="h-4 w-[88%] animate-pulse rounded-full bg-hover-2" />
                                <div className="h-4 w-[72%] animate-pulse rounded-full bg-hover-2 [animation-delay:150ms]" />
                                <div className="h-4 w-[80%] animate-pulse rounded-full bg-hover-2 [animation-delay:300ms]" />
                                <div className="h-4 w-[45%] animate-pulse rounded-full bg-hover-2 [animation-delay:450ms]" />
                            </div>
                        )}
                    </div>
                ) : currentSearchResult?.aiResp ? (
                    <div className="min-w-0 w-full overflow-hidden">
                        <DisplaySummery
                            key={`summary-${currentSearchResult?.id}`}
                            aiResp={currentSearchResult?.aiResp}
                            usedModel={currentSearchResult?.usedModel}
                            modelApi={currentSearchResult?.modelApi}
                            isFileAnalysis={isFileAnalysis}
                            analyzedFilesCount={analyzedFilesCount}
                            isLatestMessage={isLatestMessage}
                            resultId={currentSearchResult?.id}
                            isThinkingMode={isThinkingMode}
                        />
                    </div>
                ) : null}

            </div>
        </div>
    )
}

export default AnswerDisplay
