'use client'

import Image from 'next/image'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/lib/alert'
import { ArrowUp, AudioLines, Code2, Cpu, ImagePlus, Mic, MicOff, Paperclip, Plus, X, Crown, Atom, MessageCircleDashed, Search, Bot, Zap, Lock, Check, AlertCircle, Sparkles } from '@/components/ui/animated-icon'
import { Progress } from '@/components/ui/progress'
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
} from '@/components/ui/attachment'
import {
    COMPOSER_CARD,
    COMPOSER_TEXTAREA,
    FOCUS_RING,
    TOOLBAR_BUTTON,
    TOOLBAR_PILL,
    TOOLBAR_TOGGLE,
    TOOLBAR_RECORDING,
    TOOLBAR_DIVIDER,
    SEND_BUTTON,
    MENU_PANEL,
    MENU_TILE,
    MENU_TILE_ICON,
    MENU_TILE_TITLE,
    MENU_TILE_SUB,
    MENU_TILE_COUNT,
    RESEARCH_BADGE,
    CONNECTED_BADGE,
    NEUTRAL_BADGE,
    LOCKED_BADGE,
    TRAY_ITEM,
    TRAY_ITEM_STYLE,
} from '@/components/surface'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIModelsOption, DEEP_RESEARCH_MODELS, canAccessModel } from '@/services/Shared'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import DeepResearchLimitModal from './DeepResearchLimitModal'

import { requiresDeepReasoning } from '@/lib/reasoning-utils';
import { useTheme } from '@/contexts/ThemeContext'
import { useModel } from '@/contexts/ModelContext'
import { useUserPlan } from '@/hooks/useUserPlan'
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation'
import {
    IMAGE_MODELS,
    DEFAULT_MODEL_ID,
    getModelById,
    getDefaultModelForProvider,
    getProviderIdByModelId,
    getDefaultImageToImageModelForProvider,
} from '@/lib/hf-image-config'
import PastedContentPreview, { PASTE_LINE_THRESHOLD } from './PastedContentPreview';
import DragDropOverlay from '@/components/DragDropOverlay';
import ComposerPlusMenu from './ComposerPlusMenu';

const DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('cloudflare')?.id || DEFAULT_MODEL_ID;

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
                <div className="flex items-center justify-center w-[22px] h-[22px] rounded-md bg-white border border-gray-200/60 dark:border-white/10 dark:bg-white/90 p-[2px] shrink-0 overflow-hidden shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                    <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
                </div>
            );
        }
        return <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />;
    }

    if (src) {
        return (
            <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white border border-gray-200/60 dark:border-white/10 dark:bg-white/90 p-0.5 shrink-0 overflow-hidden shadow-sm">
                <img src={`/model icon/${src}`} alt={name} className="w-full h-full object-contain" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 text-gray-500 shadow-sm">
            <Icon className="w-4 h-4" />
        </div>
    );
};

