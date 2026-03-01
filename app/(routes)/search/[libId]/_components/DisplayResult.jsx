'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo, useDeferredValue, startTransition } from 'react'
import { Loader2Icon, LucideImage, LucideList, LucideSparkles, LucideVideo, Send, Mic, MicOff, Cpu, Atom, SearchCheck, Copy, ThumbsUp, ThumbsDown, VolumeX, Volume2, Check, ArrowDown, Paperclip, Upload, X, FileText, FileImage, File, Crown } from 'lucide-react';
import AnswerDisplay from './AnswerDisplay';
import SourceList from './sourceList';
import axios from 'axios';
// import { SEARCH_RESULT } from '@/services/Shared';
import { supabase } from '@/services/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModel } from '@/contexts/ModelContext';
import { v4 as uuidv4 } from 'uuid';
import ImageList from './ImageList';
import VideoList from './VideoList';
import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIModelsOption } from '@/services/Shared';
import { useUserPlan } from '@/hooks/useUserPlan';

// Debounce utility function to prevent excessive function calls
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Highly optimized textarea component with React.memo to prevent unnecessary re-renders
const OptimizedTextarea = React.memo(({ 
    value, 
    onChange, 
    placeholder, 
    disabled, 
    onKeyDown,
    textareaRef 
}) => {
    // Local state for immediate UI responsiveness
    const [localValue, setLocalValue] = useState(value || '');
    const localRef = useRef(null);
    
    // Auto-resize function with minimal DOM manipulation
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef?.current || localRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 144); // 6 lines max
            textarea.style.height = newHeight + 'px';
            textarea.style.overflowY = newHeight >= 144 ? 'scroll' : 'hidden';
        }
    }, [textareaRef]);
    
    // Debounced height adjustment
    const debouncedAdjustHeight = useMemo(
        () => debounce(adjustHeight, 50),
        [adjustHeight]
    );
    
    // Handle input with immediate local state update
    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedAdjustHeight();
        
        // Defer the parent state update to prevent blocking
        startTransition(() => {
            onChange?.(e);
        });
    }, [onChange, debouncedAdjustHeight]);
    
    // Sync with external value changes
    useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value || '');
        }
    }, [value]);
    
    // Initial height adjustment
    useEffect(() => {
        adjustHeight();
    }, [localValue, adjustHeight]);
    
    return (
        <textarea
            ref={textareaRef || localRef}
            value={localValue}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className='w-full p-2 outline-none resize-none min-h-9 text-sm md:text-base leading-relaxed scrollbar-hide overflow-hidden dark:text-white dark:placeholder-gray-400'
            rows={1}
            style={{ overflow: 'hidden' }}
        />
    );
});

OptimizedTextarea.displayName = 'OptimizedTextarea';

// Memoized display components to reduce rerenders
const MemoizedAnswerDisplay = React.memo(AnswerDisplay);
const MemoizedSourceList = React.memo(SourceList);
const MemoizedImageList = React.memo(ImageList);
const MemoizedVideoList = React.memo(VideoList);

// Memoized Tabs Header to prevent icon flicker while typing
const TabsHeader = React.memo(function TabsHeader({ activeTab, setActiveTab, tabsWithBadges }) {
    return (
        <div className="flex items-center space-x-3 md:space-x-6 border-b border-gray-200 dark:border-gray-600 pb-2 mt-4 md:mt-6 overflow-x-auto scrollbar-hide">
            {tabsWithBadges.map(({ label, icon: Icon, badgeCount }) => (
                <button
                    key={label}
                    onClick={() => setActiveTab(label)}
                    className={`flex items-center gap-1 relative text-xs md:text-sm cursor-pointer font-medium text-gray-700 dark:text-white hover:text-black dark:hover:text-white ${activeTab === label ? 'text-black dark:text-white' : ''} whitespace-nowrap shrink-0 px-1`}
                >
                    <Icon className="w-3 h-3 md:w-4 md:h-4" />
                    <span>{label}</span>
                    {badgeCount && badgeCount > 0 && (
                        <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white px-1 md:px-1.5 py-0.5 rounded">
                            {badgeCount}
                        </span>
                    )}
                    {activeTab === label && (
                        <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-black dark:bg-white rounded"></span>
                    )}
                </button>
            ))}
            <div className="ml-auto text-xs md:text-sm text-gray-500 cursor-pointer whitespace-nowrap shrink-0 pl-2">
                <span className="hidden sm:inline">1 task</span>
                <span className="sm:hidden">1</span>
                <span className="ml-1">&gt;</span>
            </div>
        </div>
    );
});

TabsHeader.displayName = 'TabsHeader';

// OPTIMIZATION: Memoized tabs constant
// Note: Sources tab is temporarily hidden as per user request
const tabs = [
    {
        label: 'Answer', icon: LucideSparkles
    },
    // {
    //     label: 'Sources', icon: LucideList
    // },
    {
        label: 'Images', icon: LucideImage
    },
    {
        label: 'Videos', icon: LucideVideo
    },
    {
        label: 'Sources', icon: LucideList
    },
];

