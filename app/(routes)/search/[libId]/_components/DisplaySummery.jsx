'use client'

import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Copy, Check, Cpu } from 'lucide-react';

function DisplaySummery({ aiResp, usedModel, modelApi, isFileAnalysis, analyzedFilesCount }) {
    const [copiedStates, setCopiedStates] = useState({});
    const [currentAiResp, setCurrentAiResp] = useState(aiResp);

    // Update local state when aiResp prop changes
    useEffect(() => {
        if (aiResp !== currentAiResp) {
            setCurrentAiResp(aiResp);
        }
    }, [aiResp]);

    const copyToClipboard = async (text, codeBlockId) => {
        try {
            // Check if the clipboard API is available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (!successful) {
                    throw new Error('Copy command failed');
                }
            }
            
            setCopiedStates(prev => ({ ...prev, [codeBlockId]: true }));

            // Reset the copied state after 2 seconds
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [codeBlockId]: false }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            
            // Show a fallback message or prompt user to copy manually
            alert('Copy failed. Please select and copy the text manually.');
        }
    };
    return (
        <div className="w-full max-w-none min-w-0 overflow-hidden">
            {/* Model Information Header */}
            {/* {usedModel && (
                <div className="flex items-center gap-2 mb-4 p-2 md:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 not-prose min-w-0">
                    <Cpu className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-300 min-w-0 truncate">
                        Response by <span className="font-semibold text-gray-800 dark:text-white">{usedModel}</span>
                        {modelApi && modelApi !== 'unknown' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">({modelApi})</span>
                        )}
                    </span>
                </div>
            )} */}
            
            <div className="prose prose-gray prose-sm sm:prose-base lg:prose-lg prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline max-w-none min-w-0 overflow-hidden">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                    h1: ({ node, ...props }) => (
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-3 md:mb-6 mt-4 md:mt-8 leading-tight border-b-2 border-gray-200 dark:border-gray-600 pb-2 md:pb-3 wrap-break-word" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-700 dark:text-white mb-2 md:mb-4 mt-3 md:mt-6 leading-tight wrap-break-word" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-700 dark:text-white mt-2 md:mt-5 mb-2 md:mb-3 leading-tight wrap-break-word" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                        <h4 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-gray-700 dark:text-white mt-2 md:mt-4 mb-2 leading-tight wrap-break-word" {...props} />
                    ),
                    h5: ({ node, ...props }) => (
                        <h5 className="text-sm sm:text-base md:text-lg font-medium text-gray-700 dark:text-white mt-2 md:mt-3 mb-2 leading-tight wrap-break-word" {...props} />
                    ),
                    h6: ({ node, ...props }) => (
                        <h6 className="text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-white mt-2 mb-1 leading-tight wrap-break-word" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                        <p className="text-gray-700 dark:text-white leading-relaxed mb-2 md:mb-4 text-sm sm:text-base wrap-break-word" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                        <a
                            className="text-blue-600 underline hover:text-blue-800 transition-colors duration-200 font-medium wrap-break-word"
                            target="_blank"
                            rel="noreferrer"
                            {...props}
                        />
                    ),
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside ml-4 sm:ml-6 space-y-1 sm:space-y-2 mb-3 md:mb-4 text-gray-700 dark:text-white text-sm sm:text-base" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-outside ml-4 sm:ml-6 space-y-1 sm:space-y-2 mb-3 md:mb-4 text-gray-700 dark:text-white text-sm sm:text-base" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                        <li className="mb-1 leading-relaxed dark:text-white wrap-break-word" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-l-4 border-blue-400 dark:border-blue-300 p-3 md:p-4 rounded-r-lg text-gray-700 dark:text-white leading-relaxed mb-4 md:mb-6 italic text-sm sm:text-base wrap-break-word" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                        <hr className="my-6 md:my-8 border-gray-300 dark:border-gray-600" {...props} />
                    ),
                    // Enhanced Table Styling
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto mb-3 md:mb-6 -mx-2 sm:-mx-3 md:mx-0 scroll-smooth">
                            <table className="min-w-full text-xs sm:text-sm md:text-base text-gray-700 dark:text-white border-collapse border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-gray-50 dark:bg-gray-700" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-3 md:px-4 py-2 md:py-3 text-left font-semibold text-gray-800 dark:text-white text-xs sm:text-sm md:text-base wrap-break-word" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-3 md:px-4 py-2 md:py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 text-xs sm:text-sm md:text-base dark:text-white wrap-break-word" {...props} />
                    ),
                    // Enhanced Code Block Styling
                    code: ({ node, inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');

                        if (!inline && match) {
                            const codeString = String(children).replace(/\n$/, '');
                            const codeBlockId = `code-${Math.random().toString(36).substr(2, 9)}`;
                            const isCopied = copiedStates[codeBlockId];

                            return (
                                <div className="mb-4 md:mb-6 relative group">
                                    <div className="bg-gray-800 text-gray-300 px-2 sm:px-3 md:px-4 py-2 text-sm font-mono rounded-t-lg border-b border-gray-600 flex items-center justify-between min-w-0">
                                        <span className="text-xs sm:text-sm truncate">{match[1].toUpperCase()}</span>
                                        <button
                                            onClick={() => copyToClipboard(codeString, codeBlockId)}
                                            className="flex items-center gap-1 sm:gap-2 px-2 md:px-3 py-1 cursor-pointer text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-all duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-manipulation shrink-0"
                                            title={isCopied ? "Copied!" : "Copy code"}
                                            type="button"
                                        >
                                            {isCopied ? (
                                                <>
                                                    <Check className="w-3 h-3 shrink-0" />
                                                    <span className="hidden sm:inline">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 shrink-0" />
                                                    <span className="hidden sm:inline">Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto scroll-smooth">
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            className="rounded-b-lg text-xs sm:text-sm md:text-base"
                                            showLineNumbers={true}
                                            lineNumberStyle={{
                                                minWidth: '2em',
                                                paddingRight: '0.5em',
                                                color: '#6b7280',
                                                borderRight: '1px solid #374151',
                                                marginRight: '0.5em',
                                                fontSize: '0.75rem'
                                            }}
                                            customStyle={{
                                                margin: 0,
                                                fontSize: '0.75rem',
                                                lineHeight: '1rem',
                                                maxWidth: '100%'
                                            }}
                                        >
                                            {codeString}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <code
                                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-1 sm:px-2 py-1 rounded-md text-xs sm:text-sm font-mono border dark:border-gray-600 wrap-break-word"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Task list styling
                    input: ({ node, ...props }) => {
                        if (props.type === 'checkbox') {
                            return (
                                <input
                                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    {...props}
                                />
                            );
                        }
                        return <input {...props} />;
                    },
                    // Strong and emphasis styling
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-gray-800 dark:text-white" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                        <em className="italic text-gray-700 dark:text-white" {...props} />
                    ),
                }}
            >
                {currentAiResp}
            </ReactMarkdown>
            </div>
        </div>
    )
}

export default DisplaySummery