function ChatBoxAiInput() {

    const [userSearchInput, setUserSearchInput] = useState();
    const [searchType, setSearchType] = useState("search");
    const [loading, setLoading] = useState(false);
    const [showResearchLimitModal, setShowResearchLimitModal] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const recognitionRef = useRef(null);
    const isListeningRef = useRef(false);

    // Pasted content state (array — supports multiple pastes)
    const [pastedContents, setPastedContents] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [fileUploadError, setFileUploadError] = useState('');
    const [showFileUpload, setShowFileUpload] = useState(false);

    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const plusMenuRef = useRef(null);

    // Image Generation States
    const [isImageGenMode, setIsImageGenMode] = useState(false);
    const [selectedRatio, setSelectedRatio] = useState("1:1");
    const [imageGenModel, setImageGenModel] = useState(DEFAULT_IMAGE_MODEL_ID);
    const [imageUploadedFiles, setImageUploadedFiles] = useState([]);
    const [imageUploadProgress, setImageUploadProgress] = useState({});
    const [imageUploadError, setImageUploadError] = useState('');
    const [showImageUpload, setShowImageUpload] = useState(false);

    // Global Drag & Drop State
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [dragAccepting, setDragAccepting] = useState(true);
    const dragCounterRef = useRef(0);

    // App Connection State
    const [selectedConnectedApp, setSelectedConnectedApp] = useState(null);

    const detectCanvaIntent = useCallback((text = '') => {
        const value = String(text || '').toLowerCase();
        if (!value.trim()) return false;

        const patterns = [
            /\bcanva\b/,
            /\bdesign\b/,
            /\bcreate\s+(?:a\s+)?(?:poster|flyer|logo|banner|presentation|instagram\s*post|instagram\s*story|social\s+post|ad\s+creative|brochure|invitation|menu)\b/,
            /\bgenerate\s+(?:a\s+)?(?:poster|flyer|logo|banner|presentation|instagram\s*post|social\s+post|ad\s+creative|brochure|invitation|menu)\b/,
            /\bedit\s+(?:this|existing|my)\s+(?:design|poster|image|graphic)\b/,
            /\bexport\s+(?:as|to)?\s*(?:png|jpg|jpeg|pdf|gif|pptx|mp4)\b/,
            /\bdownload\s+(?:the\s+)?(?:design|image|canva)\b/,
            /\bbrand\s+template\b/,
            /\bautofill\b/,
            /\bcanva\s+template\b/,
        ];

        return patterns.some((pattern) => pattern.test(value));
    }, []);

    const router = useRouter();
    const { currentUser } = useAuth();
    const { isDarkMode } = useTheme();
    const { selectedModel, updateSelectedModel, effortLevel } = useModel();
    const searchParams = useSearchParams();
    const isIncognito = searchParams?.get('incognito') === 'true';

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
    /* `isMax` is read four times in fetchResearchUsage below (the two fallback
       branches). It was missing from this destructure, so any non-ok response or
       network failure on /api/research threw a ReferenceError instead of falling
       back to the default weekly limit. UserContext does provide it. */
    const { userPlan, planLoading, canGenerateImage, refreshPlan, isPro, isMax, remainingImages, planName, paidCredits, hasPaidCredits } = useUserPlan();

    const getAuthHeaders = useCallback(async () => {
        const token = await currentUser?.getIdToken?.();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, [currentUser]);

    // Research usage status (weekly)
    const [researchUsage, setResearchUsage] = useState({
        loading: false,
        canResearch: true,
        remaining: -1,
        weeklyLimit: -1,
        weeklyCount: 0,
        plan: 'free'
    });

    const fetchResearchUsage = useCallback(async () => {
        if (!currentUser?.email) {
            setResearchUsage({
                loading: false,
                canResearch: false,
                remaining: 0,
                weeklyLimit: 5,
                weeklyCount: 0,
                plan: 'free'
            });
            return;
        }
        setResearchUsage(prev => ({ ...prev, loading: true }));
        try {
            const resp = await fetch(`/api/research?user_email=${encodeURIComponent(currentUser.email)}`, {
                headers: {
                    ...(await getAuthHeaders())
                }
            });
            const data = await resp.json();
            if (resp.ok) {
                setResearchUsage({
                    loading: false,
                    canResearch: !!data.canResearch,
                    remaining: typeof data.remaining === 'number' ? data.remaining : -1,
                    weeklyLimit: typeof data.weeklyLimit === 'number'
                        ? data.weeklyLimit
                        : (typeof data.monthlyLimit === 'number' ? data.monthlyLimit : -1),
                    weeklyCount: typeof data.weeklyCount === 'number'
                        ? data.weeklyCount
                        : (data.monthlyCount ?? 0),
                    plan: data.plan || (isPro ? 'pro' : 'free')
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
    }, [currentUser?.email, isPro, isMax, planName, getAuthHeaders]);

    // Load research usage when user changes
    useEffect(() => {
        if (currentUser?.email) {
            fetchResearchUsage();
        }
    }, [currentUser?.email, fetchResearchUsage]);

    // Refresh usage when switching into Research
    useEffect(() => {
        if (searchType === 'research' && currentUser?.email) {
            fetchResearchUsage();
        }
    }, [searchType, currentUser?.email, fetchResearchUsage]);

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

    // Allowed file types and max file size
    const ALLOWED_FILE_TYPES = {
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
    };
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Image generation file types (for reference images)
    const IMAGE_FILE_TYPES = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp']
    };
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

    // Reset ratio to the model's first supported ratio whenever the model changes.
    useEffect(() => {
        const model = getModelById(imageGenModel);
        setSelectedRatio(model.ratios[0].value);
    }, [imageGenModel]);

    /* `getFileIcon` used to live here: a seven-branch helper returning blue / red /
       green / purple / pink file glyphs. It had no call sites left — the attachment
       tray gets its glyph from `AttachmentMedia variant=…` — so it was six
       off-palette hues that only existed to be greppable. Removed along with the
       `FileText` / `FileImage` / `File` imports it was the sole consumer of. */

    // Validate file
    const validateFile = (file) => {
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
    };

    // Validate image file for image generation
    const validateImageFile = (file) => {
        // Check file size
        if (file.size > MAX_IMAGE_SIZE) {
            return `Image "${file.name}" is too large. Maximum size is 10MB.`;
        }

        // Check file type
        const allowedMimeTypes = Object.keys(IMAGE_FILE_TYPES);
        if (!allowedMimeTypes.includes(file.type)) {
            return `File type "${file.type}" is not supported. Allowed types: .jpg, .png, .webp`;
        }

        return null;
    };

    // Upload file via /api/upload-file endpoint
    const uploadFileToStorage = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = currentUser ? await currentUser.getIdToken() : '';
        
        const resp = await fetch('/api/upload-file', { 
            method: 'POST', 
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: formData 
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Upload failed');
        }
        const data = await resp.json();
        return {
            path: data.path,
            publicUrl: data.publicUrl,
            fileName: data.fileName || file.name,
            fileType: data.fileType || file.type,
            fileSize: data.fileSize || file.size
        };
    };

    // Convert file to base64 string for API payloads (e.g., for image-to-image reference)
    const fileToBase64 = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // FileReader result is a data URL: "data:image/png;base64,..."
                // For HF API, we can send the full data URL or just the base64 part
                resolve(reader.result);
            };
            reader.onerror = (error) => {
                reject(new Error(`Failed to convert file to base64: ${error.message}`));
            };
            reader.readAsDataURL(file);
        });
    };

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

    // Handle image file drop for image generation
    const onImageDrop = useCallback((acceptedFiles, rejectedFiles) => {
        const handleImageDrop = async () => {
            setImageUploadError('');

            // Handle rejected files
            if (rejectedFiles.length > 0) {
                const errors = rejectedFiles.map(({ file, errors }) => {
                    return errors.map(error => {
                        if (error.code === 'file-too-large') {
                            return `${file.name}: Image is too large (max 10MB)`;
                        } else if (error.code === 'file-invalid-type') {
                            return `${file.name}: Invalid image type`;
                        }
                        return `${file.name}: ${error.message}`;
                    }).join(', ');
                }).join('; ');
                setImageUploadError(errors);
                toast.error(errors);
                return;
            }

            // Validate files
            const validationErrors = [];
            acceptedFiles.forEach(file => {
                const error = validateImageFile(file);
                if (error) {
                    validationErrors.push(error);
                }
            });

            if (validationErrors.length > 0) {
                const errorMessage = validationErrors.join('; ');
                setImageUploadError(errorMessage);
                toast.error(errorMessage);
                return;
            }

            // Upload images
            for (const file of acceptedFiles) {
                const fileId = uuidv4();

                try {
                    // Initialize progress
                    setImageUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 0
                    }));

                    // Simulate progress
                    const progressInterval = setInterval(() => {
                        setImageUploadProgress(prev => ({
                            ...prev,
                            [fileId]: Math.min((prev[fileId] || 0) + Math.random() * 30, 90)
                        }));
                    }, 200);

                    // Upload image
                    const uploadResult = await uploadFileToStorage(file);

                    // Complete progress
                    clearInterval(progressInterval);
                    setImageUploadProgress(prev => ({
                        ...prev,
                        [fileId]: 100
                    }));

                    // Add to uploaded images list
                    setImageUploadedFiles(prev => [...prev, {
                        id: fileId,
                        file,
                        uploadResult,
                        status: 'completed'
                    }]);

                    // Hidden mode assist: if user uploads an image, prefer an HF image-edit model immediately.
                    const preferredImageEditModel = getDefaultImageToImageModelForProvider('huggingface')
                    if (preferredImageEditModel?.id && imageGenModel !== preferredImageEditModel.id) {
                        setImageGenModel(preferredImageEditModel.id)
                    }

                    // Show success notification
                    toast.success(`${file.name} uploaded successfully!`);

                    // Remove progress after delay
                    setTimeout(() => {
                        setImageUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[fileId];
                            return newProgress;
                        });
                    }, 2000);

                } catch (error) {
                    console.error('Image upload error:', error);
                    setImageUploadError(error.message);
                    toast.error(`Failed to upload ${file.name}: ${error.message}`);

                    // Remove failed file from progress
                    setImageUploadProgress(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[fileId];
                        return newProgress;
                    });
                }
            }
        };

        // Call the async function
        handleImageDrop();
    }, [currentUser]);

    // Dropzone configuration
    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
        open
    } = useDropzone({
        onDrop,
        accept: ALLOWED_FILE_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: true,
        maxFiles: 20,
        noClick: true,
        noKeyboard: true
    });

    // Image dropzone configuration
    const {
        getRootProps: getImageRootProps,
        getInputProps: getImageInputProps,
        isDragActive: isImageDragActive,
        isDragAccept: isImageDragAccept,
        isDragReject: isImageDragReject,
        open: openImage
    } = useDropzone({
        onDrop: onImageDrop,
        accept: IMAGE_FILE_TYPES,
        maxSize: MAX_IMAGE_SIZE,
        multiple: false, // Only one reference image for generation
        noClick: true,
        noKeyboard: true
    });

    // Remove uploaded file
    const removeFile = (fileId) => {
        const handleRemoveFile = async () => {
            const fileToRemove = uploadedFiles.find(f => f.id === fileId);
            if (fileToRemove?.uploadResult?.path) {
                try {
                    const token = currentUser ? await currentUser.getIdToken() : '';
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ path: fileToRemove.uploadResult.path })
                    });
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }

            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        };

        handleRemoveFile();
    };

    // Remove uploaded image for image generation
    const removeImageFile = (fileId) => {
        const handleRemoveImageFile = async () => {
            const fileToRemove = imageUploadedFiles.find(f => f.id === fileId);
            if (fileToRemove?.uploadResult?.path) {
                try {
                    const token = currentUser ? await currentUser.getIdToken() : '';
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ path: fileToRemove.uploadResult.path })
                    });
                } catch (error) {
                    console.error('Error deleting image file:', error);
                }
            }

            setImageUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        };

        handleRemoveImageFile();
    };


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

    const toggleSpeechRecognition = async () => {

        // ── STOP ──
        if (isListeningRef.current) {
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            isListeningRef.current = false;
            setIsListening(false);
            return;
        }

        // ── Browser support check ──
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice input is not supported. Use Chrome browser.');
            return;
        }

        // ── Permission maango pehle ──
        const permitted = await requestMicPermission();
        if (!permitted) return;

        // ── Purana instance kill karo ──
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }

        // ── Naya instance banao ──
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

        recognition.continuous = isMobile ? false : true; // 🔑 Mobile pe false rakhna zaroori
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
                setUserSearchInput(prev => {
                    const trimmed = (prev || '').trimEnd();
                    return trimmed ? trimmed + ' ' + finalTranscript : finalTranscript;
                });
            }
        };

        recognition.onerror = (event) => {
            // Mobile pe 'aborted' aur 'no-speech' common hain — silently handle karo
            if (event.error === 'aborted') return;

            isListeningRef.current = false;
            setIsListening(false);
            recognitionRef.current = null;

            if (event.error === 'not-allowed') {
                toast.error('🎤 Microphone permission denied. Browser settings check karo.');
            } else if (event.error === 'no-speech') {
                toast('Kuch suna nahi. Dobara try karo.', { icon: '🎙️' });
            } else if (event.error === 'network') {
                toast.error('Network error. Internet check karo.');
            } else {
                toast.error(`Voice error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            // 🔑 KEY FIX: Mobile pe onend fire hota hai mid-session
            // Agar user ne manually stop nahi kiya toh restart karo
            if (isListeningRef.current && isMobile) {
                // Auto-restart on mobile so mic stays active
                try {
                    recognition.start();
                    return; // Don't reset state
                } catch (e) {
                    // If restart fails, clean up
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
                toast.error('Voice input start nahi hua. Dobara try karo.');
                isListeningRef.current = false;
                setIsListening(false);
                recognitionRef.current = null;
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                recognitionRef.current = null;
            }
        };
    }, []);

    const handlePaste = (e) => {
        const text = e.clipboardData?.getData('text/plain');
        if (!text) return;

        const lineCount = text.split('\n').length;
        const charCount = text.length;
        const isLargeContent = lineCount > 5 || charCount > 200;

        if (isLargeContent) {
            e.preventDefault();
            setPastedContents(prev => [...prev, text]);
        }
    };

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

        if (trimmedInput) {
            return `The user shared the following context:\n\n${labeledPastes}\n\nUser question:\n${trimmedInput}`;
        }

        return `The user shared the following context:\n\n${labeledPastes}\n\nPlease analyze and explain the provided context in detail.`;
    }, []);

    const onWebsiteBuilderStart = () => {
        const handleWebsiteBuilder = async () => {
            const combinedQuery = composePromptFromPastes(userSearchInput, pastedContents);
            if (loading || !combinedQuery) {
                console.warn('Website builder blocked: loading =', loading, ', combinedQuery =', combinedQuery);
                return;
            }

            if (!currentUser?.email) {
                toast.error('Please sign in to use the Website Builder.');
                return;
            }

            setLoading(true);

            try {
                // Call API to create project and start generation
                const response = await authFetch('/api/website-builder/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: combinedQuery,
                        userEmail: currentUser.email
                    }),
                });

                let data;
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        throw new Error(`Server returned ${contentType || 'non-JSON'} response: ${response.statusText}`);
                    }
                } catch (error) {
                    console.error('Error parsing response:', error);
                    throw new Error(`Failed to parse server response: ${error.message}`);
                }

                if (!response.ok) {
                    setLoading(false);
                    if (response.status === 402) {
                        const weekly = data?.credits?.weekly ?? 0;
                        const purchased = data?.credits?.purchased ?? 0;
                        const total = data?.credits?.total ?? (weekly + purchased);

                        toast.error(
                            data?.message ||
                            `Insufficient credits. Available: ${total} (Weekly: ${weekly}, Purchased: ${purchased}).`
                        );

                        // Help user quickly reach a place where they can upgrade/purchase.
                        setTimeout(() => router.push('/#pricing'), 1200);
                        setLoading(false);
                        return;
                    }

                    const detailedError = data?.details
                        ? `${data.error || 'Failed to create website project'}: ${data.details}`
                        : (data?.error || 'Failed to create website project');
                    throw new Error(detailedError);
                }

                // Clear input
                setUserSearchInput('');
                setPastedContents([]);

                // Notify sidebar to update history in real-time
                window.dispatchEvent(new CustomEvent('historyUpdated', {
                    detail: {
                        libId: data.projectId,
                        dataType: 'website-builder',
                        type: 'website-builder',
                        title: combinedQuery || 'Website Project',
                        created_at: new Date().toISOString(),
                    }
                }));

                // Navigate to builder page
                router.push(`/website-builder/${data.projectId}`);

                toast.success('Website builder started! Generating your website...');

            } catch (error) {
                console.error('Error starting website builder:', error);
                toast.error(`Failed to start website builder: ${error.message}`);
                setLoading(false);
            }
        };

        handleWebsiteBuilder();
    }

    const onSearchQuery = () => {
        const handleSearchQuery = async () => {
            const combinedQuery = composePromptFromPastes(userSearchInput, pastedContents);
            if (loading || (!combinedQuery && uploadedFiles.length === 0)) {
                return; // Prevent double submission
            }

            // Check if Code tab is active - redirect to website builder instead
            if (searchType === 'code') {
                onWebsiteBuilderStart();
                return;
            }

            // Enforce Research limit before proceeding
            if (!isImageGenMode && searchType === 'research') {
                if (!currentUser?.email) {
                    toast.error('Please sign in to use Research.');
                    return;
                }
                if (researchUsage.remaining <= 0 || !researchUsage.canResearch) {
                    setShowResearchLimitModal(true);
                    setSearchType('search');
                    return;
                }
            }

            setLoading(true);

            try {
                const libId = uuidv4();
                const selectedAppId = selectedConnectedApp?.appId || null;

                // Prepare file paths for database storage
                const filePaths = uploadedFiles.map(f => ({
                    path: f.uploadResult.path,
                    publicUrl: f.uploadResult.publicUrl,
                    fileName: f.uploadResult.fileName,
                    fileType: f.uploadResult.fileType,
                    fileSize: f.uploadResult.fileSize
                }));

                const libraryData = {
                    created_at: new Date().toISOString(),
                    searchInput: combinedQuery || '',
                    userEmail: currentUser?.email || 'anonymous',
                    type: searchType || 'search',
                    libId: libId,
                    selectedModel: selectedModel?.modelApi || 'provider-8/gemini-2.0-flash',
                    modelName: selectedModel?.name || 'Gemini 2.0 Flash',
                    hasFiles: filePaths.length > 0,
                    analyzedFilesCount: filePaths.length,
                    processedAt: filePaths.length > 0 ? new Date().toISOString() : undefined,
                    isIncognito: isIncognito,
                    isThinkingMode: searchType === 'research' || uploadedFiles.length > 0 ? true : requiresDeepReasoning(userSearchInput),
                    effortLevel: effortLevel || 'auto',
                };

                if (filePaths.length > 0) {
                    libraryData.uploadedFiles = JSON.stringify(filePaths);
                }

                const createLibraryResponse = await fetch('/api/search/library', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(await getAuthHeaders())
                    },
                    body: JSON.stringify({
                        libId,
                        libraryData,
                    }),
                });

                if (!createLibraryResponse.ok) {
                    const errorPayload = await createLibraryResponse.json().catch(() => ({}));
                    throw new Error(errorPayload?.details || errorPayload?.error || 'Failed to create library record');
                }

                setUserSearchInput('');
                setPastedContents([]);
                setUploadedFiles([]);
                // Full file/reset cleanup per preferences
                setImageUploadedFiles([]);
                setImageUploadProgress({});
                setUploadProgress({});
                setFileUploadError('');
                setImageUploadError('');
                setShowFileUpload(false);
                setShowImageUpload(false);

                // Notify sidebar to update history in real-time
                window.dispatchEvent(new CustomEvent('historyUpdated', {
                    detail: {
                        libId,
                        dataType: 'search',
                        type: searchType || 'search',
                        title: combinedQuery || 'Untitled',
                        created_at: new Date().toISOString(),
                    }
                }));

                // Trigger sidebar credit refresh immediately after request completes
                window.dispatchEvent(new CustomEvent('creditsUpdated'));

                const queryParams = new URLSearchParams();
                if (selectedAppId) queryParams.append('appId', selectedAppId);
                if (isIncognito) queryParams.append('incognito', 'true');
                if (effortLevel && effortLevel !== 'auto') queryParams.append('effort', effortLevel);
                const autoThinkingMode = searchType === 'research' || uploadedFiles.length > 0 ? true : requiresDeepReasoning(userSearchInput);
                if (autoThinkingMode) queryParams.append('thinking', 'true');
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

                router.push('/search/' + libId + queryString);

            } catch (error) {
                console.error('Error creating search:', error);
                toast.error(`Search creation failed: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        handleSearchQuery();
    }


    const onImageGeneration = () => {
        const handleImageGeneration = async () => {
            const combinedQuery = composePromptFromPastes(userSearchInput, pastedContents);
            if (loading || !combinedQuery) return; // Prevent double submission and require prompt

            // Check if user can generate images based on their plan
            if (!canGenerateImage && !planLoading) {
                const message = userPlan?.limits?.message || 'Daily image generation limit reached. Upgrade your plan for more generation.';
                toast.error(message);
                return;
            }

            setLoading(true);
            const libId = uuidv4();

            try {
                // First call the API to check limits and generate image
                const selectedRatioData = getModelById(imageGenModel).ratios.find(r => r.value === selectedRatio);
                const providerToUse = getProviderIdByModelId(imageGenModel);

                // Hidden auto-switch: uploaded reference image means image-to-image.
                // No upload means text-to-image.
                let referenceImagePath = null;
                let referenceImageBase64 = null;
                let requestedGenerationType = 'text-to-image';
                
                if (imageUploadedFiles.length > 0) {
                    requestedGenerationType = 'image-to-image';
                    const uploadedFile = imageUploadedFiles[0];
                    // Use the uploaded file's public URL
                    referenceImagePath = uploadedFile.uploadResult.publicUrl;
                    
                    // Also encode the original file to base64 for more direct API submission
                    // This reduces cross-origin issues and ensures image-to-image mode works properly
                    try {
                        referenceImageBase64 = await fileToBase64(uploadedFile.file);
                    } catch (base64Error) {
                        console.warn('Failed to encode reference image to base64:', base64Error);
                        // Continue with just the URL if base64 encoding fails
                    }
                }

                // Immediately redirect to image generation page while API processes in background
                // This provides instant feedback to the user that generation has started
                router.push('/image-gen/' + libId);
                setUserSearchInput('');
                setPastedContents([]);
                setImageUploadedFiles([]);
                setImageUploadProgress({});
                setImageUploadError('');
                setShowImageUpload(false);

                // Notify sidebar to update history in real-time
                window.dispatchEvent(new CustomEvent('historyUpdated', {
                    detail: {
                        libId,
                        dataType: 'image-generation',
                        type: 'image-generation',
                        title: combinedQuery || 'Image Generation',
                        created_at: new Date().toISOString(),
                    }
                }));

                // Call API to initiate generation without waiting for it to complete
                authFetch('/api/generate-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: combinedQuery,
                        provider: providerToUse,
                        model: imageGenModel,
                        width: selectedRatioData.width,
                        height: selectedRatioData.height,
                        referenceImage: referenceImagePath,
                        referenceImageBase64: referenceImageBase64,
                        generationType: requestedGenerationType,
                        libId: libId,
                        userEmail: currentUser?.email
                    }),
                }).then(async (generationResponse) => {
                    const apiResult = await generationResponse.json();

                    if (!generationResponse.ok) {
                        if (apiResult.limitExceeded) {
                            toast.error(apiResult.details || 'Daily image generation limit reached.');
                            refreshPlan();
                        } else {
                            toast.error(apiResult.details || apiResult.error || `Failed to generate image: ${generationResponse.status}`);
                        }
                    } else {
                        const actualMode = apiResult?.generationType || 'text-to-image'
                        const actualModel = apiResult?.modelName || apiResult?.model || 'model'
                        if (actualMode === 'image-to-image') {
                            toast.success(`Image edited successfully with ${actualModel}`)
                        } else {
                            toast.info(`Generated via ${actualModel} (${actualMode})`)
                        }
                        // Refresh plan data to update daily count on successful API call
                        refreshPlan();
                        // Trigger sidebar credit refresh
                        window.dispatchEvent(new CustomEvent('creditsUpdated'));
                    }
                }).catch((error) => {
                    console.error('Error calling generation API:', error);
                    toast.error('Failed to initiate image generation. Please try again.');
                });

            } catch (error) {
                console.error('Error initiating image generation:', error);
                setLoading(false);
                toast.error('Failed to initiate image generation. Please try again.');
            }
        };

        handleImageGeneration();
    }

    const handleInput = (e) => {
        e.target.style.height = 'auto';
        const newHeight = e.target.scrollHeight;
        const maxHeight = 12 * 24; // 12 lines * 24px line-height (approximate)

        if (newHeight > maxHeight) {
            e.target.style.height = maxHeight + 'px';
            e.target.style.overflowY = 'scroll';
        } else {
            e.target.style.height = newHeight + 'px';
            e.target.style.overflowY = 'hidden';
        }
    };

    // ── Global Drag & Drop Handlers ──
    const handleWindowDragEnter = useCallback((e) => {
        e.preventDefault()
        dragCounterRef.current += 1

        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
            const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file')
            if (hasFiles) {
                setIsDraggingOver(true)

                // Extra check for image-only mode
                if (isImageGenMode) {
                    const hasValidImage = Array.from(e.dataTransfer.items).some(item =>
                        item.type.startsWith('image/')
                    )
                    setDragAccepting(hasValidImage)
                } else {
                    setDragAccepting(true) // assume true for docs till dropped
                }
            }
        }
    }, [isImageGenMode])

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
            if (isImageGenMode) {
                setShowImageUpload(true)
            } else {
                setShowFileUpload(true)
            }
        }
    }, [isImageGenMode])

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

    /* Single source of truth for "is there something to send". It was inlined
       five separate times — in the keydown handler, the click handler, the button
       class, the button glyph and the tooltip — which is how the tooltip and the
       glyph ended up describing two different actions. */
    const hasComposerInput = isImageGenMode
        ? Boolean(userSearchInput || pastedContents.length > 0)
        : Boolean(userSearchInput || pastedContents.length > 0 || uploadedFiles.length > 0)

    const imageQuotaBlocked = isImageGenMode && !isPro && !isMax && (!canGenerateImage || remainingImages <= 0) && !planLoading
    const researchLocked = !researchUsage.canResearch || researchUsage.remaining === 0

    /* The textarea's own lock, which is narrower than `researchLocked`: it only
       applies to a free plan that has actually spent a finite weekly allowance.
       Kept as its own expression so the disabled input and the locked menu tile
       cannot drift apart. */
    const researchInputLocked = !isImageGenMode
        && searchType === 'research'
        && !isPro
        && researchUsage.weeklyLimit !== -1
        && researchUsage.remaining === 0

    const canSend = hasComposerInput && !loading && !imageQuotaBlocked

    return (
        <>
            <DragDropOverlay
                isVisible={isDraggingOver}
                isDragAccept={dragAccepting}
                isDragReject={!dragAccepting}
                isImageMode={isImageGenMode}
            />
            <div className='flex flex-col w-full min-h-full items-center justify-center px-4 bg-background py-8 md:py-12'>
                <div
                    className="relative select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                        WebkitUserDrag: 'none',
                        KhtmlUserSelect: 'none'
                    }}
                >
                    <Image
                        src={isDarkMode ? "/Chatboxai_logo_main_2.png" : "/Chatboxai_logo_main.png"}
                        alt='logo'
                        width={200}
                        height={100}
                        className="w-40 md:w-52 h-auto pointer-events-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                            WebkitUserDrag: 'none',
                            KhtmlUserSelect: 'none'
                        }}
                    />
                </div>

                {/* Incognito Chat Description. The purple well and its purple glow were
                    the only purple in the app and carried no meaning beyond decoration —
                    the glyph and the heading already say what mode this is. */}
                {isIncognito && (
                    <div className="mt-6 flex flex-col items-center justify-center text-center max-w-md mx-auto px-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="mb-3 rounded-full border border-border/60 bg-muted/60 p-3 text-muted-foreground">
                            <MessageCircleDashed className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">Incognito Chat is Active</h2>
                    </div>
                )}

                {/* ── Composer ──
                    Deliberately always expanded, unlike the two fixed composers in
                    search and image-gen. This one *is* the page rather than floating
                    over content, so there is nothing for it to get out of the way of,
                    and collapsing it would hide the mode affordances that are the whole
                    point of the screen. */}
                <div
                    {...(isImageGenMode ? getImageRootProps() : getRootProps())}
                    data-composer
                    className={`w-full max-w-3xl mt-6 md:mt-8 ${COMPOSER_CARD({
                        dragActive: isImageGenMode ? isImageDragActive : isDragActive,
                    })}`}
                >
                    <input {...(isImageGenMode ? getImageInputProps() : getInputProps())} />
                    {/* Pasted Content Preview Cards */}
                    {pastedContents.length > 0 && (
                        <PastedContentPreview
                            contents={pastedContents}
                            onRemove={(index) => setPastedContents(prev => prev.filter((_, i) => i !== index))}
                        />
                    )}

                    {/* Mode badges — only shown for non-default (non-search) modes.

                        Hue is only kept where one is already reserved and visible in the
                        answer region: blue for Deep Research, emerald for a live app
                        connection. Website Builder and Create Image are neutral, because
                        emerald means "success" and purple means nothing — the glyph and
                        the label carry those two.

                        The dismiss buttons are 20px rather than 24px. They pass WCAG 2.2
                        target size through the spacing exception (nearest other target is
                        ≥8px away), and each mode has a second, larger way to be turned
                        off in the toolbar below. */}
                    {(searchType === 'research' || searchType === 'code' || isImageGenMode || selectedConnectedApp) && (
                        <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5">
                            {/* Connected App badge */}
                            {selectedConnectedApp && !isImageGenMode && (
                                <div className={`${CONNECTED_BADGE} text-xs font-medium`}>
                                    {selectedConnectedApp.appIcon && (
                                        <img src={selectedConnectedApp.appIcon} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" />
                                    )}
                                    {selectedConnectedApp.appName}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedConnectedApp(null)}
                                        aria-label={`Disconnect ${selectedConnectedApp.appName} from this message`}
                                        className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-emerald-500/20 ${FOCUS_RING}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {/* Research badge */}
                            {searchType === 'research' && !isImageGenMode && (
                                <div className={`${RESEARCH_BADGE} text-xs font-medium`}>
                                    <Atom className="h-3.5 w-3.5" />
                                    Deep Research
                                    <button
                                        type="button"
                                        onClick={() => setSearchType('search')}
                                        aria-label="Turn off Deep Research"
                                        className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-blue-500/20 ${FOCUS_RING}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {/* Website Builder badge */}
                            {searchType === 'code' && !isImageGenMode && (
                                <div className={`${NEUTRAL_BADGE} text-xs font-medium`}>
                                    <Code2 className="h-3.5 w-3.5" />
                                    Website Builder
                                    <button
                                        type="button"
                                        onClick={() => setSearchType('search')}
                                        aria-label="Turn off Website Builder"
                                        className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-hover-2 hover:text-ink ${FOCUS_RING}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            {/* Image Generation badge + inline ratio selector */}
                            {isImageGenMode && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className={`${NEUTRAL_BADGE} text-xs font-medium`}>
                                        <ImagePlus className="h-3.5 w-3.5" />
                                        Create Image
                                        <button
                                            type="button"
                                            onClick={() => setIsImageGenMode(false)}
                                            aria-label="Turn off image generation"
                                            className={`-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-hover-2 hover:text-ink ${FOCUS_RING}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>

                                    {/* Aspect ratio. `text-2.75` emitted no font-size at all, so
                                        these pills were rendering at the inherited 16px and
                                        wrapping; they are 11px now. Each is a real toggle with
                                        aria-pressed, inside a labelled radiogroup-ish container,
                                        because previously the selected one was distinguishable
                                        only by fill. */}
                                    <div
                                        role="group"
                                        aria-label="Image aspect ratio"
                                        className="inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/40 p-0.5"
                                    >
                                        {getModelById(imageGenModel).ratios.map((ratio) => {
                                            const isSelected = selectedRatio === ratio.value;
                                            const shortLabel = ratio.value;
                                            const nameLabel = ratio.label.replace(/\s*\(.*\)/, '');
                                            return (
                                                <button
                                                    key={ratio.value}
                                                    type="button"
                                                    onClick={() => setSelectedRatio(ratio.value)}
                                                    aria-pressed={isSelected}
                                                    className={`inline-flex min-h-8 cursor-pointer items-center whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium transition-colors duration-200 sm:px-2.5 ${FOCUS_RING} ${isSelected
                                                        ? 'bg-foreground text-background shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <span className="sm:hidden">{isSelected ? `${nameLabel} ${shortLabel}` : shortLabel}</span>
                                                    <span className="hidden sm:inline">{ratio.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attachment tray (regular files).

                        Two changes beyond styling. The remove control is now the shared
                        `AttachmentRemove`, which is visible without hover — the old
                        hand-rolled button lived inside a `group-hover:opacity-100`
                        wrapper, so on any touch device there was no way to detach a
                        file at all. And progress is `AttachmentProgress`, which pairs
                        the bar with a readable percentage; a bare `Progress` inside
                        `AttachmentDescription` communicated by width alone.

                        `role="list"` is restated because `AttachmentGroup` is a plain
                        flex div, and the stagger is capped at 8 items so a large
                        multi-select does not spend half a second dealing itself out. */}
                    {!isImageGenMode && (uploadedFiles.length > 0 || Object.keys(uploadProgress).length > 0) && (
                        <div className="px-4 pt-3">
                            <AttachmentGroup role="list" aria-label="Attached files">
                                {uploadedFiles.map((fileItem, index) => (
                                    <Attachment
                                        key={fileItem.id}
                                        role="listitem"
                                        state="done"
                                        className={TRAY_ITEM}
                                        style={TRAY_ITEM_STYLE(index)}
                                    >
                                        <AttachmentMedia variant={fileItem.file.type.startsWith('image/') ? 'image' : 'file'} />
                                        <AttachmentContent>
                                            <AttachmentTitle title={fileItem.file.name}>{fileItem.file.name}</AttachmentTitle>
                                            <AttachmentDescription>{(fileItem.file.size / 1024 / 1024).toFixed(1)} MB</AttachmentDescription>
                                        </AttachmentContent>
                                        <AttachmentActions>
                                            <AttachmentRemove
                                                label={fileItem.file.name}
                                                onClick={(e) => { e.stopPropagation(); removeFile(fileItem.id); }}
                                            />
                                        </AttachmentActions>
                                    </Attachment>
                                ))}
                                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                    <Attachment key={`upload-${fileId}`} role="listitem" state="uploading">
                                        <AttachmentMedia variant="file" />
                                        <AttachmentContent>
                                            <AttachmentTitle>Uploading…</AttachmentTitle>
                                            <AttachmentProgress value={progress} label="File upload progress" className="mt-1" />
                                        </AttachmentContent>
                                    </Attachment>
                                ))}
                            </AttachmentGroup>
                        </div>
                    )}

                    {/* Attachment tray (reference images, image-gen mode) */}
                    {isImageGenMode && (imageUploadedFiles.length > 0 || Object.keys(imageUploadProgress).length > 0) && (
                        <div className="px-4 pt-3">
                            <AttachmentGroup role="list" aria-label="Reference images">
                                {imageUploadedFiles.map((fileItem, index) => (
                                    <Attachment
                                        key={fileItem.id}
                                        role="listitem"
                                        state="done"
                                        className={TRAY_ITEM}
                                        style={TRAY_ITEM_STYLE(index)}
                                    >
                                        <AttachmentMedia variant="image">
                                            <img src={URL.createObjectURL(fileItem.file)} alt="" className="w-full h-full object-cover" />
                                        </AttachmentMedia>
                                        <AttachmentContent>
                                            <AttachmentTitle title={fileItem.file.name}>{fileItem.file.name}</AttachmentTitle>
                                            <AttachmentDescription>{(fileItem.file.size / 1024 / 1024).toFixed(1)} MB</AttachmentDescription>
                                        </AttachmentContent>
                                        <AttachmentActions>
                                            <AttachmentRemove
                                                label={fileItem.file.name}
                                                onClick={(e) => { e.stopPropagation(); removeImageFile(fileItem.id); }}
                                            />
                                        </AttachmentActions>
                                    </Attachment>
                                ))}
                                {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                                    <Attachment key={`upload-${fileId}`} role="listitem" state="uploading">
                                        <AttachmentMedia variant="image" />
                                        <AttachmentContent>
                                            <AttachmentTitle>Uploading image…</AttachmentTitle>
                                            <AttachmentProgress value={progress} label="Image upload progress" className="mt-1" />
                                        </AttachmentContent>
                                    </Attachment>
                                ))}
                            </AttachmentGroup>
                        </div>
                    )}

                    {/* Notice when daily free limit is exceeded */}
                    {isImageGenMode && imageQuotaBlocked && (
                        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in">
                            <div className="flex items-center gap-2 min-w-0">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span className="font-medium truncate">Daily limit exceeded (10/10 used). Upgrade to Pro or Max for unlimited generation.</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/#pricing')}
                                className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80"
                            >
                                Upgrade
                            </button>
                        </div>
                    )}

                    {/* Textarea.

                        `md:text-3.75` emitted no font-size — font-size is a namespaced
                        Tailwind v4 utility and rejects bare decimals — so from `md` up
                        this was silently falling back to the `text-sm` below it. That
                        turned out to be the whole story on mobile too: 14px in a focused
                        input is under iOS's 16px threshold, so Safari zoomed the page on
                        every focus. `COMPOSER_TEXTAREA` is `text-base` at every width.

                        `dark:text-white` / `dark:placeholder:text-gray-400` are gone as
                        well: `text-foreground` and `text-muted-foreground/70` already
                        invert, and the hard-coded pair ignored the theme's ink tokens. */}
                    <textarea
                        onPaste={handlePaste}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault();
                                if (canSend) {
                                    if (isImageGenMode) onImageGeneration();
                                    else onSearchQuery();
                                }
                            }
                        }}
                        value={userSearchInput || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            setUserSearchInput(value);
                        }}
                        placeholder={
                            pastedContents.length > 0 ? 'Add a message...' : (
                                isImageGenMode
                                    ? (imageQuotaBlocked
                                        ? 'Daily limit of 10 images reached. Upgrade to Pro for unlimited generation…'
                                        : 'Describe the image you want to generate...')
                                    : searchType === 'research'
                                        ? 'What do you want to research deeply?'
                                        : searchType === 'code'
                                            ? 'Describe the website you want to generate...'
                                            : 'Ask anything...'
                            )
                        }
                        className={`${COMPOSER_TEXTAREA} min-h-13 px-5 pt-4 pb-2`}
                        rows={1}
                        style={{ overflow: 'hidden' }}
                        onInput={handleInput}
                        disabled={researchInputLocked}
                        aria-label={isImageGenMode ? 'Image prompt' : 'Message'}
                    />

                    {/* Research limit hint. `role="status"` so the count is announced when
                        it changes, and rose once it is spent — the same "negative" hue the
                        locked menu tile and the limit modal use. */}
                    {!isImageGenMode && searchType === 'research' && !isPro && researchUsage.weeklyLimit !== -1 && (
                        <div
                            role="status"
                            className={`px-4 pb-1 text-xs tabular-nums ${researchUsage.remaining > 0 ? 'text-muted-foreground' : 'text-rose-600 dark:text-rose-400'}`}
                        >
                            {researchUsage.remaining > 0
                                ? `${researchUsage.remaining} Deep Research uses remaining this week`
                                : 'Weekly Deep Research limit reached. Upgrade your plan for more Research.'}
                        </div>
                    )}

                    {/* ── Bottom toolbar ──
                        Always visible here. The two fixed composers collapse this row
                        when idle because they float over content; this one is the page. */}
                    <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
                        <div className="flex min-w-0 items-center gap-0.5">

                            {/* Plus menu (shadcn DropdownMenu with Attach, Deep Research, Builder & App Connections) */}
                            <ComposerPlusMenu
                                onAttachFiles={() => {
                                    if (isImageGenMode) openImage();
                                    else open();
                                }}
                                searchType={searchType}
                                onSearchTypeChange={(newType) => {
                                    setSearchType(newType);
                                    if (newType === 'research' && currentUser?.email) fetchResearchUsage();
                                }}
                                researchLocked={researchLocked}
                                researchUsage={researchUsage}
                                onShowResearchLimitModal={() => setShowResearchLimitModal(true)}
                                isImageGenMode={isImageGenMode}
                                uploadedFilesCount={uploadedFiles?.length || 0}
                                selectedApp={selectedConnectedApp}
                                onSelectApp={setSelectedConnectedApp}
                            />

                            {/* Create Image toggle */}
                            {searchType !== 'code' && (
                                <button
                                    type="button"
                                    onClick={() => setIsImageGenMode(!isImageGenMode)}
                                    aria-pressed={isImageGenMode}
                                    aria-label="Create image"
                                    className={TOOLBAR_TOGGLE(isImageGenMode, { pill: true })}
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Create Image</span>
                                </button>
                            )}

                            <div className={TOOLBAR_DIVIDER} />

                            {/* AI Model dropdown (Search/Research mode) */}
                            {!isImageGenMode && searchType !== 'code' && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        aria-label={`AI model: ${selectedModel?.name || 'Auto'}. Change model`}
                                        className={`${TOOLBAR_PILL} group border-0 bg-transparent`}
                                    >
                                        {!selectedModel || selectedModel?.name?.toLowerCase() === 'auto' ? (
                                            <Cpu className="h-4 w-4" />
                                        ) : (
                                            getModelLogo(selectedModel.name, true)
                                        )}
                                        <span className="hidden sm:inline max-w-25 truncate">{selectedModel?.name || 'Model'}</span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        sideOffset={8}
                                        className="w-[280px] rounded-2xl border border-border/60 bg-popover p-1.5 shadow-2xl"
                                    >
                                        <div className="flex max-h-[340px] flex-col gap-0.5 overflow-y-auto p-1">
                                            {(searchType === 'research' ? DEEP_RESEARCH_MODELS : AIModelsOption).map((model, index) => {
                                                // Pass paidCredits so paid models lock in real time when the balance hits 0
                                                const effectivePlan = planName || (isPro ? 'pro' : 'free');
                                                const isAccessible = canAccessModel(model, effectivePlan, paidCredits);
                                                const isSelected = selectedModel?.id === model.id;

                                                return (
                                                    <DropdownMenuItem
                                                        key={index}
                                                        /* The tier is drawn as a coloured bolt, so the label
                                                           also states it — otherwise Pro vs. free is carried
                                                           by hue alone. */
                                                        aria-label={`${model.name}${model.isPro ? ', Pro model' : ''}${!isAccessible ? ', locked' : ''}`}
                                                        className={`flex items-center justify-between rounded-[10px] px-2.5 py-2 cursor-pointer transition-colors duration-200 outline-none select-none
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
                                                                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                                            ) : (
                                                                <Zap
                                                                    className={`h-3.5 w-3.5 ${model.isPro ? 'text-primary' : 'text-muted-foreground'}`}
                                                                    fill="currentColor"
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-primary" strokeWidth={3} aria-hidden="true" />
                                                            )}
                                                        </div>
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {/* Image Model dropdown (matching Search model modal design) */}
                            {isImageGenMode && (() => {
                                const currentModel = IMAGE_MODELS.find(m => m.id === imageGenModel) || IMAGE_MODELS[0];
                                const displayedModels = IMAGE_MODELS.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

                                return (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            aria-label={`Image model: ${currentModel?.name || 'default'}. Change model`}
                                            className={`${TOOLBAR_PILL} group border-0 bg-transparent`}
                                        >
                                            {!currentModel ? (
                                                <Cpu className="h-4 w-4" />
                                            ) : (
                                                getModelLogo(currentModel.name, true)
                                            )}
                                            <span className="hidden sm:inline max-w-25 truncate">{currentModel?.name || 'Model'}</span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            sideOffset={8}
                                            className="w-[280px] rounded-2xl border border-border/60 bg-popover p-1.5 shadow-2xl"
                                        >
                                            <div className="flex max-h-[340px] flex-col gap-0.5 overflow-y-auto p-1">
                                                {displayedModels.map((model, index) => {
                                                    const isSelected = imageGenModel === model.id;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={index}
                                                            aria-label={model.name}
                                                            className={`flex items-center justify-between rounded-[10px] px-2.5 py-2 cursor-pointer transition-colors duration-200 outline-none select-none
                                                                ${isSelected ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'hover:bg-muted focus:bg-muted dark:hover:bg-muted/50 dark:focus:bg-muted/50'}`}
                                                            onClick={() => setImageGenModel(model.id)}
                                                        >
                                                            <div className='flex items-center gap-3 min-w-0'>
                                                                {getModelLogo(model.name)}
                                                                <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                                    {model.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5 shrink-0">
                                                                {isSelected && (
                                                                    <Check className="w-4 h-4 text-primary" strokeWidth={3} aria-hidden="true" />
                                                                )}
                                                            </div>
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            })()}

                            <div className={TOOLBAR_DIVIDER} />

                            {/* Voice AI. This used to be what the send button turned into when
                                the composer was empty — the one primary CTA silently changing
                                meaning based on state. It is its own labelled control now, and
                                send always sends. */}
                            <button
                                type="button"
                                onClick={() => router.push('/voice-ai')}
                                aria-label="Open Voice AI assistant"
                                className={TOOLBAR_BUTTON}
                            >
                                <AudioLines className="h-4 w-4" />
                            </button>

                            {/* Mic */}
                            <button
                                type="button"
                                onClick={toggleSpeechRecognition}
                                aria-pressed={isListening}
                                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                className={isListening ? TOOLBAR_RECORDING : TOOLBAR_BUTTON}
                            >
                                {isListening
                                    ? <MicOff className="h-4 w-4" />
                                    : <Mic className="h-4 w-4" />
                                }
                            </button>
                        </div>

                        {/* Send. Disabled rather than repurposed when there is nothing to
                            send, so the shape of the primary action never changes. */}
                        <button
                            type="button"
                            onClick={() => {
                                if (!canSend) return;
                                if (isImageGenMode) onImageGeneration();
                                else onSearchQuery();
                            }}
                            disabled={!canSend}
                            className={SEND_BUTTON(canSend)}
                            aria-label={
                                imageQuotaBlocked
                                    ? (userPlan?.limits?.message || 'Daily image limit reached')
                                    : 'Send (Shift + Enter)'
                            }
                            title={
                                imageQuotaBlocked
                                    ? 'Daily limit of 10 images reached. Upgrade to Pro for unlimited generation.'
                                    : 'Send (Shift + Enter)'
                            }
                        >
                            {loading ? (
                                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
                            ) : (
                                <ArrowUp className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Image quota footer:
                    - Pro or Max plan: show NOTHING because image generation is unlimited.
                    - Free plan exhausted: show prominent daily limit exceeded card with upgrade CTA.
                    - Free plan active: show clean redesigned progress indicator. */}
                {isImageGenMode && !planLoading && userPlan && !isPro && !isMax && (() => {
                    const dailyLimit = userPlan?.limits?.dailyLimit || 10
                    const isExhausted = !canGenerateImage || remainingImages <= 0

                    if (isExhausted) {
                        return (
                            <div className="w-full max-w-2xl mt-2.5 mx-auto animate-in fade-in">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 shadow-sm backdrop-blur-sm">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                            <AlertCircle className="h-4.5 w-4.5" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-rose-900 dark:text-rose-200">
                                                Daily limit exceeded (10/10 used)
                                            </p>
                                            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 truncate">
                                                Free plan includes 10 images/day. Upgrade to Pro or Max for unlimited generation.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/#pricing')}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110 active:scale-[0.98]"
                                    >
                                        <Crown className="h-3.5 w-3.5" />
                                        Upgrade to Pro
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <div className="w-full max-w-2xl mt-2 mx-auto animate-in fade-in">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/85 dark:bg-card/60 backdrop-blur-sm px-3.5 py-2 text-xs text-muted-foreground shadow-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                    <span className="font-medium text-foreground tabular-nums truncate">
                                        {remainingImages === 1
                                            ? '1 free generation left today'
                                            : `${remainingImages} of ${dailyLimit} free generations left today`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 min-w-[110px] max-w-[180px] flex-1">
                                    <Progress
                                        value={(remainingImages / dailyLimit) * 100}
                                        aria-label="Daily image quota remaining"
                                        className="h-1.5 flex-1 bg-muted"
                                    />
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                                        {dailyCount}/{dailyLimit}
                                    </span>
                                </div>

                                {remainingImages <= 3 && (
                                    <button
                                        type="button"
                                        onClick={() => router.push('/#pricing')}
                                        className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                                    >
                                        <Crown className="h-3 w-3" />
                                        Go Unlimited
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })()}
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

export default ChatBoxAiInput
