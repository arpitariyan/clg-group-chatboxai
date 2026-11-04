'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo, useDeferredValue, startTransition } from 'react'
import { LucideImage, LucideList, LucideVideo, Mic, MicOff, Cpu, Copy, ThumbsUp, ThumbsDown, VolumeX, Volume2, Check, ArrowDown, Paperclip, X, FileText, FileImage, FileSpreadsheet, FileVideo, FileAudio, File, Plus, ArrowUp, Atom, Search, Bot, Zap, Lock, Download } from '@/components/ui/animated-icon';
import { requiresDeepReasoning } from '@/lib/reasoning-utils';
import AnswerDisplay from './AnswerDisplay';
import SourceList from './sourceList';
import axios from 'axios';
// import { SEARCH_RESULT } from '@/services/Shared';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConnections } from '@/contexts/AppConnectionContext';
import { useModel } from '@/contexts/ModelContext';
import { v4 as uuidv4 } from 'uuid';
import ImageList from './ImageList';
import VideoList from './VideoList';
import { Button } from '@/components/ui/button';
import ProactiveNextStepBar from '@/components/ProactiveNextStepBar';
import TaskGraphVisualizer from '@/components/TaskGraphVisualizer';
import ArtifactCard from '@/components/ArtifactCard';
import ThinkingProgressWidget from '@/components/ThinkingProgressWidget';
import { extractUserIntent, isDocumentArtifactRequest } from '@/lib/user-intent';
import { CrossAppContextGraph } from '@/lib/cross-app-context';
import { predictNextStep } from '@/lib/next-step-intelligence';
import { buildProgressSequence } from '@/lib/thinking-progress';
import { downloadAsPDF, downloadAsWord, downloadAsMarkdown } from '@/lib/document-exporter';
import ToolCallIndicator from '../../../../_components/ToolCallIndicator';
import ComposerPlusMenu from '../../../../_components/ComposerPlusMenu';
import { Progress } from '@/components/ui/progress';
import { useDropzone } from 'react-dropzone';
import {
    AttachmentGroup,
    Attachment,
    AttachmentMedia,
    AttachmentContent,
    AttachmentTitle,
    AttachmentDescription,
    AttachmentActions,
    AttachmentRemove,
    AttachmentProgress
} from '@/components/ui/attachment';
import { toast } from '@/lib/alert';
import { useSidebar } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIModelsOption, DEEP_RESEARCH_MODELS, getResponseStyleProfile, canAccessModel } from '@/services/Shared';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useVoicePreference } from '@/hooks/useVoicePreference';
import DeepResearchLimitModal from '../../../../_components/DeepResearchLimitModal';
import PastedContentPreview, { isLargePastedContent, normalizePastedText } from '../../../../_components/PastedContentPreview';
import DragDropOverlay from '@/components/DragDropOverlay';
import CommandPalette from '../../../../_components/CommandPalette';
import { useMessageScrollerVisibility, MessageScroller } from '@/components/ui/message-scroller';
import { LABEL, FOCUS_RING, ICON_BUTTON, RESEARCH_BADGE, CONNECTED_BADGE, PROGRESS_BADGE, QUIET_BUTTON } from './answerSurface';
import { speakNaturalTextQueue, stopNaturalSpeech } from '@/lib/voice/local-speech-engine';
/* The composer vocabulary itself lives one level up, in components/surface.js, so
   the home composer and the image-gen composer share it. answerSurface.js only
   re-exports the subset the *answer* region needs; anything composer-specific is
   imported straight from the owner. */
import {
    COMPOSER_CARD,
    COMPOSER_TEXTAREA,
    LOCKED_BADGE,
    SECONDARY_ROW,
    SECONDARY_ROW_INNER,
    TOOLBAR_BUTTON,
    TOOLBAR_TOGGLE,
    TOOLBAR_RECORDING,
    TOOLBAR_DIVIDER,
    TOOLBAR_PILL,
    SEND_BUTTON,
    MENU_PANEL,
    MENU_TILE,
    MENU_TILE_ICON,
    MENU_TILE_TITLE,
    MENU_TILE_SUB,
    MENU_TILE_COUNT,
    TRAY_ITEM,
    TRAY_ITEM_STYLE,
} from '@/components/surface';

const getModelLogo = (name, isTrigger = false) => {
    const n = name?.toLowerCase() || '';
    let src = null;
    let Icon = Bot;
    
    if (n.includes('claude')) src = "Claude.png";
    else if (n.includes('gpt') || n.includes('openai')) src = "Chatgpt.png";
    else if (n.includes('gemini') || n.includes('lyria') || n.includes('gemma')) src = "Gemini.webp";
    else if (n.includes('mistral') || n.includes('mixtral')) src = "Mistral.png";
    else if (n.includes('flux')) src = "FLUX_icon.png";
    else if (n.includes('qwen')) src = "Qwen.png";
    else if (n.includes('stable diffusion') || n.includes('sdxl') || n.includes('stability')) src = "Stability_icon.webp";
    else if (n.includes('hyper-sd') || n.includes('hypersd')) src = "Seed.webp";
    else if (n.includes('jamba')) src = "Jamba.svg";
    else if (n.includes('kimi')) src = "kimi.png";
    else if (n.includes('ling')) src = "Ling.png";
    else if (n.includes('poolside') || n.includes('laguna')) src = "Poolside.webp";
    else if (n.includes('cohere') || n.includes('north')) src = "cohere.png";
    else if (n.includes('glm')) src = "Z-ai.webp";
    else if (n.includes('seed')) src = "Seed.webp";
    else if (n.includes('llama') || n.includes('meta')) src = "Meta.png";
    else if (n.includes('groq')) src = "groq.png";
    else if (n.includes('minimax')) src = "MiniMax.png";
    else if (n.includes('nemotron') || n.includes('dbrx') || n.includes('yi') || n.includes('granite') || n.includes('phi')) src = "nvidia.png";
    else if (n.includes('stepfun')) src = "Stepfun ai.png";
    else if (n.includes('deepseek')) Icon = Search;
    else if (n.includes('auto')) src = "Auto.png";

    if (isTrigger) {
        if (src) {
            return (
                <div className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-white border border-border/60 dark:border-white/10 dark:bg-white/90 p-[2px] shrink-0 overflow-hidden shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                    <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
                </div>
            );
        }
        return <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />;
    }

    if (src) {
        return (
            <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white border border-border/60 dark:border-white/10 dark:bg-white/90 p-0.5 shrink-0 overflow-hidden shadow-sm">
                <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
            </div>
        );
    }

    return (
        /* Fallback well. Was a raw `gray-100/800` + `gray-200/700` + `gray-500`
           stack, which reads as a foreign chip once it sits in the composer's model
           pill next to token-driven chrome. */
        <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-muted border border-border/60 shrink-0 text-muted-foreground shadow-sm">
            <Icon className="w-4 h-4" />
        </div>
    );
};

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

const CANVA_DESIGN_MARKER_REGEX = /<!--CANVA_DESIGN:([\s\S]*?)-->/i;
const CANVA_PENDING_HINT_REGEX = /(?:canva_generate_design|canva_create_design|\bCanva Design\b|\bDesign Ready\b|\bCanva is generating\b)/i;

const getCanvaDesignPayload = (aiResp = '') => {
    const response = String(aiResp || '');
    const match = response.match(CANVA_DESIGN_MARKER_REGEX);
    if (!match) return null;

    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
};

const hasRenderableCanvaDesign = (aiResp = '') => {
    const payload = getCanvaDesignPayload(aiResp);
    if (!payload) return false;

    if (Array.isArray(payload.designs)) {
        return payload.designs.some((design) => design?.thumbnail || design?.imageUrl || design?.downloadUrl || design?.editUrl || design?.designId);
    }

    return Boolean(payload.imageUrl || payload.thumbnailUrl || payload.downloadUrl || payload.editUrl || payload.designId);
};

const hasPendingCanvaDesign = (aiResp = '') => {
    const response = String(aiResp || '');
    if (hasRenderableCanvaDesign(response)) {
        return false;
    }

    const payload = getCanvaDesignPayload(response);
    if (payload) {
        return true;
    }

    return CANVA_PENDING_HINT_REGEX.test(response);
};