function DisplayResult({ searchInputRecord }) {

    const [activeTab, setActiveTab] = useState('Answer');
    const [searchResult, setSearchResult] = useState(searchInputRecord);
    const [titleFontSize, setTitleFontSize] = useState('text-3xl');
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger
    const [pollingInterval, setPollingInterval] = useState(null); // Add polling interval for real-time updates
    
    // OPTIMIZATION: Separate user input state from search-triggering state
    const [userInput, setUserInput] = useState(''); // Only for display, doesn't trigger renders
    const deferredUserInput = useDeferredValue(userInput); // Deferred value for performance
    const [submittedQuery, setSubmittedQuery] = useState(''); // Only updates when user submits
    
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchType, setSearchType] = useState("search");
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const [copiedText, setCopiedText] = useState(null);
    const [chatReactions, setChatReactions] = useState({});
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [fileUploadError, setFileUploadError] = useState('');
    const [showFileUpload, setShowFileUpload] = useState(false);
    
    // Refs
    const titleRef = useRef(null);
    const textareaRef = useRef(null);
    const speechSynthesisRef = useRef(null);
    const scrollContainerRef = useRef(null);
    
    // Context and hooks
    const { libId } = useParams();
    const router = useRouter();
    const { currentUser } = useAuth();
    const { selectedModel, updateSelectedModel } = useModel();
    const { isPro } = useUserPlan();

    // OPTIMIZATION: Memoized constants to prevent recreation
    const ALLOWED_FILE_TYPES = useMemo(() => ({
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
        'text/csv': ['.csv'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png']
    }), []);
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // OPTIMIZATION: Memoized file icon function to prevent recreation
    const getFileIcon = useCallback((file) => {
        if (file.type.startsWith('image/')) {
            return <FileImage className="w-3 h-3 text-blue-500" />;
        } else if (file.type === 'application/pdf') {
            return <FileText className="w-3 h-3 text-red-500" />;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return <FileText className="w-3 h-3 text-blue-600" />;
        } else if (file.type === 'text/plain' || file.type === 'text/csv') {
            return <FileText className="w-3 h-3 text-green-500" />;
        }
        return <File className="w-3 h-3 text-gray-500" />;
    }, []);

    // OPTIMIZATION: Memoized validate file function
    const validateFile = useCallback((file) => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return `File "${file.name}" is too large. Maximum size is 10MB.`;
        }

        // Check file type
        const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES);
        if (!allowedMimeTypes.includes(file.type)) {
            return `File type "${file.type}" is not supported. Allowed types: .pdf, .docx, .txt, .csv, .jpg, .png`;
        }

        return null;
    }, [ALLOWED_FILE_TYPES, MAX_FILE_SIZE]);

    // OPTIMIZATION: Memoized upload function — routes through /api/upload-file to bypass storage RLS
    const uploadFileToStorage = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser?.uid || 'anonymous');

            const response = await fetch('/api/upload-file', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Upload failed');
            }

            return {
                path: result.path,
                publicUrl: result.publicUrl,
                fileName: result.fileName,
                fileType: result.fileType,
                fileSize: result.fileSize,
            };
        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
    }, [currentUser?.uid]);

    // Handle file drop
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        const handleFileDrop = async () => {
            setFileUploadError('');

            // Handle rejected files
            if (rejectedFiles.length > 0) {
                const errors = rejectedFiles.map(({ file, errors }) => {
                    return errors.map(error => {
                        if (error.code === 'file-too-large') {
                            return `${file.name}: File is too large (max 10MB)`;
                        } else if (error.code === 'file-invalid-type') {
                            return `${file.name}: Invalid file type`;
                        }
                        return `${file.name}: ${error.message}`;
                    }).join(', ');
                }).join('; ');
                setFileUploadError(errors);
                toast.error(errors);
                return;
            }

            // Validate files
            const validationErrors = [];
            acceptedFiles.forEach(file => {
                const error = validateFile(file);
                if (error) {
                    validationErrors.push(error);
                }
            });

            if (validationErrors.length > 0) {
                const errorMessage = validationErrors.join('; ');
                setFileUploadError(errorMessage);
                toast.error(errorMessage);
                return;
            }

            // Upload files
            for (const file of acceptedFiles) {
                const fileId = uuidv4();
                
                try {
                    // Initialize progress
                    setUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 0
                    }));

                    // Simulate progress (since Supabase doesn't provide real-time progress)
                    const progressInterval = setInterval(() => {
                        setUploadProgress(prev => ({
                            ...prev,
                            [fileId]: Math.min((prev[fileId] || 0) + Math.random() * 30, 90)
                        }));
                    }, 200);

                    // Upload file
                    const uploadResult = await uploadFileToStorage(file);

                    // Complete progress
                    clearInterval(progressInterval);
                    setUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 100
                    }));

                    // Add to uploaded files list
                    setUploadedFiles(prev => [...prev, {
                        id: fileId,
                        file,
                        uploadResult,
                        status: 'completed'
                    }]);

                    // Show success notification
                    toast.success(`${file.name} uploaded successfully!`);

                    // Remove progress after delay
                    setTimeout(() => {
                        setUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[fileId];
                            return newProgress;
                        });
                    }, 2000);

                } catch (error) {
                    console.error('Upload error:', error);
                    setFileUploadError(error.message);
                    toast.error(`Failed to upload ${file.name}: ${error.message}`);
                    
                    // Remove failed file from progress
                    setUploadProgress(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[fileId];
                        return newProgress;
                    });
                }
            }
        };

        // Call the async function
        handleFileDrop();
    }, [currentUser]);

    // OPTIMIZATION: Memoized dropzone configuration
    const dropzoneConfig = useMemo(() => ({
        onDrop,
        accept: ALLOWED_FILE_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: true
    }), [ALLOWED_FILE_TYPES, MAX_FILE_SIZE]);

    // Dropzone configuration
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject
    } = useDropzone(dropzoneConfig);

    // OPTIMIZATION: Memoized remove file function — routes through /api/upload-file to bypass storage RLS
    const removeFile = useCallback((fileId) => {
        const handleRemoveFile = async () => {
            const fileToRemove = uploadedFiles.find(f => f.id === fileId);
            if (fileToRemove?.uploadResult?.path) {
                try {
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: fileToRemove.uploadResult.path }),
                    });
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }

            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        };

        handleRemoveFile();
    }, [uploadedFiles]);

    // OPTIMIZATION: Ultra-simple input handlers for maximum performance
    const handleUserInputChange = useCallback((e) => {
        setUserInput(e.target.value);
    }, []);

    // NOTE: handleKeyDown and handleSendClick will be defined after GetSearchApiResult

    // OPTIMIZATION: Additional handler functions
    const handleSearchTypeChange = useCallback((type) => {
        setSearchType(type);
    }, []);

    const handleFileUploadToggle = useCallback(() => {
        setShowFileUpload(!showFileUpload);
    }, [showFileUpload]);

    const handleModelSelect = useCallback((modelId) => {
        updateSelectedModel(modelId);
    }, [updateSelectedModel]);

    // OPTIMIZATION: Memoized function to check if conversation has file context
    const hasConversationFiles = useCallback(() => {
        const conversationFiles = localStorage.getItem(`conversation_files_${libId}`);
        if (conversationFiles) {
            try {
                const files = JSON.parse(conversationFiles);
                return files && files.length > 0;
            } catch (e) {
                return false;
            }
        }
        return false;
    }, [libId]);

    // OPTIMIZATION: Memoized function to clear conversation files
    const clearConversationFiles = useCallback(() => {
        try {
            localStorage.removeItem(`conversation_files_${libId}`);
            // Force a re-render to update UI
            setRefreshTrigger(prev => prev + 1);
            toast.success('Conversation files cleared');
        } catch (e) {
            console.error('Failed to clear conversation files:', e);
        }
    }, [libId]);

    // OPTIMIZATION: Memoized function to get conversation files
    const getConversationFiles = useCallback(() => {
        const conversationFiles = localStorage.getItem(`conversation_files_${libId}`);
        if (conversationFiles) {
            try {
                return JSON.parse(conversationFiles);
            } catch (e) {
                return [];
            }
        }
        return [];
    }, [libId]);

    // OPTIMIZATION: Memoized helper function
    const stripHtmlTags = useCallback((html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }, []);

    // OPTIMIZATION: Memoized font adjustment function
    const adjustFontSize = useCallback(() => {
        if (titleRef.current) {
            const element = titleRef.current;
            const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
            const height = element.scrollHeight;
            const lines = Math.round(height / lineHeight);
            const isMobile = window.innerWidth < 768;

            // console.log('Lines detected:', lines);

            if (isMobile) {
                // More aggressive sizing for mobile
                if (lines === 1) {
                    setTitleFontSize('text-xl md:text-3xl'); // Smaller on mobile
                } else if (lines === 2) {
                    setTitleFontSize('text-lg md:text-xl'); // Responsive sizing
                } else if (lines === 3) {
                    setTitleFontSize('text-base md:text-lg'); // 16px mobile, larger desktop
                } else if (lines >= 4) {
                    setTitleFontSize('text-sm md:text-base'); // 14px mobile
                }
            } else {
                // Desktop sizing (original logic)
                if (lines === 1) {
                    setTitleFontSize('text-xl md:text-3xl'); // Default size (30px)
                } else if (lines === 2) {
                    setTitleFontSize('text-lg md:text-xl'); // Half size (20px)
                } else if (lines === 3) {
                    setTitleFontSize('text-base md:text-lg'); // 16px
                } else if (lines >= 4) {
                    setTitleFontSize('text-sm md:text-base'); // 12px
                }
            }
        }
    }, []);

    // OPTIMIZATION: Core async functions moved here to be available for useEffect hooks
    
    // OPTIMIZATION: Memoized GetSearchRecords function
    const GetSearchRecords = useCallback(async () => {
        let { data: Library, error } = await supabase
            .from('Library')
            .select(`
                *,
                Chats(*)
            `)
            .eq('libId', libId)

        if (error) {
            console.error('Error fetching data:', error);
            return;
        }

        // console.log('Updated Library data:', Library[0]);
        setSearchResult(Library[0]);
        setRefreshTrigger(prev => prev + 1); // Force component refresh

        // Load reactions for each chat
        if (Library[0]?.Chats) {
            const reactions = {};
            Library[0].Chats.forEach(chat => {
                reactions[chat.id] = {
                    liked: chat.liked || false,
                    disliked: chat.disliked || false
                };
            });
            setChatReactions(reactions);
        }

        // Return the updated data for immediate use
        return Library[0];
    }, [libId]);

    // OPTIMIZATION: Memoized startPollingForUpdates function
    const startPollingForUpdates = useCallback(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const interval = setInterval(async () => {
            try {
                const { data: updatedLibrary, error } = await supabase
                    .from('Library')
                    .select(`
                        *,
                        Chats(*)
                    `)
                    .eq('libId', libId)
                    .single();

                if (!error && updatedLibrary) {
                    const currentChats = searchResult?.Chats || [];
                    const updatedChats = updatedLibrary?.Chats || [];
                    
                    // Check if any chat has received an AI response by comparing chat IDs
                    const hasNewAiResponse = updatedChats.some(updatedChat => {
                        const currentChat = currentChats.find(c => c.id === updatedChat.id);
                        return currentChat && !currentChat.aiResp && updatedChat.aiResp;
                    });

                    // Check if all chats now have AI responses
                    const allChatsHaveAiResp = updatedChats.length > 0 && updatedChats.every(chat => chat.aiResp);

                    if (hasNewAiResponse || allChatsHaveAiResp) {
                        // Update the search result state immediately to trigger re-render
                        setSearchResult(updatedLibrary);
                        setRefreshTrigger(prev => prev + 1);
                        
                        // Update reactions state
                        const reactions = {};
                        updatedChats.forEach(chat => {
                            reactions[chat.id] = {
                                liked: chat.liked || false,
                                disliked: chat.disliked || false
                            };
                        });
                        setChatReactions(reactions);

                        // CRITICAL FIX: Set loadingSearch to false when AI response arrives
                        // This ensures previous messages don't show loading state
                        if (hasNewAiResponse || allChatsHaveAiResp) {
                            setLoadingSearch(false);
                        }

                        // Stop polling if all chats have AI responses
                        if (allChatsHaveAiResp) {
                            clearInterval(interval);
                            setPollingInterval(null);
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling for updates:', error);
            }
        }, 1500); // Poll every 1.5 seconds for faster updates

        setPollingInterval(interval);

        // Auto-stop polling after 5 minutes to prevent infinite polling
        setTimeout(() => {
            clearInterval(interval);
            setPollingInterval(null);
            setLoadingSearch(false); // Also set to false on timeout
        }, 5 * 60 * 1000);
    }, [libId, searchResult, pollingInterval]);

    // OPTIMIZATION: Memoized GenerateAIResp function
    const GenerateAIResp = useCallback(async (formattedSearchResp, recordId, useDirectModel = false) => {
        try {
            // console.log('Starting AI response generation for record ID:', recordId);
            
            // Get the search input - prioritize deferredUserInput for new searches, fallback to searchInputRecord
            const searchInput = deferredUserInput?.trim() || searchInputRecord?.searchInput;
            // console.log('Search input for AI:', searchInput);

            if (!searchInput?.trim()) {
                console.warn('No search input provided for AI generation');
                setLoadingSearch(false);
                return;
            }

            // console.log('Calling LLM model API...');
            const result = await axios.post('/api/llm-model', {
                searchInput: searchInput,
                searchResult: formattedSearchResp,
                recordId: recordId,
                selectedModel: selectedModel,
                isPro: isPro, // Pass user plan status for Auto model selection
                useDirectModel: useDirectModel // Flag to indicate Google API failed, use direct model
            });

            // console.log('LLM API response:', result.status, result.data);

            // Get the runId from the response
            const runId = result.data; // This should contain the Inngest run ID

            // Validate runId before starting status checks
            if (!runId) {
                console.error('No runId received from LLM API');
                throw new Error('No runId received from LLM API');
            }

            console.log('Starting status check for runId:', runId);

            let statusCheckCount = 0;
            const maxStatusChecks = 60; // Stop after 60 checks (about 5 minutes)

            const interval = setInterval(async () => {
                statusCheckCount++;
                
                // Stop checking after max attempts
                if (statusCheckCount > maxStatusChecks) {
                    // console.log('Status check timeout reached, stopping...');
                    clearInterval(interval);
                    setLoadingSearch(false);
                    return;
                }

                try {
                    // console.log(`Status check attempt ${statusCheckCount} for runId:`, runId);
                    
                    // Use the runId to check status
                    const runResp = await axios.post('/api/get-inngest-status', 
                        { runId: runId },
                        { 
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 10000 
                        }
                    );

                    // console.log('Status check response:', runResp.status, runResp.data);

                    if (runResp?.data?.data?.[0]?.status == 'completed') {
                        // console.log('AI response generation completed!');
                        clearInterval(interval);
                        
                        // CRITICAL FIX: Set loadingSearch to false BEFORE fetching updated data
                        // This ensures UI updates immediately when response arrives
                        setLoadingSearch(false);

                        // Refresh the search records to get the updated AI response
                        // console.log('Refreshing search records...');
                        await GetSearchRecords();

                        // Get updated Data from Db and update state immediately
                        const { data: updatedData, error } = await supabase
                            .from('Chats')
                            .select('*')
                            .eq('id', recordId)
                            .single();

                        if (updatedData && updatedData.aiResp) {
                            // console.log('Updated chat data received:', updatedData);
                            
                            // Update the current searchResult state immediately for instant UI update
                            setSearchResult(prevResult => {
                                if (prevResult?.Chats) {
                                    const updatedChats = prevResult.Chats.map(chat => 
                                        chat.id === recordId ? { ...chat, aiResp: updatedData.aiResp } : chat
                                    );
                                    return { ...prevResult, Chats: updatedChats };
                                }
                                return prevResult;
                            });
                            
                            // Trigger re-render with new timestamp to force update
                            setRefreshTrigger(prev => prev + 1);
                            
                            // Then refresh the entire library to ensure consistency
                            await GetSearchRecords();
                        } else if (error) {
                            console.error('Error fetching updated chat data:', error);
                        }
                    } else if (runResp?.data?.data?.[0]?.status == 'failed') {
                        // Handle failed status
                        console.error('AI response generation failed');
                        clearInterval(interval);
                        setLoadingSearch(false);
                        throw new Error('AI response generation failed');
                    } else {
                        // console.log(`AI generation still running, status: ${runResp?.data?.data?.[0]?.status || 'unknown'}`);
                    }

                } catch (statusError) {
                    console.error('Error checking status:', statusError);
                    
                    // If it's a specific JSON parsing error, stop trying
                    if (statusError.message?.includes('JSON') || statusError.response?.status === 400) {
                        console.error('Invalid request format, stopping status checks');
                        clearInterval(interval);
                        setLoadingSearch(false);
                        throw new Error('Invalid status check request format');
                    }
                    
                    // For other errors, continue trying but log them
                    // console.log('Will retry status check...');
                }

            }, 2000); // Check every 2 seconds

        } catch (error) {
            console.error('Error generating AI response:', error);
            
            // More specific error messages
            let errorMessage = 'AI response generation failed.';
            
            if (error.response?.status === 429) {
                errorMessage = 'Too many AI requests. Please wait and try again.';
            } else if (error.response?.status === 503) {
                // Service unavailable - likely Inngest not running
                errorMessage = error.response?.data?.details 
                    ? `AI service unavailable: ${error.response.data.details}`
                    : 'AI processing service is currently unavailable. Please try again later.';
            } else if (error.response?.status >= 500) {
                errorMessage = error.response?.data?.error || 'AI service temporarily unavailable. Please try again.';
            } else if (error.response?.status === 400) {
                errorMessage = 'Invalid request. Please check your input and try again.';
            } else if (error.message?.includes('No runId')) {
                errorMessage = 'AI service configuration error. Please contact support.';
            } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
                errorMessage = 'Cannot connect to AI service. Please check your internet connection.';
            }
            
            toast.error(errorMessage);
            setLoadingSearch(false);
            throw error;
        }
    }, [deferredUserInput, searchInputRecord, selectedModel, GetSearchRecords]);

    // OPTIMIZATION: Memoized main search function with enhanced file analysis integration
    // Features:
    // 1. Files persist throughout the conversation for repeated analysis
    // 2. Conversation history is included in file analysis for context
    // 3. Smart detection of file-related questions to use existing files
    // 4. Unified file and web search flow for seamless user experience
    const GetSearchApiResult = useCallback(async () => {
        // console.log('Starting GetSearchApiResult...');
        
        // Start loading state
        setLoadingSearch(true);

        try {
            // Get the search input - prioritize deferredUserInput for new searches, fallback to searchInputRecord
            const searchInput = deferredUserInput?.trim() || searchInputRecord?.searchInput;
            // console.log('Search input:', searchInput);

            if (!searchInput?.trim()) {
                console.warn('No search input provided');
                setLoadingSearch(false);
                return;
            }

            // Check if this is a file analysis request (has uploaded files)
            let currentUploadedFiles = uploadedFiles.map(f => ({
                path: f.uploadResult.path,
                publicUrl: f.uploadResult.publicUrl,
                fileName: f.uploadResult.fileName,
                fileType: f.uploadResult.fileType,
                fileSize: f.uploadResult.fileSize
            }));
            
            let uploadedFilesForAnalysis = currentUploadedFiles.length > 0 ? currentUploadedFiles : searchInputRecord?.uploadedFiles;
            
            // Check for conversation-persistent files if no current files
            if (!uploadedFilesForAnalysis || uploadedFilesForAnalysis.length === 0) {
                // First check conversation-persistent files
                const storedConversationFiles = localStorage.getItem(`conversation_files_${libId}`);
                if (storedConversationFiles) {
                    try {
                        const conversationFiles = JSON.parse(storedConversationFiles);
                        if (conversationFiles && conversationFiles.length > 0) {
                            uploadedFilesForAnalysis = conversationFiles;
                            // console.log('Using conversation-persistent files:', uploadedFilesForAnalysis);
                        }
                    } catch (e) {
                        console.warn('Failed to parse conversation files from localStorage');
                    }
                }
                
                // Fallback to legacy file storage
                if (!uploadedFilesForAnalysis || uploadedFilesForAnalysis.length === 0) {
                    const storedFiles = localStorage.getItem(`files_${libId}`);
                    if (storedFiles) {
                        try {
                            uploadedFilesForAnalysis = JSON.parse(storedFiles);
                            // console.log('Loaded legacy files from localStorage:', uploadedFilesForAnalysis);
                        } catch (e) {
                            console.warn('Failed to parse legacy stored files from localStorage');
                            uploadedFilesForAnalysis = [];
                        }
                    }
                }
            }

            const hasFiles = uploadedFilesForAnalysis && uploadedFilesForAnalysis.length > 0;
            // console.log('Has files for analysis:', hasFiles, 'File count:', uploadedFilesForAnalysis?.length || 0);

            if (hasFiles) {
                // File analysis flow
                try {
                    // console.log('Starting file analysis with files:', uploadedFilesForAnalysis);
                    
                    // Get existing conversation history for context
                    const conversationHistory = searchResult?.Chats?.length > 0 ? searchResult.Chats : [];
                    
                    let result;
                    try {
                        // console.log('Calling /api/analyze...');
                        result = await axios.post('/api/analyze', {
                            prompt: searchInput,
                            filePaths: uploadedFilesForAnalysis,
                            libId: libId,
                            conversationHistory: conversationHistory // Add conversation context
                        });
                        // console.log('File analysis API response:', result.status, result.data);
                    } catch (analyzeError) {
                        console.warn('Main analyze endpoint failed:', analyzeError.response?.status, analyzeError.response?.data || analyzeError.message);
                        // console.log('Trying test endpoint...');
                        result = await axios.post('/api/analyze-test', {
                            prompt: searchInput,
                            filePaths: uploadedFilesForAnalysis,
                            libId: libId,
                            conversationHistory: conversationHistory // Add conversation context to fallback too
                        });
                        // console.log('File analysis test API response:', result.status, result.data);
                    }

                    const analysisResp = result.data;
                    // console.log('File analysis response received:', analysisResp);

                    const chatData = {
                        libId: libId,
                        searchResult: analysisResp.searchResult || [],
                        userSearchInput: searchInput || 'File Analysis',
                        aiResp: analysisResp.aiResponse || analysisResp.answer
                    };

                    // console.log('Inserting chat data for file analysis:', chatData);

                    const { data: insertedChat, error: chatError } = await supabase
                        .from('Chats')
                        .insert([chatData])
                        .select();

                    if (chatError) {
                        console.error('Error inserting file analysis chat:', chatError);
                        throw new Error(`Database insertion failed: ${chatError.message}`);
                    }

                    // console.log('Successfully inserted file analysis chat:', insertedChat[0]);

                    // Store files for future use in this conversation
                    if (uploadedFilesForAnalysis && uploadedFilesForAnalysis.length > 0) {
                        try {
                            localStorage.setItem(`conversation_files_${libId}`, JSON.stringify(uploadedFilesForAnalysis));
                            // console.log('Files stored for conversation:', libId);
                        } catch (e) {
                            console.warn('Failed to store files in localStorage:', e);
                        }
                    }

                    await GetSearchRecords();
                    setLoadingSearch(false);
                    
                    // Clear input after successful search and update submitted query
                    setUserInput('');
                    setSubmittedQuery(searchInput);

                } catch (error) {
                    console.error('File analysis failed:', error);
                    setLoadingSearch(false);
                    throw error;
                }

            } else {
                // Check if user is asking about files in a conversation that has previous file analysis
                const conversationFiles = localStorage.getItem(`conversation_files_${libId}`);
                let shouldUseFileAnalysis = false;
                let storedFiles = [];
                
                if (conversationFiles) {
                    try {
                        storedFiles = JSON.parse(conversationFiles);
                        // Check if the search input indicates file-related questions
                        const fileRelatedKeywords = ['file', 'document', 'image', 'pdf', 'analyze', 'uploaded', 'attachment', 'content'];
                        shouldUseFileAnalysis = fileRelatedKeywords.some(keyword => 
                            searchInput.toLowerCase().includes(keyword.toLowerCase())
                        );
                        
                        if (shouldUseFileAnalysis && storedFiles.length > 0) {
                            // console.log('Detected file-related question with existing files, using file analysis flow');
                            // Redirect to file analysis with conversation context
                            uploadedFilesForAnalysis = storedFiles;
                            
                            // Get existing conversation history for context
                            const conversationHistory = searchResult?.Chats?.length > 0 ? searchResult.Chats : [];
                            
                            let result = await axios.post('/api/analyze', {
                                prompt: searchInput,
                                filePaths: uploadedFilesForAnalysis,
                                libId: libId,
                                conversationHistory: conversationHistory
                            });
                            
                            const analysisResp = result.data;

                            const chatData = {
                                libId: libId,
                                searchResult: analysisResp.searchResult || [],
                                userSearchInput: searchInput,
                                aiResp: analysisResp.aiResponse || analysisResp.answer
                            };

                            const { data: insertedChat, error: chatError } = await supabase
                                .from('Chats')
                                .insert([chatData])
                                .select();

                            if (chatError) {
                                console.error('Error inserting file analysis chat:', chatError);
                                throw new Error(`Database insertion failed: ${chatError.message}`);
                            }

                            await GetSearchRecords();
                            setLoadingSearch(false);
                            
                            // Clear input after successful search and update submitted query
                            setUserInput('');
                            setSubmittedQuery(searchInput);
                            return; // Exit early since we handled this as file analysis
                        }
                    } catch (e) {
                        console.warn('Error processing conversation files:', e);
                    }
                }

                // Determine if this is Research mode or Search mode
                const currentSearchType = searchType || searchInputRecord?.type || 'search';
                const isResearchMode = currentSearchType === 'research';

                if (isResearchMode) {
                    // RESEARCH MODE: Deep, comprehensive analysis
                    // console.log('🔬 Starting RESEARCH mode for:', searchInput);

                    let researchResp;
                    try {
                        const result = await axios.post('/api/research', {
                            searchInput: searchInput,
                            selectedModel: selectedModel,
                            maxSources: 20,
                            includeDiversity: true,
                            user_email: currentUser?.email || null
                        });
                        researchResp = result.data;
                    } catch (apiError) {
                        console.error('Research API call failed:', apiError.message);
                        // Treat API call failure as Google API unavailable
                        researchResp = {
                            googleApiUnavailable: true,
                            useDirectModel: true,
                            searchResult: []
                        };
                    }

                    // console.log('📊 Research API response:', result.status, result.data);

                    if (!researchResp || !researchResp.searchResult) {
                        // If research failed, fallback to direct AI model
                        console.warn('Research API failed, using direct AI model');
                        const formattedSearchResp = [];
                        
                        const chatData = {
                            libId: libId,
                            searchResult: formattedSearchResp,
                            userSearchInput: searchInput
                        };

                        const { data: insertedChat, error: chatError } = await supabase
                            .from('Chats')
                            .insert([chatData])
                            .select();

                        if (chatError) {
                            console.error('Error inserting research chat:', chatError);
                            throw new Error(`Database insertion failed: ${chatError.message || JSON.stringify(chatError)}`);
                        }

                        await GetSearchRecords();
                        await GenerateAIResp(formattedSearchResp, insertedChat[0].id, true);
                        startPollingForUpdates();
                        return;
                    }

                    const formattedSearchResp = researchResp.searchResult.map((item) => ({
                        title: item?.title || '',
                        description: item?.description || '',
                        name: item?.displayLink || '',
                        image: item?.thumbnail || '',
                        url: item?.url || '',
                        thumbnail: item?.thumbnail || ''
                    }));

                    // console.log('📋 Formatted research sources:', formattedSearchResp.length, 'items');

                    const chatData = {
                        libId: libId,
                        searchResult: formattedSearchResp,
                        userSearchInput: searchInput
                    };

                    // console.log('💾 Inserting research chat data...');

                    const { data: insertedChat, error: chatError } = await supabase
                        .from('Chats')
                        .insert([chatData])
                        .select();

                    if (chatError) {
                        console.error('Error inserting research chat:', chatError);
                        throw new Error(`Database insertion failed: ${chatError.message || JSON.stringify(chatError)}`);
                    }

                    // console.log('✅ Research chat inserted:', insertedChat[0].id);

                    await GetSearchRecords();

                    // If the research API could not start synthesis (runId missing), fallback to client-side synthesis
                    if (!researchResp.runId) {
                        // console.log('🧪 Fallback: starting client-side synthesis since runId is missing');
                        await GenerateAIResp(formattedSearchResp, insertedChat[0].id);
                    }

                    // Start polling for AI response updates (either server-started or client fallback)
                    // console.log('🔄 Starting polling for research results...');
                    startPollingForUpdates();

                } else {
                    // SEARCH MODE: Standard quick search
                    // console.log('🔍 Starting SEARCH mode for:', searchInput);

                    let searchResp;
                    try {
                        const result = await axios.post('/api/google-search-api', {
                            searchInput: searchInput,
                            searchType: 'search'
                        });
                        searchResp = result.data;
                    } catch (apiError) {
                        console.error('Google Search API call failed:', apiError.message);
                        // Treat API call failure as Google API unavailable
                        searchResp = {
                            googleApiUnavailable: true,
                            useDirectModel: true,
                            categorizedResults: { web: [] }
                        };
                    }

                    // Check if Google API is unavailable or if we should use direct model
                    if (searchResp.googleApiUnavailable || searchResp.useDirectModel) {
                        console.warn('Google API failed or unavailable - using direct AI model fallback');
                        
                        // Direct AI model call without web search results
                        const formattedSearchResp = []; // No web results, will be generated by AI

                        const chatData = {
                            libId: libId,
                            searchResult: formattedSearchResp,
                            userSearchInput: searchInput
                        };

                        const { data: insertedChat, error: chatError } = await supabase
                            .from('Chats')
                            .insert([chatData])
                            .select();

                        if (chatError) {
                            console.error('Error inserting chat:', chatError);
                            throw new Error(`Database insertion failed: ${chatError.message || JSON.stringify(chatError)}`);
                        }

                        await GetSearchRecords();
                        // Pass flag to GenerateAIResp to use direct model call
                        await GenerateAIResp(formattedSearchResp, insertedChat[0].id, true);
                        startPollingForUpdates();
                    } else if (!searchResp || !searchResp.categorizedResults) {
                        throw new Error('Invalid search response from Google Search API');
                    } else {
                        // Normal search path with web results
                        const formattedSearchResp = searchResp?.categorizedResults?.web?.map((item, index) => ({
                            title: item?.title || '',
                            description: item?.snippet || '',
                            name: item?.pagemap?.person?.[0]?.name || item?.displayLink || '',
                            image: item?.pagemap?.imageobject?.[0]?.url ||
                                item?.pagemap?.cse_image?.[0]?.src || '',
                            url: item?.link || '',
                            thumbnail: item?.pagemap?.cse_thumbnail?.[0]?.src || ''
                        })) || [];

                        const chatData = {
                            libId: libId,
                            searchResult: formattedSearchResp,
                            userSearchInput: searchInput
                        };

                        const { data: insertedChat, error: chatError } = await supabase
                            .from('Chats')
                            .insert([chatData])
                            .select();

                        if (chatError) {
                            console.error('Error inserting chat:', chatError);
                            throw new Error(`Database insertion failed: ${chatError.message || JSON.stringify(chatError)}`);
                        }

                        await GetSearchRecords();
                        await GenerateAIResp(formattedSearchResp, insertedChat[0].id, false);
                        startPollingForUpdates();
                    }
                }
            }

            // Clear input after successful search and update submitted query
            setUserInput('');
            setSubmittedQuery(searchInput);

        } catch (error) {
            console.error('Error in GetSearchApiResult:', error);
            
            // More specific error handling
            let errorMessage = 'Search failed. Please try again.';
            // Research plan/limit handling
            if (error.response?.status === 403 && error.response?.data?.error === 'RESEARCH_LIMIT_REACHED') {
                errorMessage = error.response?.data?.message || 'Monthly Research limit reached.';
            }
            
            if (error.response?.status === 400) {
                errorMessage = 'Invalid search request. Please check your input.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Authentication error. Please refresh and try again.';
            } else if (error.response?.status === 429) {
                errorMessage = 'Too many requests. Please wait a moment and try again.';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message?.includes('Database')) {
                errorMessage = 'Database error. Please try again.';
            } else if (error.message?.includes('API')) {
                errorMessage = 'API error. Please try again.';
            } else if (error.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            toast.error(errorMessage);
            setLoadingSearch(false);
        }
    }, [deferredUserInput, searchInputRecord, uploadedFiles, libId, searchType, GetSearchRecords, GenerateAIResp, startPollingForUpdates]);

    // OPTIMIZATION: Input handler functions that depend on GetSearchApiResult
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey && deferredUserInput?.trim() && !loadingSearch) {
            e.preventDefault();
            GetSearchApiResult();
        }
    }, [deferredUserInput, loadingSearch, GetSearchApiResult]);

    const handleSendClick = useCallback(() => {
        if (deferredUserInput?.trim() && !loadingSearch) {
            GetSearchApiResult();
        }
    }, [deferredUserInput, loadingSearch, GetSearchApiResult]);

    // OPTIMIZATION: Essential UI handler functions for smooth performance
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    const toggleSpeechRecognition = useCallback(() => {
        if (!recognition) {
            // Check if we're on mobile and provide better error message
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                alert('Speech recognition may not be fully supported on your mobile device. Please try using Chrome or Safari for the best experience.');
            } else {
                alert('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
            }
            return;
        }

        if (isListening) {
            try {
                recognition.stop();
                setIsListening(false);
            } catch (error) {
                console.error('Error stopping recognition:', error);
                setIsListening(false);
            }
        } else {
            try {
                // Request microphone permission on mobile
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(() => {
                            recognition.start();
                        })
                        .catch((error) => {
                            console.error('Microphone permission denied:', error);
                            alert('Microphone permission is required for voice input.');
                        });
                } else {
                    recognition.start();
                }
            } catch (error) {
                console.error('Error starting recognition:', error);
                alert('Failed to start speech recognition. Please try again.');
            }
        }
    }, [recognition, isListening]);

    // OPTIMIZATION: Stable speech recognition initialization (only runs once)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for speech recognition support with better mobile detection
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                try {
                    const recognitionInstance = new SpeechRecognition();

                    // Configure for better mobile compatibility
                    recognitionInstance.continuous = false; // Set to false for mobile
                    recognitionInstance.interimResults = true;
                    recognitionInstance.lang = 'en-US';
                    recognitionInstance.maxAlternatives = 1;

                    // Store accumulated transcript
                    let finalTranscript = '';

                    recognitionInstance.onresult = (event) => {
                        let interimTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript;
                            } else {
                                interimTranscript += transcript;
                            }
                        }

                        // Update the input with final + interim results
                        setUserInput(prev => {
                            const currentText = prev || '';
                            const newText = finalTranscript + interimTranscript;
                            return currentText + newText;
                        });
                    };

                    recognitionInstance.onstart = () => {
                        finalTranscript = '';
                        setIsListening(true);
                    };

                    recognitionInstance.onend = () => {
                        setIsListening(false);
                        // For mobile: automatically restart if user was still speaking
                        if (isListening && finalTranscript === '') {
                            setTimeout(() => {
                                if (isListening) {
                                    try {
                                        recognitionInstance.start();
                                    } catch (e) {
                                        // console.log('Recognition restart failed:', e);
                                        setIsListening(false);
                                    }
                                }
                            }, 100);
                        }
                    };

                    recognitionInstance.onerror = (event) => {
                        console.error('Speech recognition error:', event.error);
                        setIsListening(false);

                        // Handle specific mobile errors
                        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                            alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
                        } else if (event.error === 'network') {
                            alert('Network error. Please check your internet connection.');
                        } else if (event.error === 'no-speech') {
                            // Silently handle no-speech error for better UX
                            // console.log('No speech detected');
                        }
                    };

                    setRecognition(recognitionInstance);
                } catch (error) {
                    console.error('Failed to initialize speech recognition:', error);
                }
            }
        }
    }, []); // OPTIMIZATION: Empty dependency array since this only needs to run once

    // OPTIMIZATION: Stable cleanup effect (only runs once)
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, []); // OPTIMIZATION: Empty dependency array since cleanup only needs to run on unmount

    // OPTIMIZATION: Stable scroll handler with memoization
    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // Show button when more than 100px from bottom
            const hasScrolledDown = scrollTop > 300; // Only show after scrolling down 300px
            
            setShowScrollToBottom(hasScrolledDown && !isNearBottom);
        }
    }, []);

    // Handle scroll to show/hide scroll to bottom button
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            // Initial check
            handleScroll();
            
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
            };
        }
    }, []); // OPTIMIZATION: Empty dependency array since refs are stable

    // OPTIMIZATION: Update searchResult when searchInputRecord prop changes (stable)
    useEffect(() => {
        if (searchInputRecord) {
            setSearchResult(searchInputRecord);
            setRefreshTrigger(prev => prev + 1);
        }
    }, [searchInputRecord?.libId]); // OPTIMIZATION: Only depend on libId to prevent excessive updates

    // OPTIMIZATION: Stable effect for handling search initialization
    useEffect(() => {
        if (searchInputRecord && searchInputRecord.libId) {
            // console.log('Search input record loaded:', {
            //     libId: searchInputRecord.libId,
            //     hasSearchInput: !!searchInputRecord.searchInput,
            //     chatsCount: searchInputRecord?.Chats?.length || 0
            // });

            if (searchInputRecord?.Chats?.length === 0) {
                // Only trigger search if no existing chats - this means it's a new search
                // console.log('No existing chats found, triggering new search...');
                GetSearchApiResult();
            } else {
                // console.log('Existing chats found, loading records...');
                GetSearchRecords();
                // Start polling for AI response updates if there are chats without AI responses
                const hasChatsWithoutAiResp = searchInputRecord?.Chats?.some(chat => !chat.aiResp);
                if (hasChatsWithoutAiResp) {
                    // console.log('Found chats without AI responses, starting polling...');
                    startPollingForUpdates();
                }
            }
            setSearchResult(searchInputRecord);
        }
    }, [searchInputRecord?.libId]); // OPTIMIZATION: Only depend on libId

    // Cleanup polling interval when component unmounts
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);



    // OPTIMIZATION: Stable effect for font size adjustment (only when search input actually changes)
    useEffect(() => {
        const currentSearchInput = searchResult?.Chats?.[0]?.userSearchInput || searchInputRecord?.searchInput;
        if (currentSearchInput) {
            // Use setTimeout to ensure the element is rendered
            const timeoutId = setTimeout(() => {
                adjustFontSize();
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [searchResult?.Chats?.length, searchInputRecord?.searchInput, adjustFontSize]); // OPTIMIZATION: Include adjustFontSize in deps since it's memoized

    // OPTIMIZATION: Memoized copy functionality
    const handleCopyResult = useCallback(async (chatId, aiResponse) => {
        try {
            if (!aiResponse) {
                alert('No text available to copy');
                return;
            }

            // Clean the text - remove markdown formatting
            let textToCopy = aiResponse
                .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
                .replace(/\*(.*?)\*/g, '$1') // Italic
                .replace(/`(.*?)`/g, '$1') // Code
                .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
                .replace(/#{1,6}\s/g, '') // Headers
                .replace(/>\s/g, '') // Blockquotes
                .replace(/\n+/g, ' ') // Multiple newlines to space
                .replace(/\s+/g, ' ') // Multiple spaces to single space
                .trim();

            // If text contains HTML, strip HTML tags
            if (textToCopy.includes('<')) {
                textToCopy = stripHtmlTags(textToCopy);
            }

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
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

            setCopiedText(chatId);
            setTimeout(() => setCopiedText(null), 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
            alert('Copy failed. Please try again.');
        }
    }, [stripHtmlTags]);

    // OPTIMIZATION: Memoized text-to-speech functionality with mobile support
    const handleSpeakResult = useCallback((aiResponse) => {
        // If already reading, stop it
        if (isReading) {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                setIsReading(false);
            }
            return;
        }

        // Check if aiResponse exists and speechSynthesis is supported
        if (!aiResponse || !window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser or no text available');
            return;
        }

        // Clean the text - remove markdown formatting and HTML tags
        let textToSpeak = aiResponse;

        // Remove markdown formatting
        textToSpeak = textToSpeak
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/`(.*?)`/g, '$1') // Code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
            .replace(/#{1,6}\s/g, '') // Headers
            .replace(/>\s/g, '') // Blockquotes
            .replace(/\n+/g, ' ') // Multiple newlines to space
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .trim();

        // If text is HTML, strip HTML tags
        if (textToSpeak.includes('<')) {
            textToSpeak = stripHtmlTags(textToSpeak);
        }

        if (!textToSpeak.trim()) {
            alert('No text available to read');
            return;
        }

        try {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            // Detect mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // Create a new speech synthesis utterance
            const utterance = new SpeechSynthesisUtterance(textToSpeak);

            // Set properties for better voice quality
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Function to set voice (needed for mobile where voices load asynchronously)
            const setVoice = () => {
                try {
                    const voices = window.speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        // Find a good English voice
                        const englishVoice = voices.find(voice =>
                            voice.lang.startsWith('en')
                        );
                        if (englishVoice) {
                            utterance.voice = englishVoice;
                        }
                    }
                } catch (voiceError) {
                    // If voice selection fails, continue with default voice
                    // console.log('Using default voice');
                }
            };

            // Set voice immediately if available
            setVoice();

            // On mobile (especially iOS), voices may load asynchronously
            // Listen for voiceschanged event if needed
            let voicesChangedHandler = null;
            if (isMobile) {
                // Try to get voices again after a short delay for mobile
                const voicesTimeout = setTimeout(() => {
                    setVoice();
                }, 50);

                // Also listen for voiceschanged event
                if (window.speechSynthesis.onvoiceschanged !== undefined) {
                    voicesChangedHandler = () => {
                        setVoice();
                        clearTimeout(voicesTimeout);
                    };
                    window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
                }
            }

            // Set event handlers with better error handling
            utterance.onstart = () => {
                setIsReading(true);
                // Clean up voiceschanged listener once started
                if (voicesChangedHandler) {
                    window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
                }
            };

            utterance.onend = () => {
                setIsReading(false);
                // Clean up voiceschanged listener
                if (voicesChangedHandler) {
                    window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
                }
            };

            utterance.onerror = (event) => {
                setIsReading(false);
                // Clean up voiceschanged listener
                if (voicesChangedHandler) {
                    window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
                }
                
                // Provide user feedback on mobile errors
                if (isMobile && event.error === 'not-allowed') {
                    console.warn('Speech synthesis not allowed on mobile');
                }
            };

            // Store reference to allow stopping
            speechSynthesisRef.current = utterance;

            // For mobile devices, especially iOS, we need to trigger speech synchronously
            // from the user interaction. Use requestAnimationFrame for minimal delay
            // while maintaining the user interaction context
            if (isMobile) {
                // Use requestAnimationFrame to maintain user interaction context on mobile
                requestAnimationFrame(() => {
                    // Small additional delay for mobile to ensure speechSynthesis is ready
                    setTimeout(() => {
                        window.speechSynthesis.speak(utterance);
                        setIsReading(true);
                    }, 50);
                });
            } else {
                // For desktop, small delay to ensure cancellation is processed
                setTimeout(() => {
                    window.speechSynthesis.speak(utterance);
                    setIsReading(true);
                }, 100);
            }

        } catch (error) {
            console.error('Speech synthesis error:', error);
            setIsReading(false);
            alert('Text-to-speech is not available in your browser');
        }
    }, [isReading, stripHtmlTags]); // OPTIMIZATION: Proper dependencies

    // OPTIMIZATION: Memoized reaction functionality
    const handleReaction = useCallback(async (chatId, reactionType) => {
        try {
            const currentReaction = chatReactions[chatId] || {};
            let updateData = {};

            if (reactionType === 'like') {
                updateData = {
                    liked: !currentReaction.liked,
                    disliked: false // Remove dislike if liking
                };
            } else if (reactionType === 'dislike') {
                updateData = {
                    disliked: !currentReaction.disliked,
                    liked: false // Remove like if disliking
                };
            }

            // Update in database
            const { error } = await supabase
                .from('Chats')
                .update(updateData)
                .eq('id', chatId);

            if (error) {
                console.error('Error updating reaction:', error);
                alert('Failed to update reaction. Please try again.');
                return;
            }

            // Update local state
            setChatReactions(prev => ({
                ...prev,
                [chatId]: {
                    ...currentReaction,
                    ...updateData
                }
            }));

        } catch (error) {
            console.error('Reaction error:', error);
            alert('Failed to process reaction. Please try again.');
        }
    }, [chatReactions]); // OPTIMIZATION: Proper dependencies

    // OPTIMIZATION: Memoized tab calculations
    const tabsWithBadges = useMemo(() => 
        tabs.map(tab => {
            if (tab.label === 'Sources' && searchResult?.Chats?.[0]?.searchResult) {
                return { ...tab, badgeCount: searchResult.Chats[0].searchResult.length };
            }
            return { ...tab, badgeCount: null };
        }), 
        // Only recompute when searchResult changes, not on user typing
        [searchResult]
    );

    // Memoize rendered chats to avoid remounting icons while typing
    const renderedChats = useMemo(() => {
        return (searchResult?.Chats || []).map((chat, index) => {
            const totalChats = searchResult?.Chats?.length || 0;
            const isLatestMessage = index === totalChats - 1;
            // Only show loading for this specific chat if it doesn't have an AI response yet
            const isAnswerPending = !chat?.aiResp;
            // Loading should only show for the latest message AND only if we're actively searching
            const isLoadingAnswer = isAnswerPending && isLatestMessage && loadingSearch;

            return (
                <div key={`chat-${chat.id}-${chat.aiResp ? 'answered' : 'pending'}`} className="min-w-0 w-full">
                    <h2
                        ref={titleRef}
                        className={`font-medium ${titleFontSize} mt-6 md:mt-10 transition-all duration-300 leading-tight text-foreground dark:text-white wrap-break-word overflow-wrap-anywhere hyphens-auto`}
                    >
                        {chat?.userSearchInput || searchInputRecord?.searchInput}
                    </h2>

                    <TabsHeader activeTab={activeTab} setActiveTab={setActiveTab} tabsWithBadges={tabsWithBadges} />

                    <div className="min-w-0 w-full overflow-hidden">
                        {activeTab === 'Answer' ? (
                            <MemoizedAnswerDisplay
                                key={`answer-${chat.id}-${refreshTrigger}`}
                                searchResult={chat}
                                isLatestMessage={isLatestMessage}
                                isLoadingAnswer={isLoadingAnswer}
                            />
                        ) : activeTab === 'Sources' ? (
                            <MemoizedSourceList
                                searchResult={chat}
                            />
                        ) : activeTab === 'Images' ? (
                            <MemoizedImageList
                                searchResult={chat}
                            />
                        ) : activeTab === 'Videos' ? (
                            <MemoizedVideoList
                                searchResult={chat}
                            />
                        ) : null}
                    </div>

                    <div className='flex flex-wrap items-center mb-35 gap-2 mt-6'>
                        <Button
                            className='cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-auto min-h-8'
                            variant={copiedText === chat.id ? 'default' : 'outline'}
                            onClick={() => handleCopyResult(chat.id, chat.aiResp)}
                            disabled={!chat.aiResp}
                        >
                            {copiedText === chat.id ? (
                                <>
                                    <Check className='w-3 h-3 sm:w-4 sm:h-4' />
                                    <span className="ml-1 hidden xs:inline">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className='w-3 h-3 sm:w-4 sm:h-4' />
                                    <span className="ml-1 hidden xs:inline">Copy</span>
                                </>
                            )}
                        </Button>

                        <Button
                            className='cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-auto min-h-8'
                            variant={isReading ? 'default' : 'outline'}
                            onClick={() => handleSpeakResult(chat.aiResp)}
                            disabled={!chat.aiResp}
                        >
                            {isReading ? (
                                <VolumeX className='w-3 h-3 sm:w-4 sm:h-4' />
                            ) : (
                                <Volume2 className='w-3 h-3 sm:w-4 sm:h-4' />
                            )}
                            <span className="ml-1 hidden xs:inline">{isReading ? 'Stop' : 'Read'}</span>
                        </Button>

                        <Button
                            className='cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-auto min-h-8'
                            variant={chatReactions[chat.id]?.liked ? 'default' : 'outline'}
                            onClick={() => handleReaction(chat.id, 'like')}
                        >
                            <ThumbsUp className={`w-3 h-3 sm:w-4 sm:h-4 ${chatReactions[chat.id]?.liked ? 'fill-current' : ''}`} />
                            <span className="ml-1 hidden sm:inline">Like</span>
                        </Button>

                        <Button
                            className='cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-auto min-h-8'
                            variant={chatReactions[chat.id]?.disliked ? 'default' : 'outline'}
                            onClick={() => handleReaction(chat.id, 'dislike')}
                        >
                            <ThumbsDown className={`w-3 h-3 sm:w-4 sm:h-4 ${chatReactions[chat.id]?.disliked ? 'fill-current' : ''}`} />
                            <span className="ml-1 hidden sm:inline">Dislike</span>
                        </Button>
                    </div>
                </div>
            );
        });
    }, [searchResult, activeTab, loadingSearch, refreshTrigger, titleFontSize, copiedText, isReading, chatReactions, handleCopyResult, handleSpeakResult, handleReaction]);




    return (

        <div ref={scrollContainerRef} className='w-full max-h-screen overflow-y-auto relative bg-background dark:bg-[oklch(0.2478_0_0)]'>
            <div className='p-2 md:p-7 pb-20 md:pb-2.5 min-w-0'>

                {renderedChats}

                {/* Floating Scroll to Bottom Button */}
                {showScrollToBottom && (
                    <div className="fixed bottom-24 md:bottom-40 right-2 md:right-25 z-50">
                        <Button
                            onClick={scrollToBottom}
                            size="icon"
                            className="rounded-full cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-[oklch(0.2478_0_0)] hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 w-12 h-12 slide-in-from-bottom-2 fade-in-0"
                            variant="outline"
                            title="Scroll to bottom"
                        >
                            <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </Button>
                    </div>
                )}

                <div className='bg-white dark:bg-[oklch(0.3092_0_0)] w-[calc(100%-24px)] md:w-full max-w-sm md:max-w-md lg:max-w-xl xl:max-w-3xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-2 md:p-3 fixed bottom-3 md:bottom-8 left-1/2 -translate-x-1/2 z-40'>

                    <Tabs defaultValue="Search" className="w-full min-w-0">
                        <div className='flex justify-between items-end gap-2 min-w-0'>
                            <div className="flex-1 min-w-0">
                                <TabsContent value="Search" className="mt-0">
                                    <OptimizedTextarea
                                        value={userInput}
                                        onChange={handleUserInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask anything..."
                                        disabled={loadingSearch}
                                        textareaRef={textareaRef}
                                    />
                                </TabsContent>
                                <TabsContent value="Research" className="mt-0">
                                    <OptimizedTextarea
                                        value={userInput}
                                        onChange={handleUserInputChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Research anything..."
                                        disabled={loadingSearch}
                                        textareaRef={textareaRef}
                                    />
                                </TabsContent>
                                <TabsList className="h-7 p-0.5 mt-1 dark:bg-[oklch(0.2478_0_0)] dark:border-gray-600">
                                    <TabsTrigger value="Search" className='text-primary cursor-pointer text-xs px-2 py-1 h-6' onClick={() => handleSearchTypeChange('search')} >
                                        <SearchCheck className="w-3 h-3" />
                                        <span className="hidden sm:inline ml-1">Search</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="Research" className='text-primary cursor-pointer text-xs px-2 py-1 h-6' onClick={() => handleSearchTypeChange('research')} >
                                        <Atom className="w-3 h-3" />
                                        <span className="hidden sm:inline ml-1">Research</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className='flex gap-1 items-center shrink-0 ml-2'>
                                {/* AI Model Selector */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-7 w-7 cursor-pointer relative'>
                                        <Cpu className='text-gray-500 dark:text-gray-400 w-3 h-3' />
                                        {/* {selectedModel?.name && (
                                            <div className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded-full px-1 min-w-4 h-4 flex items-center justify-center" style={{ fontSize: '8px' }}>
                                                {selectedModel.name === 'Best' ? '★' : selectedModel.name.charAt(0)}
                                            </div>
                                        )} */}
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="dark:bg-[oklch(0.2478_0_0)] dark:border-gray-600 w-64 max-h-80 overflow-y-auto">
                                        <DropdownMenuLabel className="dark:text-white font-medium sticky top-0 bg-white dark:bg-[oklch(0.2478_0_0)] z-10">
                                            AI Models
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="dark:border-gray-600 sticky top-8 bg-white dark:bg-[oklch(0.2478_0_0)] z-10" />
                                        <div className="space-y-1">
                                            {AIModelsOption.map((model, index) => {
                                                const isAccessible = model.modelApi === 'auto' || isPro || !model.isPro;
                                                const requiresUpgrade = model.isPro && !isPro;
                                                
                                                return (
                                                    <DropdownMenuItem 
                                                        key={index}
                                                        className={`dark:text-white dark:hover:bg-[oklch(0.3092_0_0)] ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
                                                            selectedModel.id === model.id ? 'bg-accent dark:bg-[oklch(0.3092_0_0)]' : ''
                                                        }`}
                                                        onClick={() => isAccessible && handleModelSelect(model.id)}
                                                        disabled={!isAccessible}
                                                    >
                                                        <div className='w-full'>
                                                            <div className='flex items-center justify-between'>
                                                                <div className='flex items-center gap-2'>
                                                                    <h2 className='text-sm dark:text-white font-medium'>{model.name}</h2>
                                                                    {requiresUpgrade && (
                                                                        <Crown className='w-3 h-3 text-yellow-500' title='Pro plan required' />
                                                                    )}
                                                                </div>
                                                                {selectedModel.id === model.id && (
                                                                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                                                )}
                                                            </div>
                                                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                                                                {model.desc}
                                                                {requiresUpgrade && ' (Upgrade to Pro to unlock)'}
                                                            </p>
                                                        </div>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                
                                <Button
                                    variant='ghost'
                                    className={`cursor-pointer h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 relative ${
                                        hasConversationFiles() ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                    onClick={handleFileUploadToggle}
                                    title="Attach files"
                                >
                                    <Paperclip className={`w-3 h-3 ${
                                        hasConversationFiles() ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                                    }`} />
                                    {(uploadedFiles.length > 0 || hasConversationFiles()) && (
                                        <div className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded-full px-1 min-w-4 h-4 flex items-center justify-center" style={{ fontSize: '8px' }}>
                                            {uploadedFiles.length > 0 ? uploadedFiles.length : getConversationFiles().length}
                                        </div>
                                    )}
                                </Button>

                                {/* Microphone Button */}
                                <Button
                                    variant='ghost'
                                    className={`cursor-pointer h-7 w-7 p-0 transition-colors ${isListening
                                        ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                    onClick={toggleSpeechRecognition}
                                    title={isListening ? 'Stop listening' : 'Start voice input'}
                                >
                                    {isListening ?
                                        <MicOff className='text-red-500 w-3 h-3 animate-pulse' /> :
                                        <Mic className='text-gray-500 dark:text-gray-400 w-3 h-3' />
                                    }
                                </Button>


                                {/* Submit Button */}
                                {deferredUserInput?.trim() && (
                                    <Button
                                        size="sm"
                                        className="flex items-center cursor-pointer h-7 w-7 p-0 shrink-0"
                                        onClick={handleSendClick}
                                        disabled={loadingSearch || !deferredUserInput?.trim()}
                                    >
                                        {loadingSearch ? (
                                            <Loader2Icon className='animate-spin w-3 h-3' />
                                        ) : (
                                            <Send className="w-3 h-3" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Tabs>

                </div>

                {/* File Upload Modal */}
                {showFileUpload && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-[oklch(0.3092_0_0)] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex items-center space-x-2">
                                    <Paperclip className="w-5 h-5 text-blue-500" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attach Files</h3>
                                    {uploadedFiles.length > 0 && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowFileUpload(false)}
                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                                {/* Dropzone */}
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                        isDragActive
                                            ? isDragAccept
                                                ? 'border-green-400 bg-green-50 dark:bg-green-900/20 scale-105'
                                                : 'border-red-400 bg-red-50 dark:bg-red-900/20 scale-105'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center space-y-3">
                                        <div className={`p-3 rounded-full ${isDragActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground dark:text-white mb-1">
                                                {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                                            </p>
                                            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-2">
                                                or click to browse
                                            </p>
                                            <p className="text-xs text-muted-foreground dark:text-gray-500">
                                                Supports: PDF, DOCX, TXT, CSV, JPG, PNG • Max 10MB each
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* File Upload Error */}
                                {fileUploadError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="flex items-start space-x-2">
                                            <div className="w-4 h-4 text-red-500 mt-0.5">⚠️</div>
                                            <p className="text-sm text-red-600 dark:text-red-400">{fileUploadError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Upload Progress */}
                                {Object.keys(uploadProgress).length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Uploading files...</h4>
                                        {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                            <div key={fileId} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground dark:text-gray-400">Processing...</span>
                                                    <span className="text-muted-foreground dark:text-gray-400 font-medium">{Math.round(progress)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out" 
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Persistent Conversation Files */}
                                {hasConversationFiles() && getConversationFiles().length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            Files Available in Conversation ({getConversationFiles().length})
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearConversationFiles}
                                                className="h-6 px-2 text-xs cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
                                                title="Clear conversation files"
                                            >
                                                Clear All
                                            </Button>
                                        </h4>
                                        {/* <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                            These files are available throughout this conversation. You can ask questions about them anytime.
                                        </div> */}
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {getConversationFiles().map((fileInfo, index) => (
                                                <div
                                                    key={`conversation-${index}`}
                                                    className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                                                >
                                                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                                                        <div className="shrink-0">
                                                            {fileInfo.fileType?.startsWith('image/') ? (
                                                                <FileImage className="w-3 h-3 text-blue-500" />
                                                            ) : fileInfo.fileType === 'application/pdf' ? (
                                                                <FileText className="w-3 h-3 text-red-500" />
                                                            ) : (
                                                                <File className="w-3 h-3 text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">
                                                                {fileInfo.fileName || `File ${index + 1}`}
                                                            </p>
                                                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                                                {fileInfo.fileType || 'Unknown type'} • Available for analysis
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Uploaded Files List */}
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                            Uploaded Files ({uploadedFiles.length})
                                        </h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {uploadedFiles.map((fileItem) => (
                                                <div
                                                    key={fileItem.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                        <div className="shrink-0">
                                                            {getFileIcon(fileItem.file)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-foreground dark:text-white truncate">
                                                                {fileItem.file.name}
                                                            </p>
                                                            <div className="flex items-center space-x-2 text-xs text-muted-foreground dark:text-gray-400">
                                                                <span>{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                <span>•</span>
                                                                <span className="text-green-600 dark:text-green-400">✓ Uploaded</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFile(fileItem.id)}
                                                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {uploadedFiles.length === 0 && Object.keys(uploadProgress).length === 0 && !fileUploadError && (
                                    <div className="text-center py-4">
                                        <div className="text-gray-400 dark:text-gray-500 text-sm">
                                            No files attached yet. Add some files to analyze them with AI.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                                <div className="text-xs text-muted-foreground dark:text-gray-400">
                                    {uploadedFiles.length > 0 
                                        ? `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} ready for analysis`
                                        : hasConversationFiles() 
                                            ? `${getConversationFiles().length} conversation file${getConversationFiles().length !== 1 ? 's' : ''} available`
                                            : 'Files will be analyzed when you submit your query'
                                    }
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowFileUpload(false)}
                                        className="text-sm cursor-pointer"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowFileUpload(false)}
                                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                    >
                                        Done {uploadedFiles.length > 0 ? `(${uploadedFiles.length})` : hasConversationFiles() ? `(${getConversationFiles().length} available)` : ''}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>

    )
}

export default DisplayResult