// Highly optimized textarea component with React.memo to prevent unnecessary re-renders
const OptimizedTextarea = React.memo(({
    value,
    onChange,
    placeholder,
    disabled,
    onKeyDown,
    onPaste,
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
            const newHeight = Math.min(textarea.scrollHeight, 144); // ~5 lines, then scroll
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
            onPaste={onPaste}
            placeholder={placeholder}
            disabled={disabled}
            className={`${COMPOSER_TEXTAREA} min-h-12 px-4 pt-4 pb-2`}
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

/* Attachment section headers. Uses the shared LABEL so "Sources" here and the
   language tag on a code block and a table head are all recognisably the same
   kind of label. See ./answerSurface.js. */
const SectionHeader = React.memo(function SectionHeader({ icon: Icon, title }) {
    return (
        <div className={`flex items-center gap-1.5 text-ink-3 ${LABEL}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{title}</span>
        </div>
    );
});

SectionHeader.displayName = 'SectionHeader';

const safeParseArray = (value, fallback = []) => {
    if (Array.isArray(value)) return value;
    if (!value) return fallback;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.results)) return parsed.results;
                if (Array.isArray(parsed.items)) return parsed.items;
                if (Array.isArray(parsed.web)) return parsed.web;
                if (Array.isArray(parsed.data)) return parsed.data;
                if (Array.isArray(parsed.sources)) return parsed.sources;
                if (Array.isArray(parsed.images)) return parsed.images;
                if (Array.isArray(parsed.videos)) return parsed.videos;
            }
            return fallback;
        } catch {
            return fallback;
        }
    }
    if (typeof value === 'object') {
        if (Array.isArray(value.results)) return value.results;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.web)) return value.web;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.sources)) return value.sources;
        if (Array.isArray(value.images)) return value.images;
        if (Array.isArray(value.videos)) return value.videos;
        return fallback;
    }
    return fallback;
};

function DisplayResultContent({ searchInputRecord, memoryEnabled = true }) {

    const [searchResult, setSearchResult] = useState(() => {
        if (!searchInputRecord) return null;
        return {
            ...searchInputRecord,
            Chats: (searchInputRecord?.Chats || []).map(chat => ({
                ...chat,
                id: chat.$id || chat.id,
                searchResult: safeParseArray(chat?.searchResult, []),
                processedFiles: safeParseArray(chat?.processedFiles, []),
            }))
        };
    });

    const messageIds = useMemo(() => {
        return (searchResult?.Chats || []).map(chat => chat.id);
    }, [searchResult?.Chats]);

    const { currentAnchorId, visibleMessageIds, scrollToAnchor } = useMessageScrollerVisibility(messageIds);

    const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger
    const [pollingInterval, setPollingInterval] = useState(null); // Add polling interval for real-time updates

    const { state: sidebarState, isMobile: isSidebarMobile } = useSidebar();
    const inputCenterLeft = useMemo(() => {
        if (isSidebarMobile) return '50%';
        const sidebarWidth = sidebarState === 'collapsed'
            ? 'var(--sidebar-width-icon)'
            : 'var(--sidebar-width)';
        return `calc(50% + (${sidebarWidth} / 2))`;
    }, [isSidebarMobile, sidebarState]);

    /* The composer is `fixed`, so its width resolves against the *viewport* while
       `inputCenterLeft` centres it on the narrower content column. Those two
       disagree, and the gap is the sidebar: at 900px with the sidebar open the old
       `w-[calc(100%-32px)]` produced an 868px-wide bar centred at 578px, i.e.
       running under the sidebar on the left and off-screen on the right. Only
       `max-w-3xl` was hiding it on wide monitors. Subtracting the sidebar here
       makes the bar sit inside the content column at every width. */
    const inputShellWidth = useMemo(() => {
        if (isSidebarMobile) return 'calc(100% - 2rem)';
        const sidebarWidth = sidebarState === 'collapsed'
            ? 'var(--sidebar-width-icon)'
            : 'var(--sidebar-width)';
        return `calc(100% - ${sidebarWidth} - 3rem)`;
    }, [isSidebarMobile, sidebarState]);

    // OPTIMIZATION: Separate user input state from search-triggering state
    const [userInput, setUserInput] = useState(''); // Only for display, doesn't trigger renders
    const deferredUserInput = useDeferredValue(userInput); // Deferred value for performance
    const [submittedQuery, setSubmittedQuery] = useState(''); // Only updates when user submits

    const [loadingSearch, setLoadingSearch] = useState(false);
    const [researchProgress, setResearchProgress] = useState(null);
    // Context and hooks
    const { libId } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser } = useAuth();
    const { selectedModel, updateSelectedModel, effortLevel } = useModel();

    const [searchType, setSearchType] = useState(searchInputRecord?.type === 'research' ? 'research' : 'search');
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const recognitionRef = useRef(null);
    const isListeningRef = useRef(false);
    const [isReading, setIsReading] = useState(false);
    const [readingChatId, setReadingChatId] = useState(null);
    const [copiedText, setCopiedText] = useState(null);
    const [copiedPromptId, setCopiedPromptId] = useState(null);
    const [activePromptActionsId, setActivePromptActionsId] = useState(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [chatReactions, setChatReactions] = useState({});
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    /* Composer disclosure. This composer is `fixed` over the answer it exists to
       let you read, so its secondary toolbar row collapses while idle.
       `openMenuCount` is not redundant with `showPlusMenu`: Radix portals
       dropdown/popover content *outside* the card, so the blur that fires when the
       model menu opens is indistinguishable from "focus left the composer" unless
       something tracks that a menu took it. */
    const [composerFocused, setComposerFocused] = useState(false);
    const [openMenuCount, setOpenMenuCount] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [fileUploadError, setFileUploadError] = useState('');
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [showResearchLimitModal, setShowResearchLimitModal] = useState(false);
    const [researchUsage, setResearchUsage] = useState({
        loading: false,
        canResearch: true,
        remaining: -1,
        weeklyLimit: -1,
        weeklyCount: 0,
        plan: 'free'
    });

    // Global Drag & Drop State
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [dragAccepting, setDragAccepting] = useState(true);
    const dragCounterRef = useRef(0);

    // Connected App State
    const [selectedConnectedApp, setSelectedConnectedApp] = useState(null);
    const { connectedApps } = useAppConnections();

    // Pasted content state (array — supports multiple pastes)
    const [pastedContents, setPastedContents] = useState([]);

    const handlePaste = useCallback((e) => {
        const text = e.clipboardData?.getData('text/plain');
        if (!text) return;

        if (isLargePastedContent(text)) {
            e.preventDefault();
            setPastedContents(prev => [...prev, normalizePastedText(text)]);
        }
    }, []);

    // Refs
    const textareaRef = useRef(null);
    const speechSynthesisRef = useRef(null);
    const speechTimeoutRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const plusMenuRef = useRef(null);
    const promptPressTimerRef = useRef(null);
    const isSubmittingSearchRef = useRef(false);

    // Initialize selectedConnectedApp from URL query param (passed from ChatBoxAiInput on first navigation)
    useEffect(() => {
        const appIdParam = searchParams.get('appId');
        if (appIdParam && !selectedConnectedApp && connectedApps?.length > 0) {
            const matchedApp = connectedApps.find(app => app.appId === appIdParam);
            if (matchedApp) {
                setSelectedConnectedApp(matchedApp);
            }
        }
    }, [searchParams, connectedApps, selectedConnectedApp]);

    const routeResponseStyle = useMemo(() => {
        const detailLevel = searchParams?.get('detailLevel');
        const maxTokens = Number(searchParams?.get('maxTokens'));

        if (!['brief', 'balanced', 'detailed'].includes(detailLevel)) {
            return null;
        }

        return {
            detailLevel,
            maxOutputTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : undefined,
        };
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hasTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
        setIsTouchDevice(hasTouch);
    }, []);

    useEffect(() => {
        return () => {
            if (promptPressTimerRef.current) {
                clearTimeout(promptPressTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (searchType === 'research') {
             if (!DEEP_RESEARCH_MODELS.some(m => m.id === selectedModel?.id)) {
                 updateSelectedModel(DEEP_RESEARCH_MODELS[0]);
             }
        } else {
             if (!AIModelsOption.some(m => m.id === selectedModel?.id)) {
                 updateSelectedModel(AIModelsOption[0]);
             }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchType, updateSelectedModel]);

    // Sync context with database record model
    useEffect(() => {
        if (searchInputRecord?.selectedModel) {
            const found = [...AIModelsOption, ...DEEP_RESEARCH_MODELS].find(
                m => m.modelApi === searchInputRecord.selectedModel || m.id === searchInputRecord.selectedModel
            );
            if (found && found.id !== selectedModel?.id) {
                // Only update if it's a valid model for the current searchType
                const isValidForType = searchType === 'research' 
                    ? DEEP_RESEARCH_MODELS.some(m => m.id === found.id)
                    : AIModelsOption.some(m => m.id === found.id);
                
                if (isValidForType) {
                    updateSelectedModel(found);
                }
            }
        }
    }, [searchInputRecord?.selectedModel, searchType, updateSelectedModel]);
    const { isPro, isMax, paidCredits, planName } = useUserPlan();
    const { selectedVoiceId } = useVoicePreference();


    const fetchResearchUsage = useCallback(async () => {
        if (!currentUser?.email) return;
        setResearchUsage(prev => ({ ...prev, loading: true }));
        try {
            const token = await currentUser?.getIdToken?.().catch(() => null);
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resp = await fetch(`/api/research?user_email=${encodeURIComponent(currentUser.email)}`, {
                headers
            });
            const data = await resp.json();
            if (resp.ok) {
                setResearchUsage({
                    loading: false,
                    canResearch: !!data.canResearch,
                    remaining: typeof data.remaining === 'number' ? data.remaining : -1,
                    weeklyLimit: typeof data.weeklyLimit === 'number' ? data.weeklyLimit : -1,
                    weeklyCount: typeof data.weeklyCount === 'number' ? data.weeklyCount : 0,
                    plan: data.plan || (isMax ? 'max' : isPro ? 'pro' : 'free')
                });
            } else {
                const defaultLimit = isMax ? 25 : isPro ? 15 : 5;
                setResearchUsage({
                    loading: false,
                    canResearch: true,
                    remaining: defaultLimit,
                    weeklyLimit: defaultLimit,
                    weeklyCount: 0,
                    plan: planName || (isMax ? 'max' : isPro ? 'pro' : 'free')
                });
            }
        } catch (e) {
            const defaultLimit = isMax ? 25 : isPro ? 15 : 5;
            setResearchUsage({
                loading: false,
                canResearch: true,
                remaining: defaultLimit,
                weeklyLimit: defaultLimit,
                weeklyCount: 0,
                plan: planName || (isMax ? 'max' : isPro ? 'pro' : 'free')
            });
        }
    }, [currentUser?.email, isPro, isMax, planName]);

    useEffect(() => {
        if (currentUser?.email) {
            fetchResearchUsage();
        }
    }, [currentUser?.email, fetchResearchUsage]);

    // OPTIMIZATION: Memoized constants to prevent recreation
    const ALLOWED_FILE_TYPES = useMemo(() => ({
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
        'text/csv': ['.csv'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        // Video types — analysed by NVIDIA Omni on the backend
        'video/mp4': ['.mp4'],
        'video/webm': ['.webm'],
        'video/quicktime': ['.mov'],
        'video/x-msvideo': ['.avi'],
        'video/mpeg': ['.mpeg', '.mpg'],
        'video/ogg': ['.ogv'],
        // Audio types — analysed by NVIDIA Omni on the backend
        'audio/mpeg': ['.mp3'],
        'audio/wav': ['.wav'],
        'audio/ogg': ['.ogg'],
        'audio/webm': ['.weba'],
        'audio/mp4': ['.m4a'],
        'audio/aac': ['.aac'],
        'audio/flac': ['.flac'],
        'audio/x-wav': ['.wav'],
    }), []);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const toBooleanValue = useCallback((value) => {
        if (value === true || value === 'true' || value === 'liked') return true;
        return false;
    }, []);

    const parseJsonField = useCallback((value, fallback = []) => {
        if (Array.isArray(value) || (value && typeof value === 'object')) return value;
        if (typeof value !== 'string') return fallback;
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }, []);

    const parseJsonArrayField = useCallback((value, fallback = []) => {
        return safeParseArray(value, fallback);
    }, []);

    const normalizePrompt = useCallback((value = '') => {
        return String(value || '')
            .toLowerCase()
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }, []);

    const parsePromptParts = useCallback((promptText) => {
        const raw = String(promptText || '').trim();
        if (!raw) return { question: '', pastes: [] };

        const contextHeader = 'The user shared the following context:';
        const questionHeader = 'User question:';
        const defaultPasteQuestion = 'Please analyze and explain the provided context in detail.';

        if (raw.includes(contextHeader)) {
            const afterContext = raw.split(contextHeader)[1] || '';
            let contextBlock = afterContext;
            let question = '';

            if (afterContext.includes(questionHeader)) {
                const [contextPart, questionPart] = afterContext.split(questionHeader);
                contextBlock = contextPart || '';
                question = (questionPart || '').trim();
            }

            if (!question && contextBlock.includes(defaultPasteQuestion)) {
                const defaultQuestionIndex = contextBlock.lastIndexOf(defaultPasteQuestion);
                question = defaultPasteQuestion;
                contextBlock = contextBlock.slice(0, defaultQuestionIndex).trim();
            }

            const pasteRegex = /Paste\s+\d+:\n([\s\S]*?)(?=\n\n\[Context Separator\]\n\n|$)/g;
            const pastes = [];
            let match;
            while ((match = pasteRegex.exec(contextBlock)) !== null) {
                const content = (match[1] || '').trim();
                if (content) pastes.push(content);
            }

            if (pastes.length === 0) {
                const fallbackContext = contextBlock.replace(/\[Context Separator\]/g, '').trim();
                if (fallbackContext) pastes.push(fallbackContext);
            }

            if (!question) {
                const cleanedContext = contextBlock
                    .replace(/Paste\s+\d+:\n([\s\S]*?)(?=\n\n\[Context Separator\]\n\n|$)/g, '')
                    .replace(/\[Context Separator\]/g, '')
                    .trim();
                if (cleanedContext) question = cleanedContext;
            }

            return { question: question || raw, pastes };
        }

        return { question: raw, pastes: [] };
    }, []);

    const getWebResults = useCallback((record) => {
        const rawResults = safeParseArray(record?.searchResult);
        if (rawResults.length > 0) return rawResults;

        const catWeb = safeParseArray(record?.categorizedResults?.web);
        if (catWeb.length > 0) return catWeb;

        const mixed = safeParseArray(record?.mixedResults);
        if (mixed.length > 0) return mixed.filter(item => item?.resultType === 'web');

        return [];
    }, []);

    const hasSourceResults = useCallback((record) => {
        return getWebResults(record).length > 0;
    }, [getWebResults]);

    const hasImageResults = useCallback((record) => {
        const items = safeParseArray(record?.searchResult);
        if (items.length > 0 && items.some(item => item?.image || item?.thumbnail)) {
            return true;
        }

        const catImages = safeParseArray(record?.categorizedResults?.images);
        return catImages.some(item => item?.image || item?.thumbnail || item?.url);
    }, []);

    const hasVideoResults = useCallback((record) => {
        const items = safeParseArray(record?.searchResult);
        const patterns = [
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
        const checkItem = item => {
            const url = typeof item?.url === 'string' ? item.url : '';
            return patterns.some(pattern => url.toLowerCase().includes(pattern));
        };

        if (items.length > 0 && items.some(checkItem)) {
            return true;
        }

        const catVideos = safeParseArray(record?.categorizedResults?.videos);
        return catVideos.some(checkItem);
    }, []);

    // Parse tool call results from AI response text for rich card display
    const parseToolCallsFromResponse = useCallback((aiResp) => {
        if (!aiResp) return undefined;
        const toolCalls = [];

        // Detect email sent pattern: "✅ **Email Sent Successfully**"
        const emailSentMatch = aiResp.match(/✅\s*\*?\*?Email Sent Successfully\*?\*?/);
        if (emailSentMatch) {
            const toMatch = aiResp.match(/📧\s*\*?\*?To:\*?\*?\s*(.+?)(?:\n|$)/);
            const subjectMatch = aiResp.match(/📋\s*\*?\*?Subject:\*?\*?\s*(.+?)(?:\n|$)/);
            const contentMatch = aiResp.match(/\*?\*?Email Content:\*?\*?\s*\n\n([\s\S]*?)(?:\n\n---|\n\n✅|\n\n❌|$)/);

            toolCalls.push({
                status: 'success',
                appName: 'Gmail',
                appIcon: '/app_logo_connection/gmail.png',
                toolName: 'Send Email',
                toolId: 'gmail_send_email',
                parameters: {
                    to: toMatch?.[1]?.trim() || '',
                    subject: subjectMatch?.[1]?.trim() || '',
                    body: contentMatch?.[1]?.trim() || '',
                },
                result: { status: 'sent' },
            });
        }

        // Detect reply sent pattern: "✅ **Reply Sent Successfully**"
        const replySentMatch = aiResp.match(/✅\s*\*?\*?Reply Sent Successfully\*?\*?/);
        if (replySentMatch) {
            const toMatch = aiResp.match(/↩️\s*\*?\*?To:\*?\*?\s*(.+?)(?:\n|$)/);
            const subjectMatch = aiResp.match(/📋\s*\*?\*?Subject:\*?\*?\s*(.+?)(?:\n|$)/);
            const contentMatch = aiResp.match(/\*?\*?Reply Content:\*?\*?\s*\n\n([\s\S]*?)(?:\n\n---|\n\n✅|\n\n❌|$)/);

            toolCalls.push({
                status: 'success',
                appName: 'Gmail',
                appIcon: '/app_logo_connection/gmail.png',
                toolName: 'Reply to Email',
                toolId: 'gmail_reply_email',
                parameters: {
                    to: toMatch?.[1]?.trim() || '',
                    subject: subjectMatch?.[1]?.trim() || '',
                    body: contentMatch?.[1]?.trim() || '',
                },
                result: { status: 'replied' },
            });
        }

        // Detect draft saved pattern: "✅ **Draft Saved**"
        const draftMatch = aiResp.match(/✅\s*\*?\*?Draft Saved\*?\*?/);
        if (draftMatch) {
            const toMatch = aiResp.match(/📝\s*\*?\*?To:\*?\*?\s*(.+?)(?:\n|$)/);
            const subjectMatch = aiResp.match(/📋\s*\*?\*?Subject:\*?\*?\s*(.+?)(?:\n|$)/);

            toolCalls.push({
                status: 'success',
                appName: 'Gmail',
                appIcon: '/app_logo_connection/gmail.png',
                toolName: 'Create Draft',
                toolId: 'gmail_create_draft',
                parameters: {
                    to: toMatch?.[1]?.trim() || '',
                    subject: subjectMatch?.[1]?.trim() || '',
                },
                result: { status: 'drafted' },
            });
        }

        // Detect Canva design results: "✅ **Canva Design** — [title]" or "<!--CANVA_DESIGN:{...}-->"
        const canvaDesignDataMatch = aiResp.match(/<!--CANVA_DESIGN:([\s\S]*?)-->/);
        if (canvaDesignDataMatch) {
            try {
                const canvaData = JSON.parse(canvaDesignDataMatch[1]);
                const canvaStatus = String(canvaData?.status || canvaData?.stage || '').toLowerCase();
                const isCanvaPending = ['queued', 'in_progress', 'processing', 'pending', 'running'].includes(canvaStatus);
                toolCalls.push({
                    status: isCanvaPending ? 'loading' : 'success',
                    appName: 'Canva',
                    appIcon: '/app_logo_connection/CANVA.png',
                    toolName: 'Generate Design',
                    toolId: 'canva_generate_design',
                    result: {
                        ...canvaData,
                        _canvaDesign: !isCanvaPending,
                    },
                    parameters: { prompt: canvaData.prompt || '' },
                });
            } catch { /* ignore parse errors */ }
        }

        // Detect Canva design success with image URL pattern
        const canvaSuccessMatch = aiResp.match(/✅\s*\*?\*?Canva Design\*?\*?\s*(?:—|→)\s*(.+?)(?:\n|$)/);
        if (canvaSuccessMatch && !canvaDesignDataMatch) {
            const imageUrlMatch = aiResp.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
            const editUrlMatch = aiResp.match(/\[(?:Edit in Canva|Open in Canva|View)\]\((https?:\/\/[^\s)]+)\)/);
            const downloadUrlMatch = aiResp.match(/\[(?:Download|Download PNG|Download Image)\]\((https?:\/\/[^\s)]+)\)/);

            toolCalls.push({
                status: 'success',
                appName: 'Canva',
                appIcon: '/app_logo_connection/CANVA.png',
                toolName: 'Generate Design',
                toolId: 'canva_generate_design',
                result: {
                    _canvaDesign: true,
                    imageUrl: imageUrlMatch?.[1] || downloadUrlMatch?.[1] || null,
                    editUrl: editUrlMatch?.[1] || null,
                    downloadUrl: downloadUrlMatch?.[1] || imageUrlMatch?.[1] || null,
                    prompt: canvaSuccessMatch[1]?.trim() || '',
                },
                parameters: { prompt: canvaSuccessMatch[1]?.trim() || '' },
            });
        }

        // Detect generic tool success: "✅ **AppName** → toolId completed successfully"
        const genericSuccessRegex = /✅\s*\*?\*?(.+?)\*?\*?\s*→\s*(\S+)\s*completed successfully/g;
        let genericMatch;
        while ((genericMatch = genericSuccessRegex.exec(aiResp)) !== null) {
            // Skip if we already parsed this as an email/reply/draft
            if (genericMatch[2] === 'gmail_send_email' && emailSentMatch) continue;
            if (genericMatch[2] === 'gmail_reply_email' && replySentMatch) continue;
            if (genericMatch[2] === 'gmail_create_draft' && draftMatch) continue;
            toolCalls.push({
                status: 'success',
                appName: genericMatch[1].trim(),
                appIcon: null,
                toolName: genericMatch[2].trim(),
                toolId: genericMatch[2].trim(),
                result: null,
            });
        }

        // Detect Drive Files results: "✅ **Drive Files** (N found)"
        const driveFilesMatch = aiResp.match(/✅\s*\*?\*?Drive Files\*?\*?\s*\((\d+)\s*found\)/);
        if (driveFilesMatch) {
            // Try to extract file data from hidden comment
            let driveFiles = [];
            const driveDataMatch = aiResp.match(/<!--DRIVE_FILES:([\s\S]*?)-->/);
            if (driveDataMatch) {
                try {
                    driveFiles = JSON.parse(driveDataMatch[1]);
                } catch { /* ignore parse errors */ }
            }

            toolCalls.push({
                status: 'success',
                appName: 'Google Drive',
                appIcon: '/app_logo_connection/google drive.png',
                toolName: 'Search Files',
                toolId: 'drive_search_files',
                driveFiles: driveFiles,
                result: { count: parseInt(driveFilesMatch[1]) },
            });
        }

        // Detect Drive Search no results
        const driveNoResults = aiResp.match(/✅\s*\*?\*?Drive Search\*?\*?\s*—\s*No files found/);
        if (driveNoResults) {
            toolCalls.push({
                status: 'success',
                appName: 'Google Drive',
                appIcon: '/app_logo_connection/google drive.png',
                toolName: 'Search Files',
                toolId: 'drive_search_files',
                driveFiles: [],
                result: { count: 0 },
            });
        }

        // Detect tool failures: "❌ **AppName** → toolId failed"
        const failRegex = /❌\s*\*?\*?(.+?)\*?\*?\s*→\s*(\S+)\s*failed:\s*(.+?)(?:\n|$)/g;
        let failMatch;
        while ((failMatch = failRegex.exec(aiResp)) !== null) {
            toolCalls.push({
                status: 'failed',
                appName: failMatch[1].trim(),
                appIcon: null,
                toolName: failMatch[2].trim(),
                toolId: failMatch[2].trim(),
                error: failMatch[3].trim(),
            });
        }

        return toolCalls.length > 0 ? toolCalls : undefined;
    }, []);

    // Strip tool result sections from aiResp when they're shown via ToolCallIndicator cards
    const stripToolResultsFromResponse = useCallback((aiResp) => {
        if (!aiResp) return aiResp;
        let cleaned = aiResp;
        // Remove hidden Drive files data comment
        cleaned = cleaned.replace(/<!--DRIVE_FILES:[\s\S]*?-->/g, '');
        // Remove hidden Canva design data comment
        cleaned = cleaned.replace(/<!--CANVA_DESIGN:[\s\S]*?-->/g, '');
        // Remove "✅ **Canva Design**" block (shown as card instead)
        cleaned = cleaned.replace(/✅\s*\*?\*?Canva Design\*?\*?\s*—[\s\S]*?(?=\n\n[^!\[\]\s]|\n\n$|$)/, '');
        // Remove "✅ **Canva Export Ready**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?Canva Export Ready\*?\*?[\s\S]*?(?=\n\n[^⏰\[\]\s]|\n\n$|$)/, '');
        // Remove "✅ **Canva Designs**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?Canva Designs\*?\*?\s*\(\d+\s*found\)[\s\S]*?(?=\n\n[^0-9\s]|\n\n$|$)/, '');
        // Remove "✅ **Email Sent Successfully**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?Email Sent Successfully\*?\*?[\s\S]*?(?=\n\n[^📧📋↩️📝\-\*]|\n\n$|$)/, '');
        // Remove "✅ **Reply Sent Successfully**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?Reply Sent Successfully\*?\*?[\s\S]*?(?=\n\n[^↩️📋📝\-\*]|\n\n$|$)/, '');
        // Remove "✅ **Draft Saved**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?Draft Saved\*?\*?[\s\S]*?(?=\n\n[^📝📋\-\*]|\n\n$|$)/, '');
        // Remove "✅ **Drive Files**" block (entire file list)
        cleaned = cleaned.replace(/✅\s*\*?\*?Drive Files\*?\*?\s*\(\d+\s*found\)[\s\S]*?(?=\n\n[^0-9\s]|\n\n$|$)/, '');
        // Remove "✅ **Drive Search**" no results
        cleaned = cleaned.replace(/✅\s*\*?\*?Drive Search\*?\*?\s*—[^\n]*/, '');
        // Remove "✅ **File Content Retrieved**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?File Content Retrieved\*?\*?[\s\S]*?(?=\n\n[^a-zA-Z\s]|\n\n$|$)/, '');
        // Remove "✅ **File Info**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?File Info\*?\*?[\s\S]*?(?=\n\n[^📁📏📅👤🔗\s]|\n\n$|$)/, '');
        // Remove "✅ **File Created**" block
        cleaned = cleaned.replace(/✅\s*\*?\*?File Created\*?\*?[\s\S]*?(?=\n\n[^📄🔗\s]|\n\n$|$)/, '');
        // Remove generic tool success blocks
        cleaned = cleaned.replace(/✅\s*\*?\*?.+?\*?\*?\s*→\s*\S+\s*completed successfully:[\s\S]*?(?=\n\n[^{"\s]|\n\n$|$)/g, '');
        // Remove tool failure blocks (including the raw JSON that follows)
        cleaned = cleaned.replace(/❌\s*\*?\*?.+?\*?\*?\s*→\s*\S+\s*failed:[\s\S]*?(?=\n\n[^{"{\s]|\n\n$|$)/g, '');
        // Remove raw JSON error blocks that leak into the response
        cleaned = cleaned.replace(/"error"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');
        // Remove raw JSON blocks starting with { that look like API responses
        cleaned = cleaned.replace(/\n\s*\{\s*\n\s*"(error|code|message|errors)"[\s\S]*?\}\s*\}?\s*/g, '');
        // Remove separator lines
        cleaned = cleaned.replace(/\n*---\s*\n*/g, '\n\n');
        // Clean up excessive newlines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
        return cleaned;
    }, []);

    const normalizeChatDocument = useCallback((chat) => {
        const base = {
            ...chat,
            id: chat.$id || chat.id,
            searchResult: parseJsonArrayField(chat.searchResult, []),
            processedFiles: parseJsonArrayField(chat.processedFiles, []),
            liked: toBooleanValue(chat.liked),
            disliked: toBooleanValue(chat.disliked),
        };

        // Parse tool call results from aiResp for rich display
        if (base.aiResp && !base.toolCalls) {
            base.toolCalls = parseToolCallsFromResponse(base.aiResp);
        }

        return base;
    }, [parseJsonArrayField, toBooleanValue, parseToolCallsFromResponse]);

    const buildChatDocument = useCallback((chatData) => {
        const normalized = { ...chatData };

        if (normalized.searchResult !== undefined) {
            normalized.searchResult = typeof normalized.searchResult === 'string'
                ? normalized.searchResult
                : JSON.stringify(normalized.searchResult || []);
        }

        if (normalized.processedFiles !== undefined) {
            normalized.processedFiles = typeof normalized.processedFiles === 'string'
                ? normalized.processedFiles
                : JSON.stringify(normalized.processedFiles || []);
        }

        if (normalized.liked !== undefined) {
            normalized.liked = normalized.liked ? 'true' : 'false';
        }

        if (normalized.disliked !== undefined) {
            normalized.disliked = normalized.disliked ? 'true' : 'false';
        }

        if (!normalized.analysisType) {
            normalized.analysisType = 'text_only';
        }

        if (normalized.analyzedFilesCount === undefined || normalized.analyzedFilesCount === null) {
            normalized.analyzedFilesCount = 0;
        }

        return normalized;
    }, []);

    const composePromptFromPastes = useCallback((inputText = '', pastedList = []) => {
        const trimmedInput = String(inputText || '').trim();
        const validPastes = (Array.isArray(pastedList) ? pastedList : [])
            .map((item) => String(item || '').trim())
            .filter(Boolean);

        if (validPastes.length === 0) {
            return trimmedInput;
        }

        const labeledPastes = validPastes
            .map((content, index) => `Paste ${index + 1}:\n${content}`)
            .join('\n\n[Context Separator]\n\n');

        const userQuestion = trimmedInput || 'Please analyze and explain the provided context in detail.';
        return `The user shared the following context:\n\n${labeledPastes}\n\nUser question:\n${userQuestion}`;
    }, []);

    const fetchSearchHistory = useCallback(async () => {
        if (!currentUser) return null;
        try {
            const token = await currentUser?.getIdToken?.().catch(() => null);
            if (!token) return null;
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`/api/search/history?libId=${encodeURIComponent(libId)}`, {
                headers,
            });
            return response?.data?.record || null;
        } catch (err) {
            if (err?.response?.status === 401) {
                console.warn('[fetchSearchHistory] Unauthorized (401). User session may be unauthenticated or expired.');
            } else {
                console.error('[fetchSearchHistory] Failed to fetch history:', err);
            }
            return null;
        }
    }, [libId, currentUser]);

    const createChatRecord = useCallback(async (chatData) => {
        const payload = {
            chatData: {
                ...buildChatDocument(chatData),
                libId,
            },
            userEmail: currentUser?.email || null,
        };

        const response = await axios.post('/api/search/chats', payload);
        return response?.data?.chat;
    }, [buildChatDocument, libId, currentUser?.email]);

    /* File type reads from the glyph, not from a hue. This used to be a
       six-colour rainbow (blue image, red PDF, blue-600 docx, green csv, purple
       video, pink audio) sitting inside a message region that is otherwise
       neutral — and two of those blues collided with blue = Deep Research. The
       filename is always rendered beside the icon, so the icon is a shape cue
       and does not have to carry the type on its own. */
    const getFileIcon = useCallback((file) => {
        const cls = 'w-3 h-3 shrink-0 text-ink-3';
        if (file.type.startsWith('image/')) {
            return <FileImage className={cls} aria-hidden="true" />;
        } else if (file.type.startsWith('video/')) {
            return <FileVideo className={cls} aria-hidden="true" />;
        } else if (file.type.startsWith('audio/')) {
            return <FileAudio className={cls} aria-hidden="true" />;
        } else if (file.type === 'text/csv' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return <FileSpreadsheet className={cls} aria-hidden="true" />;
        } else if (
            file.type === 'application/pdf' ||
            file.type === 'text/plain' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            return <FileText className={cls} aria-hidden="true" />;
        }
        return <File className={cls} aria-hidden="true" />;
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
            return `File type "${file.type}" is not supported. Allowed types: .pdf, .docx, .txt, .csv, .jpg, .png, .mp4, .mov, .webm, .mp3, .wav, .aac, .ogg, .flac`;
        }

        return null;
    }, [ALLOWED_FILE_TYPES, MAX_FILE_SIZE]);

    // OPTIMIZATION: Memoized upload function — routes through /api/upload-file to bypass storage RLS
    const uploadFileToStorage = useCallback(async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser?.uid || 'anonymous');

            const token = currentUser ? await currentUser.getIdToken().catch(() => '') : '';

            const response = await fetch('/api/upload-file', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
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

            // Check maximum files limit (20)
            const currentTotal = uploadedFiles.length;
            if (currentTotal + acceptedFiles.length > 20) {
                const errorMsg = `Upload limit exceeded. You can only attach up to 20 files per chat. (Current: ${currentTotal}, Attempted: ${acceptedFiles.length})`;
                setFileUploadError(errorMsg);
                toast.error(errorMsg);
                return;
            }

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
        multiple: true,
        maxFiles: 20,
        noClick: true,
        noKeyboard: true
    }), [ALLOWED_FILE_TYPES, MAX_FILE_SIZE]);

    // Dropzone configuration
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
        open
    } = useDropzone(dropzoneConfig);

    // OPTIMIZATION: Memoized remove file function — routes through /api/upload-file to bypass storage RLS
    const removeFile = useCallback((fileId) => {
        const handleRemoveFile = async () => {
            const fileToRemove = uploadedFiles.find(f => f.id === fileId);
            if (fileToRemove?.uploadResult?.path) {
                try {
                    const token = currentUser ? await currentUser.getIdToken().catch(() => '') : '';
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
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
        const normalizedType = type === 'research' ? 'research' : 'search';
        setSearchType(normalizedType);

        axios.patch('/api/search/library', {
            libId,
            updateData: { type: normalizedType }
        }).catch((error) => {
            console.warn('Failed to persist search type:', error?.message || error);
        });
    }, [libId]);

    // Close plus menu when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
                setShowPlusMenu(false);
            }
        };
        if (showPlusMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPlusMenu]);

    // Command palette state and shortcut
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [commandInitialQuery, setCommandInitialQuery] = useState('');

    // Global shortcut: Ctrl/Cmd+K to open Command Palette
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCommandInitialQuery('');
                setShowCommandPalette(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const handleFileUploadToggle = useCallback(() => {
        open();
    }, [open]);

    const handleModelSelect = useCallback((modelId) => {
        updateSelectedModel(modelId);
    }, [updateSelectedModel]);

    const parseFileList = useCallback((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }, []);

    const getCurrentUploadedFiles = useCallback(() => {
        return (uploadedFiles || [])
            .map((fileItem) => ({
                path: fileItem?.uploadResult?.path,
                publicUrl: fileItem?.uploadResult?.publicUrl,
                fileName: fileItem?.uploadResult?.fileName,
                fileType: fileItem?.uploadResult?.fileType,
                fileSize: fileItem?.uploadResult?.fileSize,
            }))
            .filter((fileItem) => fileItem?.path || fileItem?.publicUrl);
    }, [uploadedFiles]);

    const dedupeFiles = useCallback((files = []) => {
        const seen = new Set();
        const merged = [];

        files.forEach((item) => {
            if (!item) return;
            const key = item.path || item.publicUrl || item.fileName;
            if (!key || seen.has(key)) return;
            seen.add(key);
            merged.push(item);
        });

        return merged;
    }, []);

    const getConversationFiles = useCallback(() => {
        const files = [];

        const conversationFiles = localStorage.getItem(`conversation_files_${libId}`);
        if (conversationFiles) {
            files.push(...parseFileList(conversationFiles));
        }

        const legacyFiles = localStorage.getItem(`files_${libId}`);
        if (legacyFiles) {
            files.push(...parseFileList(legacyFiles));
        }

        return dedupeFiles(files);
    }, [libId, parseFileList, dedupeFiles]);

    const resolveFileContext = useCallback(() => {
        const currentFiles = getCurrentUploadedFiles();
        const recordFiles = parseFileList(searchInputRecord?.uploadedFiles);
        const loadedRecordFiles = parseFileList(searchResult?.uploadedFiles);
        const storedFiles = getConversationFiles();

        return dedupeFiles([
            ...currentFiles,
            ...recordFiles,
            ...loadedRecordFiles,
            ...storedFiles,
        ]);
    }, [getCurrentUploadedFiles, parseFileList, searchInputRecord?.uploadedFiles, searchResult?.uploadedFiles, getConversationFiles, dedupeFiles]);

    const persistFileContext = useCallback(async (files) => {
        const normalizedFiles = dedupeFiles(Array.isArray(files) ? files : []);
        if (normalizedFiles.length === 0) return;

        try {
            localStorage.setItem(`conversation_files_${libId}`, JSON.stringify(normalizedFiles));
        } catch (error) {
            console.warn('Failed to store files in localStorage:', error);
        }

        try {
            await axios.patch('/api/search/library', {
                libId,
                updateData: {
                    uploadedFiles: normalizedFiles,
                    hasFiles: true,
                    analyzedFilesCount: normalizedFiles.length,
                    type: searchType || searchInputRecord?.type || 'search',
                }
            });
        } catch (error) {
            console.warn('Failed to persist files to library:', error?.message || error);
        }

        setSearchResult((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                uploadedFiles: normalizedFiles,
                hasFiles: true,
            };
        });
    }, [dedupeFiles, libId, searchType, searchInputRecord?.type]);

    // OPTIMIZATION: Memoized function to check if conversation has file context
    const hasConversationFiles = useCallback(() => {
        return resolveFileContext().length > 0;
    }, [resolveFileContext]);

    // OPTIMIZATION: Memoized function to clear conversation files
    const clearConversationFiles = useCallback(() => {
        try {
            localStorage.removeItem(`conversation_files_${libId}`);
            localStorage.removeItem(`files_${libId}`);

            axios.patch('/api/search/library', {
                libId,
                updateData: {
                    uploadedFiles: [],
                    hasFiles: false,
                    analyzedFilesCount: 0,
                }
            }).catch((error) => {
                console.warn('Failed to clear persisted library files:', error?.message || error);
            });

            // Force a re-render to update UI
            setRefreshTrigger(prev => prev + 1);
            toast.success('Conversation files cleared');
        } catch (e) {
            console.error('Failed to clear conversation files:', e);
        }
    }, [libId]);

    // Auto-clear file context after successful send so each message starts fresh.
    const clearFileContextAfterSuccess = useCallback(async () => {
        setUploadedFiles([]);
        setUploadProgress({});
        setFileUploadError('');

        try {
            localStorage.removeItem(`conversation_files_${libId}`);
            localStorage.removeItem(`files_${libId}`);
        } catch (error) {
            console.warn('Failed to clear file context from localStorage:', error);
        }

        try {
            await axios.patch('/api/search/library', {
                libId,
                updateData: {
                    uploadedFiles: [],
                    hasFiles: false,
                    analyzedFilesCount: 0,
                }
            });
        } catch (error) {
            console.warn('Failed to clear file context from library:', error?.message || error);
        }

        setSearchResult((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                uploadedFiles: [],
                hasFiles: false,
                analyzedFilesCount: 0,
            };
        });
        setRefreshTrigger(prev => prev + 1);
    }, [libId]);

    // OPTIMIZATION: Memoized helper function
    const stripHtmlTags = useCallback((html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }, []);

    // OPTIMIZATION: Memoized font adjustment function

    // OPTIMIZATION: Core async functions moved here to be available for useEffect hooks

    // OPTIMIZATION: Memoized GetSearchRecords function
    const GetSearchRecords = useCallback(async () => {
        try {
            const record = await fetchSearchHistory();
            if (!record) return;

            const chats = (record.Chats || []).map(normalizeChatDocument);
            const normalizedRecord = { ...record, Chats: chats };

            // console.log('Updated Library data:', record);
            setSearchResult(normalizedRecord);
            setSearchType(record?.type === 'research' ? 'research' : 'search');
            setRefreshTrigger(prev => prev + 1); // Force component refresh

            // Load reactions for each chat
            const reactions = {};
            chats.forEach(chat => {
                reactions[chat.id] = {
                    liked: toBooleanValue(chat.liked),
                    disliked: toBooleanValue(chat.disliked)
                };
            });
            setChatReactions(reactions);

            // Return the updated data for immediate use
            return normalizedRecord;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, [fetchSearchHistory, normalizeChatDocument, toBooleanValue]);

    // OPTIMIZATION: Memoized startPollingForUpdates function
    const startPollingForUpdates = useCallback(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        const isCanvaWorkflow = selectedConnectedApp?.appId === 'canva' || searchParams.get('appId') === 'canva' || searchResult?.selectedAppId === 'canva';

        const interval = setInterval(async () => {
            try {
                const updatedLibrary = await fetchSearchHistory();
                if (!updatedLibrary) return;

                const updatedChats = (updatedLibrary.Chats || []).map(normalizeChatDocument);
                const normalizedLibrary = { ...updatedLibrary, Chats: updatedChats };

                const currentChats = searchResult?.Chats || [];
                const hasChatCountChanged = updatedChats.length !== currentChats.length;

                const latestChat = updatedChats[updatedChats.length - 1];
                const latestAiResp = latestChat?.aiResp || '';
                const latestHasPendingCanva = hasPendingCanvaDesign(latestAiResp);
                const latestHasCompletedCanva = hasRenderableCanvaDesign(latestAiResp);

                // Check if any chat has received an AI response by comparing chat IDs
                const hasNewAiResponse = updatedChats.some(updatedChat => {
                    const currentChat = currentChats.find(c => c.id === updatedChat.id);
                    return currentChat && !currentChat.aiResp && updatedChat.aiResp;
                });

                // Check if all chats now have AI responses that are not still waiting on Canva completion
                const allChatsHaveAiResp = updatedChats.length > 0 && updatedChats.every(chat => {
                    if (!chat.aiResp) return false;
                    return !hasPendingCanvaDesign(chat.aiResp);
                });

                if (hasChatCountChanged || hasNewAiResponse || allChatsHaveAiResp) {
                    // Update the search result state immediately to trigger re-render
                    setSearchResult(normalizedLibrary);
                    setRefreshTrigger(prev => prev + 1);

                    // Update reactions state
                    const reactions = {};
                    updatedChats.forEach(chat => {
                        reactions[chat.id] = {
                            liked: toBooleanValue(chat.liked),
                            disliked: toBooleanValue(chat.disliked)
                        };
                    });
                    setChatReactions(reactions);

                    // Keep loading active until the Canva design payload exists.
                    if (latestChat?.aiResp || hasNewAiResponse || allChatsHaveAiResp) {
                        if (latestHasPendingCanva && !latestHasCompletedCanva) {
                            setLoadingSearch(true);
                            setResearchProgress({
                                phase: 'canva',
                                message: 'Canva is still generating your design...'
                            });
                        } else {
                            setLoadingSearch(false);
                            setResearchProgress(null);
                        }
                    }

                    // Stop polling if all chats have AI responses
                    if (allChatsHaveAiResp) {
                        clearInterval(interval);
                        setPollingInterval(null);
                    }
                }
            } catch (error) {
                console.error('Error polling for updates:', error);
            }
        }, 1500); // Poll every 1.5 seconds for faster updates

        setPollingInterval(interval);

        // Auto-stop polling after a longer window for Canva workflows so slow jobs stay active.
        setTimeout(() => {
            clearInterval(interval);
            setPollingInterval(null);
            setLoadingSearch(false); // Also set to false on timeout
            setResearchProgress(null);
        }, (isCanvaWorkflow ? 20 : 5) * 60 * 1000);
    }, [fetchSearchHistory, searchResult, pollingInterval, normalizeChatDocument, toBooleanValue, selectedConnectedApp?.appId, searchParams]);

    // OPTIMIZATION: Memoized GenerateAIResp function
    const GenerateAIResp = useCallback(async (formattedSearchResp, recordId, useDirectModel = false, finalPrompt = '', responseMode = 'search', previousAiResp = null) => {
        try {
            // console.log('Starting AI response generation for record ID:', recordId);

            // Always prefer explicit composed prompt from submit flow.
            const searchInput = finalPrompt?.trim() || deferredUserInput?.trim() || searchInputRecord?.searchInput;
            // console.log('Search input for AI:', searchInput);

            if (!searchInput?.trim()) {
                console.warn('No search input provided for AI generation');
                setLoadingSearch(false);
                return;
            }

            // console.log('Calling LLM model API...');
            const responseStyle = routeResponseStyle || getResponseStyleProfile({
                prompt: searchInput,
                model: selectedModel,
                responseMode: responseMode === 'research' ? 'research' : 'search',
            });

            // Get user email from auth context for memory injection
            const userEmail = currentUser?.email;

            // Always enable thinking mode for all queries so the Reasoning block is consistently shown
            const autoThinkingMode = true;

            const result = await axios.post('/api/llm-model', {
                searchInput: searchInput,
                searchResult: formattedSearchResp,
                recordId: recordId,
                selectedModel: selectedModel,
                isPro: isPro, // Pass user plan status for Auto model selection
                userPlan: planName || (isPro ? 'pro' : 'free'), // Fix: Explicitly pass userPlan to bypass free tier budget router limits
                useDirectModel: useDirectModel, // Flag to indicate Google API failed, use direct model
                responseMode: responseMode === 'research' ? 'research' : 'search',
                userEmail: userEmail, // Pass user email for memory context injection
                memoryEnabled,
                conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15), // Last 15 turns for Stage 1 filtering
                detailLevel: responseStyle.detailLevel,
                responseStyle,
                responseMaxTokens: responseStyle.maxOutputTokens,
                citationMode: 'enabled',
                languageMode: 'auto',
                selectedAppId: selectedConnectedApp?.appId || searchParams.get('appId') || null,
                isThinkingMode: autoThinkingMode,
                effortLevel: effortLevel || searchParams?.get('effort') || searchInputRecord?.effortLevel || 'auto',
                // Repeat-ask improvement: pass old answer so the AI generates a better one
                previousAiResp: previousAiResp || null,
            });


            // console.log('LLM API response:', result.status, result.data);

            // Get the runId from the response
            const runId = result.data; // This should contain the Inngest run ID

            // Validate runId before starting status checks
            if (!runId) {
                console.error('No runId received from LLM API');
                throw new Error('No runId received from LLM API');
            }

            // Poll the database directly for aiResp.
            // Previously this polled /api/get-inngest-status, which tried 4 Inngest REST
            // endpoints × 5s timeout each = up to 20s per check, guaranteed to exceed the
            // 10s client timeout (ECONNABORTED). Since Inngest writes aiResp to the DB when
            // complete, polling the DB is faster, simpler, and always reliable.

            const isCanvaWorkflow = selectedConnectedApp?.appId === 'canva' || searchParams.get('appId') === 'canva';

            let statusCheckCount = 0;
            let consecutiveErrors = 0;
            const maxStatusChecks = isCanvaWorkflow ? 600 : 150; // longer wait for Canva generation jobs
            const maxConsecutiveErrors = 8; // Give up only if DB itself becomes unavailable

            const interval = setInterval(async () => {
                statusCheckCount++;

                // Stop after max attempts
                if (statusCheckCount > maxStatusChecks) {
                    clearInterval(interval);
                    setLoadingSearch(false);
                    setResearchProgress(null);
                    return;
                }

                try {
                    const chatResp = await axios.get(
                        `/api/search/chats?chatId=${encodeURIComponent(recordId)}`,
                        { timeout: 8000 }
                    );
                    consecutiveErrors = 0; // Reset on a successful round-trip

                    const chat = chatResp?.data?.chat;
                    if (chat?.aiResp) {
                        const chatAiResp = String(chat.aiResp || '');
                        const chatHasPendingCanva = hasPendingCanvaDesign(chatAiResp);
                        const chatHasCompletedCanva = hasRenderableCanvaDesign(chatAiResp);

                        // Update UI immediately with the retrieved response
                        setSearchResult(prevResult => {
                            if (prevResult?.Chats) {
                                const updatedChats = prevResult.Chats.map(c =>
                                    c.id === recordId ? { ...c, aiResp: chat.aiResp } : c
                                );
                                return { ...prevResult, Chats: updatedChats };
                            }
                            return prevResult;
                        });
                        setRefreshTrigger(prev => prev + 1);

                        if (chatHasPendingCanva && !chatHasCompletedCanva) {
                            setLoadingSearch(true);
                            setResearchProgress({
                                phase: 'canva',
                                message: 'Canva is still generating your design...'
                            });
                            // Keep polling until the background monitor writes the final design payload.
                        } else {
                            clearInterval(interval);
                            setLoadingSearch(false);
                            setResearchProgress(null);

                            // Full library refresh for consistency
                            await GetSearchRecords();
                        }
                    }
                    // else: Inngest is still processing, keep polling

                } catch (statusError) {
                    consecutiveErrors++;
                    // Only abort if the DB endpoint itself is consistently failing
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        clearInterval(interval);
                        setLoadingSearch(false);
                        setResearchProgress(null);
                    }
                }

            }, 2000); // Poll every 2 seconds

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
            setResearchProgress(null);
            throw error;
        }
    }, [deferredUserInput, searchInputRecord, selectedModel, isPro, GetSearchRecords, selectedConnectedApp, searchParams]);

    const refreshCachedChatResult = useCallback(async ({ searchInput, mode, chatId, previousAiResp = '' }) => {
        try {
            if (!chatId || !searchInput?.trim()) {
                setLoadingSearch(false);
                return;
            }

            const uploadedFilesForAnalysis = resolveFileContext();
            const hasFiles = uploadedFilesForAnalysis.length > 0;

            if (hasFiles) {
                let analysisResult;
                try {
                    analysisResult = await axios.post('/api/analyze', {
                        prompt: searchInput,
                        filePaths: uploadedFilesForAnalysis,
                        libId,
                        userEmail: currentUser?.email || null,
                        conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15), // Last 15 turns for Stage 1 filtering
                    });
                } catch (analyzeError) {
                    analysisResult = await axios.post('/api/analyze-test', {
                        prompt: searchInput,
                        filePaths: uploadedFilesForAnalysis,
                        libId,
                        userEmail: currentUser?.email || null,
                        conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15), // Last 15 turns for Stage 1 filtering
                    });
                }

                const analysisResp = analysisResult?.data || {};
                const updateData = buildChatDocument({
                    searchResult: analysisResp.searchResult || [],
                    analysisType: 'file_analysis',
                    analyzedFilesCount: analysisResp.analyzedFiles || uploadedFilesForAnalysis.length || 0,
                    processedFiles: analysisResp.processedFiles || []
                });

                await axios.patch('/api/search/chats', { chatId, updateData });
                await persistFileContext(uploadedFilesForAnalysis);
                await GetSearchRecords();
                setLoadingSearch(false);
                return;
            }

            let formattedSearchResp = [];
            let useDirectModel = false;

            if (mode === 'research') {
                let researchResp;
                try {
                    const token = await currentUser?.getIdToken?.().catch(() => null);
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const result = await axios.post('/api/research', {
                        searchInput: searchInput,
                        selectedModel: selectedModel,
                        maxSources: 20,
                        includeDiversity: true,
                        user_email: currentUser?.email || null,
                        memoryEnabled,
                        conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15) // Last 15 turns for Stage 1 filtering
                    }, {
                        ...(Object.keys(headers).length > 0 ? { headers } : {})
                    });
                    researchResp = result.data;
                } catch (error) {
                    if (error?.response?.status === 403 && error?.response?.data?.error === 'RESEARCH_LIMIT_REACHED') {
                        setLoadingSearch(false);
                        setSearchType('search');
                        const data = error.response.data || {};
                        setResearchUsage({
                            loading: false,
                            canResearch: false,
                            remaining: data.remaining ?? 0,
                            weeklyLimit: data.weeklyLimit ?? (isMax ? 25 : isPro ? 15 : 5),
                            weeklyCount: data.weeklyCount ?? (data.weeklyLimit ?? 5),
                            plan: data.plan || (isMax ? 'max' : isPro ? 'pro' : 'free')
                        });
                        setShowResearchLimitModal(true);
                        return; // Stop here, don't fall back to direct model
                    }
                    console.warn('Research refresh failed, switching to direct model:', error?.message || error);
                    useDirectModel = true;
                }
                if (!useDirectModel && researchResp?.searchResult) {
                    formattedSearchResp = researchResp.searchResult.map((item, index) => ({
                        title: item?.title || '',
                        description: item?.description || '',
                        name: item?.displayLink || '',
                        image: item?.thumbnail || '',
                        url: item?.url || '',
                        thumbnail: item?.thumbnail || '',
                        deepResearch: true,
                        summary: item?.summary || '',
                        keyPoints: item?.keyPoints || [],
                        contentExcerpt: item?.contentExcerpt || '',
                        metadata: item?.metadata || {},
                        qualityScore: item?.qualityScore ?? item?.metadata?.qualityScore,
                        qualityBand: item?.qualityBand ?? item?.metadata?.qualityBand,
                        sourceHost: item?.sourceHost ?? item?.metadata?.sourceHost,
                        researchInsights: index === 0 ? (researchResp?.metadata || null) : null
                    }));
                } else {
                    useDirectModel = true;
                    formattedSearchResp = [];
                }
            } else {
                let searchResp;
                try {
                    const result = await axios.post('/api/deep-search', {
                        searchInput: searchInput,
                        searchType: 'search'
                    });
                    searchResp = result.data;
                } catch (error) {
                    console.warn('Search refresh failed, switching to direct model:', error?.message || error);
                    useDirectModel = true;
                }

                if (!useDirectModel && !(searchResp?.googleApiUnavailable || searchResp?.useDirectModel) && searchResp?.categorizedResults) {
                    formattedSearchResp = searchResp?.categorizedResults?.web?.map((item) => ({
                        title: item?.title || '',
                        description: item?.snippet || '',
                        name: item?.pagemap?.person?.[0]?.name || item?.displayLink || '',
                        image: item?.pagemap?.imageobject?.[0]?.url || item?.pagemap?.cse_image?.[0]?.src || '',
                        url: item?.link || '',
                        thumbnail: item?.pagemap?.cse_thumbnail?.[0]?.src || ''
                    })) || [];
                } else {
                    useDirectModel = true;
                    formattedSearchResp = [];
                }
            }

            const updateData = buildChatDocument({
                searchResult: formattedSearchResp,
                analysisType: 'text_only',
                analyzedFilesCount: 0,
                processedFiles: []
            });

            await axios.patch('/api/search/chats', { chatId, updateData });
            await GetSearchRecords();
            const refreshPrompt = previousAiResp?.trim()
                ? `${searchInput}\n\nPrevious answer:\n${previousAiResp}\n\nProvide a new updated answer using latest available information.`
                : searchInput;

            await GenerateAIResp(formattedSearchResp, chatId, useDirectModel, refreshPrompt, mode === 'research' ? 'research' : 'search');
        } catch (error) {
            console.error('Error refreshing cached response:', error);
            setLoadingSearch(false);
        }
    }, [resolveFileContext, searchResult?.Chats, libId, selectedModel, currentUser?.email, buildChatDocument, persistFileContext, GetSearchRecords, GenerateAIResp, startPollingForUpdates]);

    // OPTIMIZATION: Memoized main search function with enhanced file analysis integration
    // Features:
    // 1. Files persist throughout the conversation for repeated analysis
    // 2. Conversation history is included in file analysis for context
    // 3. Smart detection of file-related questions to use existing files
    // 4. Unified file and web search flow for seamless user experience
    const GetSearchApiResult = useCallback(async () => {
        // console.log('Starting GetSearchApiResult...');
        if (isSubmittingSearchRef.current) return;
        isSubmittingSearchRef.current = true;

        // Start loading state
        setLoadingSearch(true);
        setResearchProgress(null);

        try {
            // Build one canonical prompt per submit and reuse across all paths.
            const rawSearchInput = userInput?.trim() || searchInputRecord?.searchInput || '';
            const finalPrompt = composePromptFromPastes(rawSearchInput, pastedContents);
            // console.log('Search input:', searchInput);

            if (!finalPrompt) {
                console.warn('No search input provided');
                setLoadingSearch(false);
                return;
            }

            const currentSearchType = searchType || searchInputRecord?.type || 'search';
            const uploadedFilesForAnalysis = resolveFileContext();
            const hasFiles = uploadedFilesForAnalysis.length > 0;
            
            const autoThinkingMode = currentSearchType === 'research' || hasFiles
                ? true
                : requiresDeepReasoning(finalPrompt);

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
                            prompt: finalPrompt,
                            filePaths: uploadedFilesForAnalysis,
                            libId: libId,
                            userEmail: currentUser?.email || null,
                            conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15), // Last 15 turns for Stage 1 filtering
                        });
                        // console.log('File analysis API response:', result.status, result.data);
                    } catch (analyzeError) {
                        console.warn('Main analyze endpoint failed:', analyzeError.response?.status, analyzeError.response?.data || analyzeError.message);
                        // console.log('Trying test endpoint...');
                        result = await axios.post('/api/analyze-test', {
                            prompt: finalPrompt,
                            filePaths: uploadedFilesForAnalysis,
                            libId: libId,
                            userEmail: currentUser?.email || null,
                            conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15), // Last 15 turns for Stage 1 filtering
                        });
                        // console.log('File analysis test API response:', result.status, result.data);
                    }

                    const analysisResp = result.data;
                    // console.log('File analysis response received:', analysisResp);

                    const chatData = {
                        libId: libId,
                        searchResult: analysisResp.searchResult || [],
                        userSearchInput: finalPrompt || 'File Analysis',
                        aiResp: analysisResp.aiResponse || analysisResp.answer,
                        isThinkingMode: true,
                        analysisType: 'file_analysis',
                        analyzedFilesCount: analysisResp.analyzedFiles || uploadedFilesForAnalysis.length || 0,
                        processedFiles: analysisResp.processedFiles || []
                    };

                    // console.log('Inserting chat data for file analysis:', chatData);

                    const insertedChat = await createChatRecord(chatData);

                    // console.log('Successfully inserted file analysis chat:', insertedChat.$id);

                    await persistFileContext(uploadedFilesForAnalysis);

                    await GetSearchRecords();
                    await clearFileContextAfterSuccess();
                    setLoadingSearch(false);

                    // Clear input after successful search and update submitted query
                    setUserInput('');
                    setPastedContents([]);
                    setSubmittedQuery(finalPrompt);
                    return;

                } catch (error) {
                    console.error('File analysis failed:', error);
                    setLoadingSearch(false);
                    throw error;
                }

            } else {
                // Determine if this is Research mode or Search mode

                // ── Smart Reuse Logic ───────────────────────────────────────────────────
                // Passes selectedModelId so the backend can detect model switches.
                // New behavior:
                //   identity/creator queries → always live (bypass cache)
                //   model changed            → always live (new model must answer)
                //   any repeat own ask       → always live + pass previousAiResp so AI gives better answer
                //   another user's result    → show cache silently (no refresh)
                let previousAiRespContext = null; // Will hold the old cached answer for repeat asks
                try {
                    const reuseResp = await axios.post('/api/search/reuse', {
                        query: finalPrompt,
                        mode: currentSearchType,
                        userEmail: currentUser?.email || null,
                        selectedModelId: selectedModel?.modelApi || selectedModel?.id || null,
                    });

                    const reuseData = reuseResp?.data;
                    const reuseMatch = reuseData?.match;
                    const cacheDecision = reuseData?.cacheDecision;

                    // Capture the old answer so the AI can improve upon it
                    if (reuseData?.previousAiResp) {
                        previousAiRespContext = reuseData.previousAiResp;
                    }

                    if (reuseData?.hit && reuseMatch?.aiResp) {
                        // Only "use_cache_other_user" should reach here now
                        // (force_refresh always returns hit: false)
                        const cachedSearchResult = Array.isArray(reuseMatch.searchResult)
                            ? reuseMatch.searchResult
                            : [];

                        const chatData = {
                            libId: libId,
                            searchResult: cachedSearchResult,
                            userSearchInput: finalPrompt,
                            aiResp: reuseMatch.aiResp,
                            isThinkingMode: true,
                            analysisType: 'text_only',
                            analyzedFilesCount: 0,
                            processedFiles: []
                        };

                        await createChatRecord(chatData);
                        await GetSearchRecords();
                        await clearFileContextAfterSuccess();

                        setUserInput('');
                        setPastedContents([]);
                        setSubmittedQuery(finalPrompt);
                        setLoadingSearch(false);
                        return;
                    }
                } catch (reuseError) {
                    console.warn('Reuse check failed, continuing with live API flow:', reuseError?.message || reuseError);
                }

                const isResearchMode = currentSearchType === 'research';

                if (isResearchMode) {
                    // RESEARCH MODE: Deep, comprehensive analysis
                    // console.log('🔬 Starting RESEARCH mode for:', searchInput);

                    let researchResp;
                    const researchConversationHistory = searchResult?.Chats?.length > 0 
                        ? searchResult.Chats.map(c => ({
                            id: c.id,
                            userSearchInput: c.userSearchInput,
                            aiResp: c.aiResp,
                            analysisType: c.analysisType
                        })) 
                        : [];
                    setResearchProgress({
                        phase: 'planning',
                        message: 'Planning research strategy...'
                    });
                    try {
                        setResearchProgress({
                            phase: 'searching',
                            message: 'Collecting and ranking sources...'
                        });

                        const token = await currentUser?.getIdToken?.().catch(() => null);
                        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                        const result = await axios.post('/api/research', {
                            searchInput: finalPrompt,
                            selectedModel: selectedModel,
                            maxSources: 20,
                            includeDiversity: true,
                            user_email: currentUser?.email || null,
                            memoryEnabled,
                            conversationHistory: (searchResult?.Chats || searchInputRecord?.Chats || []).slice(-15) // Last 15 turns for Stage 1 filtering
                        }, {
                            ...(Object.keys(headers).length > 0 ? { headers } : {})
                        });
                        researchResp = result.data;
                    } catch (apiError) {
                        if (apiError?.response?.status === 403 && apiError?.response?.data?.error === 'RESEARCH_LIMIT_REACHED') {
                            setLoadingSearch(false);
                            setSearchType('search');
                            const data = apiError.response.data || {};
                            setResearchUsage({
                                loading: false,
                                canResearch: false,
                                remaining: data.remaining ?? 0,
                                weeklyLimit: data.weeklyLimit ?? (isMax ? 25 : isPro ? 15 : 5),
                                weeklyCount: data.weeklyCount ?? (data.weeklyLimit ?? 5),
                                plan: data.plan || (isMax ? 'max' : isPro ? 'pro' : 'free')
                            });
                            setShowResearchLimitModal(true);
                            return; // Stop here, don't fall back to direct model
                        }
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
                            userSearchInput: finalPrompt,
                            isThinkingMode: true,
                            analysisType: 'text_only',
                            analyzedFilesCount: 0,
                            processedFiles: []
                        };

                        const insertedChat = await createChatRecord(chatData);

                        await GetSearchRecords();
                        setResearchProgress({
                            phase: 'writing',
                            message: 'Generating final answer without web sources...'
                        });
                        await GenerateAIResp(formattedSearchResp, insertedChat.$id, true, finalPrompt, 'research', previousAiRespContext);
                        await clearFileContextAfterSuccess();
                        setUserInput('');
                        setPastedContents([]);
                        setSubmittedQuery(finalPrompt);
                        return;
                    }

                    const formattedSearchResp = researchResp.searchResult.map((item, index) => ({
                        title: item?.title || '',
                        description: item?.description || '',
                        name: item?.displayLink || '',
                        image: item?.thumbnail || '',
                        url: item?.url || '',
                        thumbnail: item?.thumbnail || '',
                        deepResearch: true,
                        summary: item?.summary || '',
                        keyPoints: item?.keyPoints || [],
                        contentExcerpt: item?.contentExcerpt || '',
                        metadata: item?.metadata || {},
                        qualityScore: item?.qualityScore ?? item?.metadata?.qualityScore,
                        qualityBand: item?.qualityBand ?? item?.metadata?.qualityBand,
                        sourceHost: item?.sourceHost ?? item?.metadata?.sourceHost,
                        researchInsights: index === 0 ? (researchResp?.metadata || null) : null
                    }));

                    // console.log('📋 Formatted research sources:', formattedSearchResp.length, 'items');

                    const chatData = {
                        libId: libId,
                        searchResult: formattedSearchResp,
                        userSearchInput: finalPrompt,
                        isThinkingMode: true,
                        analysisType: 'text_only',
                        analyzedFilesCount: 0,
                        processedFiles: []
                    };

                    // console.log('💾 Inserting research chat data...');

                    const insertedChat = await createChatRecord(chatData);

                    // console.log('✅ Research chat inserted:', insertedChat.$id);

                    await GetSearchRecords();

                    // Always start synthesis client-side with the real inserted chat id.
                    // This guarantees Inngest writes aiResp to the correct chat row.
                    setResearchProgress({
                        phase: 'writing',
                        message: 'Writing evidence-backed final response...'
                    });
                    await GenerateAIResp(formattedSearchResp, insertedChat.$id, false, finalPrompt, 'research', previousAiRespContext);

                    // Start polling for AI response updates (either server-started or client fallback)
                    // console.log('🔄 Starting polling for research results...');

                } else {
                    // SEARCH MODE: Standard quick search
                    // console.log('🔍 Starting SEARCH mode for:', searchInput);

                    let searchResp;
                    try {
                        const result = await axios.post('/api/deep-search', {
                            searchInput: finalPrompt,
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
                            userSearchInput: finalPrompt,
                            isThinkingMode: true,
                            analysisType: 'text_only',
                            analyzedFilesCount: 0,
                            processedFiles: []
                        };

                        const insertedChat = await createChatRecord(chatData);

                        await GetSearchRecords();
                        // Pass flag to GenerateAIResp to use direct model call
                        await GenerateAIResp(formattedSearchResp, insertedChat.$id, true, finalPrompt, 'search', previousAiRespContext);
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
                            userSearchInput: finalPrompt,
                            isThinkingMode: true,
                            analysisType: 'text_only',
                            analyzedFilesCount: 0,
                            processedFiles: []
                        };

                        const insertedChat = await createChatRecord(chatData);

                        await GetSearchRecords();
                        await GenerateAIResp(formattedSearchResp, insertedChat.$id, false, finalPrompt, 'search', previousAiRespContext);
                    }
                }
            }

            // Clear input after successful search and update submitted query
            setUserInput('');
            setPastedContents([]);
            setSubmittedQuery(finalPrompt);
            await clearFileContextAfterSuccess();

        } catch (error) {
            console.error('Error in GetSearchApiResult:', error);

            // More specific error handling
            let errorMessage = 'Search failed. Please try again.';
            // Research plan/limit handling
            if (error.response?.status === 403 && error.response?.data?.error === 'RESEARCH_LIMIT_REACHED') {
                errorMessage = error.response?.data?.message || 'Weekly Deep Research limit reached.';
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
            setResearchProgress(null);
        } finally {
            isSubmittingSearchRef.current = false;
        }
    }, [searchInputRecord, userInput, pastedContents, composePromptFromPastes, resolveFileContext, libId, searchType, currentUser?.email, createChatRecord, persistFileContext, GetSearchRecords, GenerateAIResp, startPollingForUpdates, normalizePrompt, refreshCachedChatResult, clearFileContextAfterSuccess]);

    // OPTIMIZATION: Input handler functions that depend on GetSearchApiResult
    const handleKeyDown = useCallback((e) => {
        // Open command palette when typing '/' at start
        try {
            const selectionStart = e.target?.selectionStart;
            if (e.key === '/' && selectionStart === 0) {
                e.preventDefault();
                setCommandInitialQuery('');
                setShowCommandPalette(true);
                return;
            }
        } catch (err) {
            // ignore
        }

        if (e.key === 'Enter' && e.shiftKey && (userInput?.trim() || pastedContents.length > 0) && !loadingSearch) {
            e.preventDefault();
            GetSearchApiResult();
        }
    }, [userInput, pastedContents, loadingSearch, GetSearchApiResult]);

    const handleSendClick = useCallback(() => {
        if ((userInput?.trim() || pastedContents.length > 0) && !loadingSearch) {
            GetSearchApiResult();
        }
    }, [userInput, pastedContents, loadingSearch, GetSearchApiResult]);

    // OPTIMIZATION: Essential UI handler functions for smooth performance
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    const requestMicPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // permission mili, stream band karo
            return true;
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                // User ne deny kiya ya already blocked hai
                const isAndroid = /Android/i.test(navigator.userAgent);
                const isIOS = /iPhone|iPad/i.test(navigator.userAgent);

                if (isAndroid) {
                    toast.error(
                        '🎤 Mic blocked! Chrome mein: Address bar ka 🔒 icon → Site Settings → Microphone → Allow',
                        { duration: 7000 }
                    );
                } else if (isIOS) {
                    toast.error(
                        '🎤 Mic blocked! iPhone Settings → Safari → Microphone → Allow',
                        { duration: 7000 }
                    );
                } else {
                    toast.error(
                        '🎤 Microphone blocked. Browser settings mein Allow karo aur reload karo.',
                        { duration: 5000 }
                    );
                }
                return false;
            }
            return false;
        }
    };

    const toggleSpeechRecognition = useCallback(async () => {

        if (isListeningRef.current) {
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            isListeningRef.current = false;
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice input is not supported. Use Chrome browser.');
            return;
        }

        const permitted = await requestMicPermission();
        if (!permitted) return;

        if (recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        recognition.continuous = isMobile ? false : true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += text;
                }
            }

            if (finalTranscript.trim()) {
                setUserInput(prev => {
                    const trimmed = (prev || '').trimEnd();
                    return trimmed ? trimmed + ' ' + finalTranscript : finalTranscript;
                });
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'aborted') return;

            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current = null;

            if (event.error === 'not-allowed') {
                toast.error('🎤 Microphone permission denied.');
            } else if (event.error === 'no-speech') {
                toast('Kuch suna nahi. Dobara try karo.', { icon: '🎙️' });
            } else if (event.error === 'network') {
                toast.error('Network error. Internet check karo.');
            } else {
                toast.error(`Voice error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            // 🔑 Mobile auto-restart
            if (isListeningRef.current && isMobile) {
                try {
                    recognition.start();
                    return;
                } catch (e) {
                    // restart failed, clean up below
                }
            }

            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current = null;
        };

        try {
            recognition.start();
        } catch (err) {
            if (err.name === 'InvalidStateError') {
                isListeningRef.current = true;
                setIsListening(true);
            } else {
                toast.error('Voice input start nahi hua.');
                isListeningRef.current = false;
                setIsListening(false);
                recognitionRef.current = null;
            }
        }

        // 🔑 FIX: isListening hata do dependency se — sirf ref use karo
    }, [setUserInput]);

    // OPTIMIZATION: Stable cleanup effect (only runs once)
    useEffect(() => {
        return () => {
            if (speechTimeoutRef.current) {
                clearInterval(speechTimeoutRef.current);
                speechTimeoutRef.current = null;
            }
            // Stop the natural speech engine session cleanly on unmount
            stopNaturalSpeech();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
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
            setSearchType(searchInputRecord?.type === 'research' ? 'research' : 'search');
            setSearchResult({
                ...searchInputRecord,
                Chats: (searchInputRecord?.Chats || []).map(normalizeChatDocument)
            });
            setRefreshTrigger(prev => prev + 1);
        }
    }, [searchInputRecord?.libId, normalizeChatDocument]); // OPTIMIZATION: Only depend on libId to prevent excessive updates

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
            setSearchType(searchInputRecord?.type === 'research' ? 'research' : 'search');
            setSearchResult({
                ...searchInputRecord,
                Chats: (searchInputRecord?.Chats || []).map(normalizeChatDocument)
            });
        }
    }, [searchInputRecord?.libId, normalizeChatDocument]); // OPTIMIZATION: Only depend on libId

    // Cleanup polling interval when component unmounts
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);



    // Helper to safely extract and clean text for text-to-speech and clipboard
    const cleanTextForSpeech = useCallback((rawInput) => {
        if (!rawInput) return '';

        let text = '';
        if (typeof rawInput === 'string') {
            text = rawInput;
        } else if (typeof rawInput === 'object') {
            text = rawInput.text || rawInput.content || rawInput.message || rawInput.aiResp || JSON.stringify(rawInput);
        } else {
            text = String(rawInput);
        }

        if (!text || !text.trim()) return '';

        // 1. Remove reasoning / thinking tags (<think>...</think> or unclosed <think>...)
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, ' ');
        text = text.replace(/<think>[\s\S]*$/gi, ' ');

        // 2. Remove tool call blocks and hidden annotations
        text = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, ' ');
        text = text.replace(/<!--[\s\S]*?-->/g, ' ');
        text = text.replace(/✅\s*\*?\*?[^\n]+?\*?\*?\s*—[^\n]*/g, ' ');

        // 3. Handle code blocks:
        // If the message has regular prose text outside code blocks, prefer the prose.
        // If the message is only/mostly code, keep the code content and just strip the ``` backticks.
        const proseOnly = text.replace(/```[\s\S]*?```/g, ' ').trim();
        if (proseOnly.length > 25) {
            text = proseOnly;
        } else {
            text = text.replace(/```[a-zA-Z0-9_-]*\n?/g, ' ').replace(/```/g, ' ');
        }

        // 4. Strip markdown formatting safely
        text = text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/_(.*?)_/g, '$1') // Underline / Italic
            .replace(/`([^`]+)`/g, '$1') // Inline code
            .replace(/\[(.*?)\]\([^)]*\)/g, '$1') // Markdown Links [text](url) -> text
            .replace(/#{1,6}\s+/g, '') // Headers
            .replace(/^\s*>\s+/gm, '') // Blockquotes
            .replace(/^\s*[-*+]\s+/gm, '') // List bullets
            .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
            .replace(/\|[^\n]+\|/g, ' ') // Table rows
            .replace(/---+/g, ' ') // Horizontal rules
            .replace(/<[^>]+>/g, ' ') // HTML tags
            .replace(/&[a-zA-Z0-9#]+;/g, ' ') // HTML entities
            .replace(/\s+/g, ' ') // Collapse whitespace/newlines
            .trim();

        // 5. Ultimate Fallback: if stripping made it empty, take the raw string and strip backticks
        if (!text && rawInput) {
            text = String(rawInput)
                .replace(/```[a-zA-Z0-9_-]*\n?/g, ' ')
                .replace(/```/g, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        return text;
    }, []);

    // OPTIMIZATION: Memoized copy functionality
    const handleCopyResult = useCallback(async (chatId, aiResponse) => {
        try {
            if (!aiResponse) {
                toast.error('No text available to copy');
                return;
            }

            const textToCopy = cleanTextForSpeech(aiResponse);

            if (!textToCopy) {
                toast.error('No text available to copy');
                return;
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
            toast.error('Copy failed. Please try again.');
        }
    }, [cleanTextForSpeech]);

    // Natural local TTS — sentence-chunked, voice-profile matched, zero API credits consumed.
    // Uses browser Web Speech API only. Respects user's saved assistant voice preference.
    const handleSpeakResult = useCallback((chatId, aiResponse) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            toast.error('Text-to-speech is not supported in this browser.');
            return;
        }

        // Toggle off: if same chat is currently speaking, stop it
        if (isReading && readingChatId === chatId) {
            stopNaturalSpeech();
            setIsReading(false);
            setReadingChatId(null);
            speechSynthesisRef.current = null;
            return;
        }

        if (!aiResponse) {
            toast.info('No text available to read.');
            return;
        }

        // Stop any prior speech from another chat
        stopNaturalSpeech();
        setIsReading(true);
        setReadingChatId(chatId);

        speakNaturalTextQueue(aiResponse, {
            voiceId: selectedVoiceId || 'voice-1',
            onStart: () => {
                setIsReading(true);
                setReadingChatId(chatId);
            },
            onEnd: () => {
                setIsReading(false);
                setReadingChatId(null);
                speechSynthesisRef.current = null;
            },
            onError: (errMsg) => {
                setIsReading(false);
                setReadingChatId(null);
                speechSynthesisRef.current = null;
                if (errMsg && !errMsg.includes('interrupted') && !errMsg.includes('canceled')) {
                    toast.error('Could not start speech playback.');
                }
            },
        });
    }, [isReading, readingChatId, selectedVoiceId]);


    // OPTIMIZATION: Memoized reaction functionality
    const handleReaction = useCallback(async (chatId, reactionType) => {
        try {
            const currentReaction = chatReactions[chatId] || {};
            let updateData = {};

            if (reactionType === 'like') {
                const nextLiked = !toBooleanValue(currentReaction.liked);
                updateData = {
                    liked: nextLiked ? 'true' : 'false',
                    disliked: 'false' // Remove dislike if liking
                };
            } else if (reactionType === 'dislike') {
                const nextDisliked = !toBooleanValue(currentReaction.disliked);
                updateData = {
                    disliked: nextDisliked ? 'true' : 'false',
                    liked: 'false' // Remove like if disliking
                };
            }

            // Update in database
            try {
                await axios.patch('/api/search/chats', { chatId, updateData });
            } catch (updateErr) {
                console.error('Error updating reaction:', updateErr);
                alert('Failed to update reaction. Please try again.');
                return;
            }

            // Update local state
            setChatReactions(prev => ({
                ...prev,
                [chatId]: {
                    ...currentReaction,
                    liked: toBooleanValue(updateData.liked),
                    disliked: toBooleanValue(updateData.disliked)
                }
            }));

        } catch (error) {
            console.error('Reaction error:', error);
            alert('Failed to process reaction. Please try again.');
        }
    }, [chatReactions, toBooleanValue]); // OPTIMIZATION: Proper dependencies

    const handleCopyPrompt = useCallback(async (chatId, promptText) => {
        try {
            const textToCopy = String(promptText || '').trim();
            if (!textToCopy) return;

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCopiedPromptId(chatId);
            setTimeout(() => setCopiedPromptId(null), 1600);
            setActivePromptActionsId(null);
        } catch (copyError) {
            console.error('Failed to copy prompt:', copyError);
        }
    }, []);

    const handlePromptTouchStart = useCallback((chatId) => {
        if (!isTouchDevice) return;

        if (promptPressTimerRef.current) {
            clearTimeout(promptPressTimerRef.current);
        }

        promptPressTimerRef.current = setTimeout(() => {
            setActivePromptActionsId(chatId);
        }, 420);
    }, [isTouchDevice]);

    const handlePromptTouchEnd = useCallback(() => {
        if (promptPressTimerRef.current) {
            clearTimeout(promptPressTimerRef.current);
            promptPressTimerRef.current = null;
        }
    }, []);

    // Memoize rendered chats to avoid remounting icons while typing
    const renderedChats = useMemo(() => {
        return (searchResult?.Chats || []).map((chat, index) => {
            const totalChats = searchResult?.Chats?.length || 0;
            const isLatestMessage = index === totalChats - 1;
            // Keep loading visible until Canva writes the final renderable payload.
            const isAnswerPending = !chat?.aiResp || hasPendingCanvaDesign(chat.aiResp);
            // Loading should only show for the latest message AND only if we're actively searching
            const isLoadingAnswer = isAnswerPending && isLatestMessage && loadingSearch;

            const promptText = chat?.userSearchInput || searchInputRecord?.searchInput || '';
            const { question, pastes } = parsePromptParts(promptText);
            const displayQuestion = question?.trim() || (pastes.length > 0 ? 'Pasted context' : '');
            const showDivider = displayQuestion && pastes.length > 0;
            const showSources = hasSourceResults(chat);
            const showImages = hasImageResults(chat);
            const showVideos = hasVideoResults(chat);

            const chatIntent = extractUserIntent(promptText);
            const isDocumentArtifact = Boolean(
                chat?.artifact ||
                chat?.artifactType ||
                isDocumentArtifactRequest(promptText, chatIntent)
            );
            const resolvedArtifactType = chat?.artifactType || chatIntent?.artifactType || (
                /\b(excel|spreadsheet|xlsx)\b/i.test(promptText) ? 'excel' :
                /\b(powerpoint|presentation|ppt|slides)\b/i.test(promptText) ? 'powerpoint' :
                /\b(word|docx?)\b/i.test(promptText) ? 'word' : 'pdf'
            );

            return (
                <div
                    key={`chat-${chat.id}-${chat.aiResp ? 'answered' : 'pending'}`}
                    id={`msg-${chat.id}`}
                    data-message-id={chat.id}
                    data-message-title={displayQuestion || `Message ${index + 1}`}
                    className="min-w-0 w-full"
                >
                    {/* space-y here is the gap *within* a turn; the list wrapping
                        renderedChats uses a larger one, so a prompt reads as
                        belonging to the answer below it rather than floating
                        between two of them. */}
                    <div className="mx-auto w-full max-w-3xl space-y-3 sm:space-y-5">
                        <div className="flex justify-end">
                            <div
                                className="group w-full max-w-full sm:max-w-[85%]"
                                onTouchStart={() => handlePromptTouchStart(chat.id)}
                                onTouchEnd={handlePromptTouchEnd}
                                onTouchCancel={handlePromptTouchEnd}
                                onTouchMove={handlePromptTouchEnd}
                            >
                                {/* The one bubble in the conversation. The answer
                                    below is deliberately unbubbled — that contrast
                                    is what marks who is speaking, so the border and
                                    drop shadow are not needed on top of it. */}
                                <div className="rounded-2xl bg-inset px-3 py-2.5 shadow-hairline sm:px-4">
                                {displayQuestion && (
                                    <p className="text-base leading-[1.6] text-ink whitespace-pre-wrap wrap-break-word">
                                        {displayQuestion}
                                    </p>
                                )}
                                {pastes.length > 0 && (
                                    <div className={`${showDivider ? 'mt-3 border-t border-line pt-3' : 'mt-2'}`}>
                                        <PastedContentPreview
                                            contents={pastes}
                                            onRemove={null}
                                            readOnly={true}
                                            variant="inline"
                                        />
                                    </div>
                                )}
                                </div>
                                <div
                                    className={`mt-1 h-7 flex justify-end transition-opacity duration-150 ${isTouchDevice
                                        ? (activePromptActionsId === chat.id ? 'opacity-100' : 'opacity-0 pointer-events-none')
                                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                                        }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleCopyPrompt(chat.id, promptText)}
                                        className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-control px-2 text-[0.75rem] font-medium ${QUIET_BUTTON}`}
                                        aria-label="Copy user prompt"
                                        title="Copy prompt"
                                    >
                                        {copiedPromptId === chat.id
                                            ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                                            : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                                        <span>{copiedPromptId === chat.id ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start">
                            {/* Full width, flush left, no bubble — the answer's own
                                MEASURE cap governs the prose column, which lets its
                                tables and code blocks use the whole 48rem instead of
                                being squeezed into 85% of it. */}
                            <div className="w-full min-w-0">
                                <div className="min-w-0 w-full overflow-hidden">
                                    {/* Task Graph Visualizer */}
                                    {(() => {
                                        if (!chat.userSearchInput) return null;
                                        const intent = extractUserIntent(chat.userSearchInput);
                                        const graphEngine = new CrossAppContextGraph('user', connectedApps);
                                        const taskGraph = graphEngine.buildTaskGraph(intent);
                                        return taskGraph.strategy === 'multi_app_graph' ? (
                                            <TaskGraphVisualizer taskGraph={taskGraph} />
                                        ) : null;
                                    })()}
                                    {/* Tool Call Indicators */}
                                    {chat.toolCalls?.map((toolCall, idx) => (
                                        <ToolCallIndicator
                                            key={`tool-${chat.id}-${idx}`}
                                            status={toolCall.status}
                                            appName={toolCall.appName}
                                            appIcon={toolCall.appIcon}
                                            toolName={toolCall.toolName}
                                            toolId={toolCall.toolId}
                                            actionSummary={toolCall.actionSummary}
                                            result={toolCall.result}
                                            parameters={toolCall.parameters}
                                            driveFiles={toolCall.driveFiles}
                                            error={toolCall.error}
                                            onConfirm={toolCall.onConfirm}
                                            onCancel={toolCall.onCancel}
                                            onRetry={toolCall.onRetry}
                                        />
                                    ))}
                                    {/* Thinking / Progress Stream (Channel A) - Only show while generating */}
                                    {isDocumentArtifact && isLoadingAnswer && (
                                        <ThinkingProgressWidget
                                            progressEvents={buildProgressSequence(chat.id, resolvedArtifactType)}
                                            isComplete={!isLoadingAnswer && !!chat.aiResp}
                                        />
                                    )}
                                    <MemoizedAnswerDisplay
                                        key={`answer-${chat.id}-${refreshTrigger}`}
                                        searchResult={chat.toolCalls?.length ? { ...chat, aiResp: stripToolResultsFromResponse(chat.aiResp) } : chat}
                                        isLatestMessage={isLatestMessage}
                                        isLoadingAnswer={isLoadingAnswer}
                                        researchProgress={isLatestMessage ? researchProgress : null}
                                        selectedAppId={isLatestMessage ? (chat.selectedAppId || selectedConnectedApp?.appId || searchParams.get('appId')) : null}
                                        isThinkingMode={chat?.isThinkingMode === true}
                                    />
                                    {/* Standalone Artifact Card (Channel C) */}
                                    {isDocumentArtifact && chat.aiResp && !isLoadingAnswer && (
                                        <ArtifactCard
                                            artifact={{
                                                type: resolvedArtifactType,
                                                title: displayQuestion || 'Generated Document',
                                                pageCount: 5,
                                                slideCount: 5,
                                                validation: { isValid: true, qualityScore: 100 },
                                                usage: { totalCredits: 3 },
                                            }}
                                            fullContent={chat.aiResp}
                                        />
                                    )}
                                    {!isDocumentArtifact && isLatestMessage && !isLoadingAnswer && chat.aiResp && (
                                        (() => {
                                            const intent = extractUserIntent(chat.userSearchInput || '');
                                            const nextStep = predictNextStep(intent, { responseText: chat.aiResp });
                                            return nextStep.hasNextStep ? (
                                                <ProactiveNextStepBar
                                                    suggestion={nextStep.suggestion}
                                                    actionPrompt={nextStep.actionPrompt}
                                                    onAccept={(prompt) => {
                                                        setUserInput(prompt);
                                                    }}
                                                />
                                            ) : null;
                                        })()
                                    )}
                                </div>

                                {(showSources || showImages || showVideos) && (
                                    <div className="mt-6 space-y-5">
                                        {showSources && (
                                            <div className="space-y-2.5">
                                                <SectionHeader icon={LucideList} title="Sources" />
                                                <MemoizedSourceList searchResult={chat} variant="embedded" />
                                            </div>
                                        )}
                                        {showImages && (
                                            <div className="space-y-2.5">
                                                <SectionHeader icon={LucideImage} title="Images" />
                                                <MemoizedImageList searchResult={chat} variant="embedded" />
                                            </div>
                                        )}
                                        {showVideos && (
                                            <div className="space-y-2.5">
                                                <SectionHeader icon={LucideVideo} title="Videos" />
                                                <MemoizedVideoList searchResult={chat} variant="embedded" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action bar */}
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyResult(chat.id, chat.aiResp)}
                                            disabled={!chat.aiResp}
                                            aria-label="Copy answer"
                                            title={copiedText === chat.id ? 'Copied' : 'Copy'}
                                            className={`${ICON_BUTTON} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${copiedText === chat.id ? 'bg-hover-2 text-emerald-500' : ''}`}
                                        >
                                            {copiedText === chat.id ? (
                                                <Check className="h-4 w-4" aria-hidden="true" />
                                            ) : (
                                                <Copy className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSpeakResult(chat.id, chat.aiResp)}
                                            disabled={!chat.aiResp}
                                            aria-pressed={isReading && readingChatId === chat.id}
                                            aria-label={isReading && readingChatId === chat.id ? 'Stop reading' : 'Read answer aloud'}
                                            title={isReading && readingChatId === chat.id ? 'Stop' : 'Read aloud'}
                                            className={`${ICON_BUTTON} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${isReading && readingChatId === chat.id ? 'bg-hover-2 text-ink' : ''}`}
                                        >
                                            {isReading && readingChatId === chat.id ? (
                                                <VolumeX className="h-4 w-4" aria-hidden="true" />
                                            ) : (
                                                <Volume2 className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleReaction(chat.id, 'like')}
                                            aria-pressed={!!chatReactions[chat.id]?.liked}
                                            aria-label="Like answer"
                                            title="Like"
                                            className={`${ICON_BUTTON} cursor-pointer ${chatReactions[chat.id]?.liked ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-500' : ''}`}
                                        >
                                            <ThumbsUp className={`h-4 w-4 ${chatReactions[chat.id]?.liked ? 'fill-current' : ''}`} aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleReaction(chat.id, 'dislike')}
                                            aria-pressed={!!chatReactions[chat.id]?.disliked}
                                            aria-label="Dislike answer"
                                            title="Dislike"
                                            className={`${ICON_BUTTON} cursor-pointer ${chatReactions[chat.id]?.disliked ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 hover:text-rose-500' : ''}`}
                                        >
                                            <ThumbsDown className={`h-4 w-4 ${chatReactions[chat.id]?.disliked ? 'fill-current' : ''}`} aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    }, [searchResult, loadingSearch, refreshTrigger, copiedText, copiedPromptId, isReading, readingChatId, chatReactions, activePromptActionsId, isTouchDevice, handleCopyResult, handleSpeakResult, handleReaction, handleCopyPrompt, handlePromptTouchStart, handlePromptTouchEnd, parsePromptParts, hasSourceResults, hasImageResults, hasVideoResults, stripToolResultsFromResponse, connectedApps]);




    // ── Global Drag & Drop Handlers ──
    const handleWindowDragEnter = useCallback((e) => {
        e.preventDefault()
        dragCounterRef.current += 1

        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
            const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file')
            if (hasFiles) {
                setIsDraggingOver(true)
                setDragAccepting(true) // assume true for docs till dropped
            }
        }
    }, [])

    const handleWindowDragLeave = useCallback((e) => {
        e.preventDefault()
        dragCounterRef.current -= 1
        if (dragCounterRef.current === 0) {
            setIsDraggingOver(false)
        }
    }, [])

    const handleWindowDragOver = useCallback((e) => {
        e.preventDefault() // Required to allow drop
    }, [])

    const handleWindowDrop = useCallback((e) => {
        e.preventDefault()
        dragCounterRef.current = 0
        setIsDraggingOver(false)

        // Open the corresponding upload section (let react-dropzone handle the actual file drop)
        if (e.dataTransfer?.files?.length > 0) {
            setShowFileUpload(true)
        }
    }, [])

    // Attach/detach window listeners
    useEffect(() => {
        window.addEventListener('dragenter', handleWindowDragEnter)
        window.addEventListener('dragleave', handleWindowDragLeave)
        window.addEventListener('dragover', handleWindowDragOver)
        window.addEventListener('drop', handleWindowDrop)
        return () => {
            window.removeEventListener('dragenter', handleWindowDragEnter)
            window.removeEventListener('dragleave', handleWindowDragLeave)
            window.removeEventListener('dragover', handleWindowDragOver)
            window.removeEventListener('drop', handleWindowDrop)
        }
    }, [handleWindowDragEnter, handleWindowDragLeave, handleWindowDragOver, handleWindowDrop])

    /* ── Composer disclosure ──────────────────────────────────────────────────
       Collapsed the composer is one row: prompt · + · send. Expanded it also
       shows the mode badges and the secondary toolbar row.

       Expansion is *forced*, never merely preferred, whenever collapsing would
       hide something live — focus, content, an upload, an in-flight request, an
       active mode, the mic, a drag, or any open menu. Collapse therefore only
       needs to handle the genuinely idle case. */
    const composerHasContent = Boolean(
        userInput?.trim() || pastedContents.length > 0 || uploadedFiles.length > 0
    )

    const composerExpanded =
        composerFocused
        || openMenuCount > 0
        || showPlusMenu
        || showCommandPalette
        || isListening
        || isDragActive
        || loadingSearch
        || composerHasContent
        || Object.keys(uploadProgress).length > 0
        || searchType === 'research'
        || Boolean(selectedConnectedApp)

    /* Mirrors the handleSendClick guard exactly. The button used to also enable on
       `uploadedFiles.length > 0`, which the handler ignores, so a composer holding
       only an attachment showed a live primary CTA that did nothing on click. */
    const canSend = Boolean(userInput?.trim() || pastedContents.length > 0) && !loadingSearch

    const researchLocked = !researchUsage.canResearch || researchUsage.remaining === 0

    /* One counter for every portalled menu in the composer, so opening one cannot
       be mistaken for focus leaving the card. */
    const trackMenu = (open) => setOpenMenuCount(count => Math.max(0, count + (open ? 1 : -1)))

    return (
        <>
            <DragDropOverlay
                isVisible={isDraggingOver}
                isDragAccept={dragAccepting}
                isDragReject={!dragAccepting}
                isImageMode={false} // DisplayResult mainly handles Docs, PDFs, code
            />
            <div ref={scrollContainerRef} className='chat-font-content w-full max-h-screen overflow-y-auto relative bg-background'>
                {/* Floating vertical dashes minimap/outline */}
                <MessageScroller 
                    className="pointer-events-auto"
                    currentAnchorId={currentAnchorId}
                    visibleMessageIds={visibleMessageIds}
                    scrollToAnchor={scrollToAnchor}
                    messages={(searchResult?.Chats || []).map((chat, index) => {
                        const promptText = chat?.userSearchInput || '';
                        const { question, pastes } = parsePromptParts(promptText);
                        const displayQuestion = question?.trim() || (pastes.length > 0 ? 'Pasted context' : `Message ${index + 1}`);
                        return { id: chat.id, displayQuestion };
                    })}
                />

                {/* Bottom padding clears the composer plus its scrim. Was `pb-40
                    md:pb-48`, which left ~90px of visible dead space under the last
                    message while the composer was collapsed. */}
                <div className='p-2 md:p-7 pb-36 md:pb-44 min-w-0'>

                    <div className="space-y-4 sm:space-y-10">
                        {renderedChats}
                    </div>

                    {/* ── Composer ──
                        The card is positioned by this wrapper rather than by classes
                        on the card itself. That is not a preference — it is the bug
                        that broke this composer: `COMPOSER_CARD` opens with `relative`
                        (the plus-menu's absolute panel needs a containing block), and
                        Tailwind emits `.relative` *after* `.fixed` in the stylesheet.
                        Same specificity, later rule wins, so appending `fixed` at the
                        call site silently lost and the composer rendered inline in the
                        scroll flow — landing on top of the last answer's action row,
                        pushed off-centre by `left: calc(50% + …)`. A wrapper keeps the
                        two `position` values on two different elements.

                        `data-composer` is what the reduced-motion block in
                        app/globals.css keys off; Tailwind arbitrary values are not
                        stable CSS selectors, so the morph needs a real hook. */}
                    <div
                        className="fixed bottom-3 z-40 -translate-x-1/2 md:bottom-5"
                        style={{ left: inputCenterLeft, width: inputShellWidth, maxWidth: '48rem' }}
                    >
                        {/* Floating Scroll to Bottom Button. Positioned relative to the
                            composer wrapper so it stays anchored cleanly above the card
                            without drifting or overlapping when the card expands. */}
                        {showScrollToBottom && (
                            <div className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
                                <Button
                                    onClick={scrollToBottom}
                                    size="icon"
                                    className="pointer-events-auto h-9 w-9 cursor-pointer rounded-full border border-border/80 bg-background/95 dark:bg-card/95 backdrop-blur-md shadow-md hover:shadow-lg transition-all duration-200 hover:bg-muted dark:hover:bg-accent hover:scale-105 active:scale-95 flex items-center justify-center"
                                    variant="outline"
                                    title="Scroll to bottom"
                                    aria-label="Scroll to latest message"
                                >
                                    <ArrowDown className="h-4 w-4 text-foreground/80" aria-hidden="true" />
                                </Button>
                            </div>
                        )}

                        {/* Scrim. The card is opaque, but the 16px side margins and the
                            strip below it are not, so answer text used to scroll visibly
                            past the rounded corners. Fades out ~28px above the card, the
                            same treatment Claude and ChatGPT use to seat a floating
                            composer over scrolling content. */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-x-4 -top-7 -bottom-3 bg-linear-to-t from-background via-background to-transparent md:-bottom-5"
                        />

                        <div
                            {...getRootProps()}
                            data-composer
                            onFocusCapture={() => setComposerFocused(true)}
                            onBlurCapture={(e) => {
                                /* Tabbing from the prompt into the toolbar must not slam
                                   the card shut — that is still focus inside the card. */
                                if (e.currentTarget.contains(e.relatedTarget)) return
                                setComposerFocused(false)
                            }}
                            className={COMPOSER_CARD({ dragActive: isDragActive, fixed: true })}
                        >
                            <input {...getInputProps()} />

                            {/* ── Mode badges ──
                                Pinned above the prompt row, so an active mode is still
                                named while the secondary row is collapsed. Every mode
                                shown here also forces the card open, which is why this
                                row never has to animate.

                                Geometry matches the home composer exactly — same badge
                                constants, same `text-xs font-medium`, same 20px dismiss
                                control. 20px passes WCAG 2.2 target size through the
                                spacing exception (nearest other target is ≥8px away) and
                                each mode has a second, larger off-switch in the toolbar. */}
                            {(searchType === 'research' || selectedConnectedApp || (loadingSearch && researchProgress?.message)) && (
                                <div className="flex flex-wrap items-center gap-2 px-5 pt-3.5 pb-0.5">
                                    {/* Connected App badge */}
                                    {selectedConnectedApp && (
                                        <div className={`${CONNECTED_BADGE} text-xs font-medium`}>
                                            {selectedConnectedApp.appIcon && (
                                                <img src={selectedConnectedApp.appIcon} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" />
                                            )}
                                            {selectedConnectedApp.appName}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedConnectedApp(null)}
                                                aria-label={`Disconnect ${selectedConnectedApp.appName}`}
                                                className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-emerald-500/20 ${FOCUS_RING}`}
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Research badge — the shared RESEARCH_BADGE, so the
                                        composer, the plus-menu tile and the answer header
                                        are visibly the same feature. */}
                                    {searchType === 'research' && (
                                        <div className={`${RESEARCH_BADGE} text-xs font-medium`}>
                                            <Atom className="h-3.5 w-3.5" aria-hidden="true" />
                                            Deep Research
                                            <button
                                                type="button"
                                                onClick={() => handleSearchTypeChange('search')}
                                                aria-label="Turn off Deep Research"
                                                className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-blue-500/20 ${FOCUS_RING}`}
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}

                                    {loadingSearch && researchProgress?.message && (
                                        <div className={`${PROGRESS_BADGE} text-xs font-medium`} role="status" aria-live="polite">
                                            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden="true" />
                                            {researchProgress.message}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Attachment tray ──
                                `role="list"` because AttachmentGroup is a plain flex div;
                                without it a screen reader announces four unrelated groups
                                instead of a list of four attachments. The staggered
                                entrance is 35ms apart, which reads as one group arriving. */}
                            {(uploadedFiles.length > 0 || Object.keys(uploadProgress).length > 0) && (
                                <div className="px-5 pt-3.5 pb-0.5">
                                    <AttachmentGroup role="list" aria-label="Attachments">
                                        {uploadedFiles.map((fileItem, index) => (
                                            <Attachment
                                                key={fileItem.id}
                                                state="done"
                                                role="listitem"
                                                className={TRAY_ITEM}
                                                style={TRAY_ITEM_STYLE(index)}
                                            >
                                                <AttachmentMedia variant={fileItem.file.type.startsWith('image/') ? 'image' : 'file'} />
                                                <AttachmentContent>
                                                    <AttachmentTitle title={fileItem.file.name}>{fileItem.file.name}</AttachmentTitle>
                                                    <AttachmentDescription>{(fileItem.file.size / 1024 / 1024).toFixed(1)}MB</AttachmentDescription>
                                                </AttachmentContent>
                                                <AttachmentActions>
                                                    <AttachmentRemove
                                                        label={fileItem.file.name}
                                                        onClick={(e) => { e.stopPropagation(); removeFile(fileItem.id); }}
                                                    />
                                                </AttachmentActions>
                                            </Attachment>
                                        ))}
                                        {/* `uploadProgress` keeps a finished entry for 2s after the
                                            file lands in `uploadedFiles` (the cleanup is on a
                                            setTimeout), so rendering the map raw shows the same file
                                            twice — once done, once as "Uploading… 100%". Filtering on
                                            the id fixes it in the view rather than racing the timer. */}
                                        {Object.entries(uploadProgress)
                                            .filter(([fileId]) => !uploadedFiles.some(f => f.id === fileId))
                                            .map(([fileId, progress], index) => (
                                            <Attachment
                                                key={`upload-${fileId}`}
                                                state="uploading"
                                                role="listitem"
                                                className={TRAY_ITEM}
                                                style={TRAY_ITEM_STYLE(uploadedFiles.length + index)}
                                            >
                                                <AttachmentMedia variant="file" />
                                                <AttachmentContent>
                                                    <AttachmentTitle>Uploading…</AttachmentTitle>
                                                    <AttachmentProgress
                                                        value={progress}
                                                        label="Upload progress"
                                                        className="mt-1"
                                                    />
                                                </AttachmentContent>
                                            </Attachment>
                                        ))}
                                    </AttachmentGroup>
                                </div>
                            )}

                            {pastedContents.length > 0 && (
                                <PastedContentPreview
                                    contents={pastedContents}
                                    onRemove={(index) => setPastedContents(prev => prev.filter((_, i) => i !== index))}
                                />
                            )}

                            {/* ── Textarea ──
                                Full-width above the toolbar so the prompt text gets all
                                available horizontal space. The home composer uses the same
                                split; fixing this to match resolves the broken layout in
                                the screenshot where + and send were floating beside a
                                cramped one-liner textarea. */}
                            <div className="min-w-0">
                                <OptimizedTextarea
                                    value={userInput}
                                    onChange={handleUserInputChange}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={pastedContents.length > 0 ? 'Add a message...' : (searchType === 'research' ? 'What do you want to research deeply?' : 'Ask anything...')}
                                    disabled={loadingSearch}
                                    textareaRef={textareaRef}
                                />
                            </div>

                            {/* ── Bottom toolbar — single unified row matching ChatBoxAiInput.jsx ──
                                Left: [+ menu] [Model] [|] [Mic]
                                Right: [↑ send]
                                Everything in one row, always visible. */}
                            <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                                <div className="flex min-w-0 items-center gap-0.5">
                                    {/* Plus menu (shadcn DropdownMenu with Attach, Deep Research, Builder & App Connections) */}
                                    <ComposerPlusMenu
                                        onAttachFiles={handleFileUploadToggle}
                                        searchType={searchType}
                                        onSearchTypeChange={handleSearchTypeChange}
                                        researchLocked={researchLocked || !researchUsage?.canResearch || researchUsage?.remaining <= 0}
                                        researchUsage={researchUsage}
                                        onShowResearchLimitModal={() => setShowResearchLimitModal(true)}
                                        uploadedFilesCount={uploadedFiles.length > 0 ? uploadedFiles.length : (hasConversationFiles() ? getConversationFiles().length : 0)}
                                        selectedApp={selectedConnectedApp}
                                        onSelectApp={setSelectedConnectedApp}
                                        onOpenChange={trackMenu}
                                    />

                                    {/* AI Model Selector */}
                                    <DropdownMenu onOpenChange={trackMenu}>
                                        <DropdownMenuTrigger
                                            aria-label={`AI model: ${selectedModel?.name || 'Auto'}. Change model`}
                                            className={`group ${TOOLBAR_PILL} border-0 bg-transparent`}
                                        >
                                            {!selectedModel || selectedModel?.name?.toLowerCase() === 'auto' ? (
                                                <Cpu className="h-4 w-4" />
                                            ) : (
                                                getModelLogo(selectedModel.name, true)
                                            )}
                                            <span className="hidden sm:inline max-w-25 truncate">{selectedModel?.name || 'Auto'}</span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            sideOffset={8}
                                            className="w-[280px] rounded-2xl border border-border/60 bg-popover p-1.5 shadow-2xl"
                                        >
                                            <div className="flex max-h-[340px] flex-col gap-0.5 overflow-y-auto p-1 scrollbar-hide">
                                                {(searchType === 'research' ? DEEP_RESEARCH_MODELS : AIModelsOption).map((model, index) => {
                                                    const effectivePlan = planName || (isPro ? 'pro' : 'free');
                                                    const isAccessible = canAccessModel(model, effectivePlan, paidCredits);
                                                    const isSelected = selectedModel?.id === model.id;

                                                    return (
                                                        <DropdownMenuItem
                                                            key={index}
                                                            aria-label={`${model.name}${model.isPro ? ', Pro model' : ''}${!isAccessible ? ', locked' : ''}`}
                                                            className={`flex items-center justify-between rounded-[10px] px-2.5 py-2 cursor-pointer transition-all duration-200 outline-none select-none
                                                            ${!isAccessible ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                                            ${isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'hover:bg-muted focus:bg-muted dark:hover:bg-muted/50 dark:focus:bg-muted/50'}`}
                                                            onClick={() => isAccessible && updateSelectedModel(model.id)}
                                                            disabled={!isAccessible}
                                                        >
                                                            <div className='flex items-center gap-3 min-w-0'>
                                                                {getModelLogo(model.name)}
                                                                <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                                    {model.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5 shrink-0">
                                                                {!isAccessible ? (
                                                                    <Lock className="w-3.5 h-3.5 text-muted-foreground" fill="currentColor" />
                                                                ) : model.isPro ? (
                                                                    <Zap className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                                                                ) : (
                                                                    <Zap className="w-3.5 h-3.5 text-muted-foreground" fill="currentColor" />
                                                                )}
                                                                {isSelected && (
                                                                    <Check className="w-4 h-4 text-primary" strokeWidth={3} />
                                                                )}
                                                            </div>
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div className={TOOLBAR_DIVIDER} />

                                    {/* Microphone */}
                                    <button
                                        type="button"
                                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                        aria-pressed={isListening}
                                        className={isListening ? TOOLBAR_RECORDING : TOOLBAR_BUTTON}
                                        onClick={toggleSpeechRecognition}
                                        title={isListening ? 'Stop listening' : 'Start voice input'}
                                    >
                                        {isListening
                                            ? <MicOff className="h-4 w-4" aria-hidden="true" />
                                            : <Mic className="h-4 w-4" aria-hidden="true" />
                                        }
                                    </button>
                                </div>

                                {/* Send */}
                                <button
                                    type="button"
                                    onClick={handleSendClick}
                                    disabled={!canSend}
                                    className={SEND_BUTTON(canSend)}
                                    aria-label={loadingSearch ? 'Sending…' : 'Send message'}
                                    title="Send (Shift + Enter)"
                                >
                                    {loadingSearch ? (
                                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                                    ) : (
                                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>

                            {/* The palette portals to document.body; this wrapper only keeps it
                                out of the prompt row's flex layout. */}
                            <div>
                                <CommandPalette
                                    visible={showCommandPalette}
                                    initialQuery={commandInitialQuery}
                                    anchorRef={textareaRef}
                                    onClose={() => setShowCommandPalette(false)}
                                    onSelect={async (cmd) => {
                                        setShowCommandPalette(false);
                                        try {
                                            if (cmd.clientOnly) {
                                                if (cmd.id === 'clear') {
                                                    setUserInput('');
                                                    setPastedContents([]);
                                                    setUploadedFiles([]);
                                                    toast.info('Cleared input and context');
                                                    return;
                                                }
                                                if (cmd.id === 'help') {
                                                    toast.info('Commands: /help /clear /copy /model /compact /export');
                                                    return;
                                                }
                                                if (cmd.id === 'copy') {
                                                    const combined = composePromptFromPastes(userInput, pastedContents);
                                                    try {
                                                        await navigator.clipboard.writeText(combined || '');
                                                        toast.success('Copied to clipboard');
                                                    } catch (err) {
                                                        console.error('copy failed', err);
                                                        toast.error('Copy failed');
                                                    }
                                                    return;
                                                }
                                                if (cmd.id === 'model') {
                                                    const currentIndex = AIModelsOption.findIndex(m => m.id === selectedModel?.id);
                                                    const next = AIModelsOption[(currentIndex + 1) % AIModelsOption.length];
                                                    if (next) updateSelectedModel(next);
                                                    toast.info(`Switched model to ${next?.name || next?.id}`);
                                                    return;
                                                }
                                            }

                                            // Server-backed commands
                                            const resp = await axios.post('/api/commands', { commandId: cmd.id, args: { text: composePromptFromPastes(userInput, pastedContents) } });
                                            if (resp?.data) {
                                                if (cmd.id === 'compact' && resp.data.result) {
                                                    // Replace pasted contents or input with compacted result
                                                    if (pastedContents.length > 0) {
                                                        setPastedContents([resp.data.result]);
                                                        toast.success('Context compacted');
                                                    } else {
                                                        setUserInput(resp.data.result);
                                                        toast.success('Input compacted');
                                                    }
                                                    return;
                                                }
                                                if (cmd.id === 'export' && resp.data.export) {
                                                    try {
                                                        const json = JSON.stringify(resp.data.export, null, 2);
                                                        await navigator.clipboard.writeText(json);
                                                        toast.success('Export copied to clipboard');
                                                    } catch (err) {
                                                        console.error('export copy failed', err);
                                                        toast.info('Export ready');
                                                    }
                                                    return;
                                                }
                                            }
                                            toast.success('Command executed');
                                        } catch (err) {
                                            console.error('command exec error', err);
                                            toast.error('Command execution failed');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>


                </div>
            </div>
            <DeepResearchLimitModal
                isOpen={showResearchLimitModal}
                onClose={() => setShowResearchLimitModal(false)}
                plan={researchUsage.plan}
                weeklyLimit={researchUsage.weeklyLimit}
                weeklyCount={researchUsage.weeklyCount}
                remaining={researchUsage.remaining}
            />
        </>
    )
}

function DisplayResult(props) {
    return (
        <DisplayResultContent {...props} />
    );
}

export default DisplayResult;
