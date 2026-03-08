'use client'

import Image from 'next/image'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/lib/alert'
import { ArrowUp, AudioLines, Code2, Cpu, ImagePlus, Mic, MicOff, Paperclip, Plus, Upload, X, FileText, FileImage, File, Crown, Atom } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIModelsOption } from '@/services/Shared'
import { useAuth } from '@/contexts/AuthContext'
import { useAdmin } from '@/contexts/AdminContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useModel } from '@/contexts/ModelContext'
import { useUserPlan } from '@/hooks/useUserPlan'
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation'
import {
    IMAGE_MODELS,
    DEFAULT_MODEL_ID,
    getModelById,
    getDefaultModelForProvider,
    getProviderIdByModelId,
} from '@/lib/hf-image-config'

const DEFAULT_IMAGE_MODEL_ID = getDefaultModelForProvider('leonardo')?.id || DEFAULT_MODEL_ID;

function ChatBoxAiInput() {

    const [userSearchInput, setUserSearchInput] = useState();
    const [searchType, setSearchType] = useState("search");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
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
    const router = useRouter();
    const { currentUser } = useAuth();
    const { openAdminLogin } = useAdmin();
    const { isDarkMode } = useTheme();
    const { selectedModel, updateSelectedModel } = useModel();
    const { userPlan, planLoading, canGenerateImage, refreshPlan, isPro, remainingImages } = useUserPlan();

    // Research usage status (monthly)
    const [researchUsage, setResearchUsage] = useState({
        loading: false,
        canResearch: true,
        remaining: -1,
        monthlyLimit: -1,
        monthlyCount: 0,
        plan: 'free'
    });

    const fetchResearchUsage = useCallback(async () => {
        if (!currentUser?.email) {
            setResearchUsage({
                loading: false,
                canResearch: false,
                remaining: 0,
                monthlyLimit: 5,
                monthlyCount: 0,
                plan: 'free'
            });
            return;
        }
        setResearchUsage(prev => ({ ...prev, loading: true }));
        try {
            const resp = await fetch(`/api/research?user_email=${encodeURIComponent(currentUser.email)}`);
            const data = await resp.json();
            if (resp.ok) {
                setResearchUsage({
                    loading: false,
                    canResearch: !!data.canResearch,
                    remaining: typeof data.remaining === 'number' ? data.remaining : -1,
                    monthlyLimit: typeof data.monthlyLimit === 'number' ? data.monthlyLimit : -1,
                    monthlyCount: data.monthlyCount ?? 0,
                    plan: data.plan || (isPro ? 'pro' : 'free')
                });
            } else {
                // On error, don't block; assume unlimited for safety (server will enforce anyway)
                setResearchUsage({
                    loading: false,
                    canResearch: isPro,
                    remaining: isPro ? -1 : 0,
                    monthlyLimit: isPro ? -1 : 5,
                    monthlyCount: 0,
                    plan: isPro ? 'pro' : 'free'
                });
            }
        } catch (e) {
            setResearchUsage({
                loading: false,
                canResearch: isPro,
                remaining: isPro ? -1 : 0,
                monthlyLimit: isPro ? -1 : 5,
                monthlyCount: 0,
                plan: isPro ? 'pro' : 'free'
            });
        }
    }, [currentUser?.email, isPro]);

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
        'image/png': ['.png']
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

    // Get file icon based on file type
    const getFileIcon = (file) => {
        if (file.type.startsWith('image/')) {
            return <FileImage className="w-4 h-4 text-blue-500" />;
        } else if (file.type === 'application/pdf') {
            return <FileText className="w-4 h-4 text-red-500" />;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return <FileText className="w-4 h-4 text-blue-600" />;
        } else if (file.type === 'text/plain' || file.type === 'text/csv') {
            return <FileText className="w-4 h-4 text-green-500" />;
        }
        return <File className="w-4 h-4 text-gray-500" />;
    };

    // Validate file
    const validateFile = (file) => {
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
        const resp = await fetch('/api/upload-file', { method: 'POST', body: formData });
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
        isDragReject
    } = useDropzone({
        onDrop,
        accept: ALLOWED_FILE_TYPES,
        maxSize: MAX_FILE_SIZE,
        multiple: true
    });

    // Image dropzone configuration
    const {
        getRootProps: getImageRootProps,
        getInputProps: getImageInputProps,
        isDragActive: isImageDragActive,
        isDragAccept: isImageDragAccept,
        isDragReject: isImageDragReject
    } = useDropzone({
        onDrop: onImageDrop,
        accept: IMAGE_FILE_TYPES,
        maxSize: MAX_IMAGE_SIZE,
        multiple: false // Only one reference image for generation
    });

    // Remove uploaded file
    const removeFile = (fileId) => {
        const handleRemoveFile = async () => {
            const fileToRemove = uploadedFiles.find(f => f.id === fileId);
            if (fileToRemove?.uploadResult?.path) {
                try {
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
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
                    await fetch('/api/upload-file', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
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

    // Initialize speech recognition
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
                        const currentText = userSearchInput || '';
                        const newText = finalTranscript + interimTranscript;
                        setUserSearchInput(currentText + newText);
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
                        const errorType = event?.error;

                        // These are common non-fatal events when user pauses or stops quickly.
                        if (errorType === 'no-speech' || errorType === 'aborted') {
                            setIsListening(false);
                            return;
                        }

                        console.error('Speech recognition error:', errorType);
                        setIsListening(false);

                        // Handle specific mobile errors
                        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
                            alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
                        } else if (errorType === 'network') {
                            alert('Network error. Please check your internet connection.');
                        }
                    };

                    setRecognition(recognitionInstance);
                } catch (error) {
                    console.error('Failed to initialize speech recognition:', error);
                }
            }
        }
    }, []);

    const toggleSpeechRecognition = () => {
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
                            alert('Microphone access is required for speech recognition. Please enable microphone permissions.');
                        });
                } else {
                    recognition.start();
                }
            } catch (error) {
                console.error('Error starting recognition:', error);
                alert('Failed to start speech recognition. Please try again.');
            }
        }
    };

    const onWebsiteBuilderStart = () => {
        const handleWebsiteBuilder = async () => {
            if (loading || !userSearchInput) {
                console.warn('Website builder blocked: loading =', loading, ', userSearchInput =', userSearchInput);
                return;
            }

            if (!currentUser?.email) {
                toast.error('Please sign in to use the Website Builder.');
                return;
            }

            setLoading(true);

            try {
                // Call API to create project and start generation
                const response = await fetch('/api/website-builder/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: userSearchInput,
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
            if (loading || (!userSearchInput && uploadedFiles.length === 0)) {
                return; // Prevent double submission
            }

            // Check if Code tab is active - redirect to website builder instead
            if (searchType === 'code') {
                onWebsiteBuilderStart();
                return;
            }

            // Enforce Research limit for free users before proceeding
            if (!isImageGenMode && searchType === 'research') {
                if (!currentUser?.email) {
                    toast.error('Please sign in to use Research.');
                    return;
                }
                const isUnlimited = isPro || researchUsage.monthlyLimit === -1;
                if (!isUnlimited) {
                    if (researchUsage.loading) {
                        toast.info('Checking Research availability...');
                        return;
                    }
                    if (researchUsage.remaining <= 0) {
                        toast.error('Monthly Research limit reached. Upgrade to Pro for unlimited Research.');
                        return;
                    }
                }
            }

            setLoading(true);

            try {
                const libId = uuidv4();

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
                    searchInput: userSearchInput || '',
                    userEmail: currentUser?.email || 'anonymous',
                    type: searchType || 'search',
                    libId: libId,
                    selectedModel: selectedModel?.modelApi || 'provider-8/gemini-2.0-flash',
                    modelName: selectedModel?.name || 'Gemini 2.0 Flash',
                    hasFiles: filePaths.length > 0,
                    analyzedFilesCount: filePaths.length,
                    processedAt: filePaths.length > 0 ? new Date().toISOString() : undefined
                };

                if (filePaths.length > 0) {
                    libraryData.uploadedFiles = JSON.stringify(filePaths);
                }

                const createLibraryResponse = await fetch('/api/search/library', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
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
                setUploadedFiles([]);
                router.push('/search/' + libId);

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
            if (loading || !userSearchInput) return; // Prevent double submission and require prompt

            // Check if user can generate images based on their plan
            if (!canGenerateImage && !planLoading) {
                const message = userPlan?.limits?.message || 'Daily image generation limit reached. Upgrade to Pro for unlimited generation.';
                toast.error(message);
                return;
            }

            setLoading(true);
            const libId = uuidv4();

            try {
                // First call the API to check limits and generate image
                const selectedRatioData = getModelById(imageGenModel).ratios.find(r => r.value === selectedRatio);
                const providerToUse = getProviderIdByModelId(imageGenModel);

                // Prepare reference image if uploaded
                let referenceImagePath = null;
                if (imageUploadedFiles.length > 0) {
                    referenceImagePath = imageUploadedFiles[0].uploadResult.publicUrl;
                }

                // Immediately redirect to image generation page while API processes in background
                // This provides instant feedback to the user that generation has started
                router.push('/image-gen/' + libId);
                setImageUploadedFiles([]);
                setImageUploadProgress({});
                setImageUploadError('');
                setShowImageUpload(false);

                // Call API to initiate generation without waiting for it to complete
                fetch('/api/generate-image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: userSearchInput,
                        provider: providerToUse,
                        model: imageGenModel,
                        width: selectedRatioData.width,
                        height: selectedRatioData.height,
                        referenceImage: referenceImagePath,
                        libId: libId,
                        userEmail: currentUser?.email || 'anonymous'
                    }),
                }).then(async (generationResponse) => {
                    const apiResult = await generationResponse.json();
                    
                    if (!generationResponse.ok) {
                        if (apiResult.limitExceeded) {
                            toast.error(apiResult.details || 'Daily image generation limit reached.');
                            refreshPlan();
                        } else {
                            toast.error(apiResult.error || `Failed to generate image: ${generationResponse.status}`);
                        }
                    } else {
                        // Refresh plan data to update daily count on successful API call
                        refreshPlan();
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

    return (
        <div className='flex flex-col h-full items-center justify-center mt-60 md:mt-60 px-4 bg-background dark:bg-[oklch(0.2478_0_0)]'>
            <div
                className="relative select-none"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                // onSelectStart={(e) => e.preventDefault()}
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

            {/* ── ChatGPT / Claude-style composer box ── */}
            <div className='w-full max-w-2xl border border-border bg-card dark:bg-[oklch(0.3092_0_0)] rounded-2xl mt-6 md:mt-10'>

                {/* Mode badges — only shown for non-default (non-search) modes */}
                {(searchType === 'research' || searchType === 'code' || isImageGenMode) && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
                        {/* Research badge */}
                        {searchType === 'research' && !isImageGenMode && (
                            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-blue-500/15 text-blue-400">
                                <Atom className="h-3 w-3" />
                                Deep Research
                                <button
                                    onClick={() => setSearchType('search')}
                                    className="ml-1 rounded-full hover:bg-gray-500/10 p-0.5 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                        {/* Website Builder badge */}
                        {searchType === 'code' && !isImageGenMode && (
                            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-400">
                                <Code2 className="h-3 w-3" />
                                Website Builder
                                <button
                                    onClick={() => setSearchType('search')}
                                    className="ml-1 rounded-full hover:bg-white/10 p-0.5 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                        {/* Image Generation badge + inline ratio selector */}
                        {isImageGenMode && (
                            <div className="flex flex-wrap items-center gap-2">
                                {/* <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-purple-500/15 text-purple-400">
                                    <ImagePlus className="h-3 w-3" />
                                    AI Image
                                    <button
                                        onClick={() => setIsImageGenMode(false)}
                                        className="ml-1 rounded-full hover:bg-white/10 p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div> */}
                                {/* Inline aspect ratio buttons */}
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-muted-foreground mr-1">Ratio:</span>
                                    {getModelById(imageGenModel).ratios.map((ratio) => (
                                        <button
                                            key={ratio.value}
                                            onClick={() => setSelectedRatio(ratio.value)}
                                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                                selectedRatio === ratio.value
                                                    ? 'dark:bg-[oklch(0.2478_0_0)] text-white'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-500/60 cursor-pointer'
                                            }`}
                                        >
                                            {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* File attachment badges (regular files) */}
                {!isImageGenMode && uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                        {uploadedFiles.map((fileItem) => (
                            <div key={fileItem.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-foreground dark:text-white">{fileItem.file.name}</span>
                                <span className="text-muted-foreground">{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <button
                                    onClick={() => removeFile(fileItem.id)}
                                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Image attachment badges (image gen mode) */}
                {isImageGenMode && imageUploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                        {imageUploadedFiles.map((fileItem) => (
                            <div key={fileItem.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-foreground dark:text-white">{fileItem.file.name}</span>
                                <span className="text-muted-foreground">{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <button
                                    onClick={() => removeImageFile(fileItem.id)}
                                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Textarea */}
                <textarea
                    value={userSearchInput || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        setUserSearchInput(value);
                        if (value.toLowerCase().trim() === 'admin') {
                            openAdminLogin();
                            setUserSearchInput('');
                        }
                    }}
                    placeholder={
                        isImageGenMode
                            ? 'Describe the image you want to generate...'
                            : searchType === 'research'
                                ? 'What do you want to research deeply?'
                                : searchType === 'code'
                                    ? 'Describe the website you want to generate...'
                                    : 'Ask anything...'
                    }
                    className='w-full resize-none bg-transparent px-4 pt-4 pb-2 outline-none min-h-11 text-sm md:text-base leading-relaxed scrollbar-hide overflow-hidden text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300'
                    rows={1}
                    style={{ overflow: 'hidden' }}
                    onInput={handleInput}
                    disabled={!isImageGenMode && searchType === 'research' && !isPro && researchUsage.monthlyLimit !== -1 && researchUsage.remaining === 0}
                />

                {/* Research limit hint */}
                {!isImageGenMode && searchType === 'research' && !isPro && researchUsage.monthlyLimit !== -1 && (
                    <div className="px-4 pb-1 text-xs text-muted-foreground dark:text-gray-300">
                        {researchUsage.remaining > 0
                            ? `${researchUsage.remaining} Research uses remaining this month`
                            : 'Monthly Research limit reached. Upgrade to Pro for unlimited Research.'}
                    </div>
                )}

                {/* ── Bottom toolbar ── */}
                <div className="flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-1">

                        {/* Plus menu */}
                        <div ref={plusMenuRef} className="relative">
                            <button
                                onClick={() => setShowPlusMenu(!showPlusMenu)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                                    showPlusMenu
                                        ? 'bg-foreground/15 text-foreground rotate-45'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-gray-500/60 cursor-pointer'
                                }`}
                                title="More options"
                            >
                                <Plus className="h-5 w-5" />
                            </button>

                            {showPlusMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-border/50 dark:border-gray-600 bg-card dark:bg-[oklch(0.2478_0_0)] p-1.5 shadow-lg z-50">
                                    {/* Attach Files */}
                                    <button
                                        onClick={() => {
                                            if (isImageGenMode) setShowImageUpload(!showImageUpload);
                                            else setShowFileUpload(!showFileUpload);
                                            setShowPlusMenu(false);
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                        Attach Files
                                    </button>
                                    {/* Research — hidden in image mode */}
                                    {!isImageGenMode && (
                                        <button
                                            onClick={() => {
                                                if (!isPro && researchUsage.monthlyLimit !== -1 && researchUsage.remaining === 0) {
                                                    toast.error('Monthly Research limit reached. Upgrade to Pro for unlimited Research.');
                                                    setShowPlusMenu(false);
                                                    return;
                                                }
                                                setSearchType(searchType === 'research' ? 'search' : 'research');
                                                if (currentUser?.email) fetchResearchUsage();
                                                setShowPlusMenu(false);
                                            }}
                                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                searchType === 'research'
                                                    ? 'bg-blue-500/15 text-blue-400'
                                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                            }`}
                                        >
                                            <Atom className="h-4 w-4" />
                                            Deep Research
                                            {!isPro && researchUsage.monthlyLimit !== -1 && (
                                                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {Math.max(0, researchUsage.remaining)}/{researchUsage.monthlyLimit}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {/* Website Builder — hidden in image mode */}
                                    {!isImageGenMode && (
                                        <button
                                            onClick={() => {
                                                setSearchType(searchType === 'code' ? 'search' : 'code');
                                                setShowPlusMenu(false);
                                            }}
                                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                searchType === 'code'
                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                            }`}
                                        >
                                            <Code2 className="h-4 w-4" />
                                            Website Builder
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Create Image toggle */}
                        {searchType !== 'code' && (
                            <button
                                onClick={() => setIsImageGenMode(!isImageGenMode)}
                                className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                                    isImageGenMode
                                        ? 'bg-purple-500/15 text-purple-400'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-gray-500/60 cursor-pointer'
                                }`}
                                title="Create AI Image"
                            >
                                <ImagePlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Create Image</span>
                            </button>
                        )}

                        <div className="mx-1 h-4 w-px bg-border/30" />

                        {/* AI Model dropdown (Search/Research mode) */}
                        {!isImageGenMode && searchType !== 'code' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-500/60 transition-colors cursor-pointer border-0 bg-transparent outline-none">
                                    <Cpu className="h-4 w-4" />
                                    <span className="hidden sm:inline">{selectedModel?.name || 'Model'}</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dark:bg-[oklch(0.2478_0_0)] dark:border-gray-600 w-64 max-h-80 overflow-hidden">
                                    <DropdownMenuLabel className="dark:text-white font-medium sticky top-0 bg-inherit z-10">
                                        AI Models
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="dark:border-gray-600 sticky top-8 bg-inherit z-10" />
                                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                        {AIModelsOption.map((model, index) => {
                                            const isAccessible = model.modelApi === 'auto' || isPro || !model.isPro;
                                            const requiresUpgrade = model.isPro && !isPro;
                                            return (
                                                <DropdownMenuItem
                                                    key={index}
                                                    className={`dark:text-white dark:hover:bg-[oklch(0.3092_0_0)] ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${selectedModel.id === model.id ? 'bg-accent dark:bg-[oklch(0.3092_0_0)]' : ''}`}
                                                    onClick={() => isAccessible && updateSelectedModel(model.id)}
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
                                                        <p className='text-xs text-gray-500 dark:text-gray-300 mt-1'>
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
                        )}
                        {/* Image Model dropdown */}
                        {isImageGenMode && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-500/60 transition-colors cursor-pointer border-0 bg-transparent outline-none">
                                    <Cpu className="h-4 w-4" />
                                    <span className="hidden sm:inline">{IMAGE_MODELS.find(m => m.id === imageGenModel)?.name || 'Model'}</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="dark:bg-[oklch(0.2478_0_0)] dark:border-gray-600 w-64 max-h-80 overflow-hidden">
                                    <DropdownMenuLabel className="dark:text-white font-medium sticky top-0 bg-inherit z-10">
                                        Image Models
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="dark:border-gray-600 sticky top-8 bg-inherit z-10" />
                                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                        {IMAGE_MODELS.map((model, index) => (
                                            <DropdownMenuItem
                                                key={index}
                                                className={`dark:text-white dark:hover:bg-[oklch(0.3092_0_0)] cursor-pointer ${imageGenModel === model.id ? 'bg-accent dark:bg-[oklch(0.3092_0_0)]' : ''}`}
                                                onClick={() => setImageGenModel(model.id)}
                                            >
                                                <div className='w-full'>
                                                    <div className='flex items-center justify-between'>
                                                        <h2 className='text-sm dark:text-white font-medium'>{model.name}</h2>
                                                        {imageGenModel === model.id && (
                                                            <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                                                        )}
                                                    </div>
                                                    <p className='text-xs text-gray-500 dark:text-gray-300 mt-1'>{model.desc}</p>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <div className="mx-1 h-4 w-px bg-border/30" />

                        {/* Mic button */}
                        <button
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                isListening
                                    ? 'bg-red-100 text-red-500 dark:bg-red-900'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-500/60 cursor-pointer'
                            }`}
                            onClick={toggleSpeechRecognition}
                            title={isListening ? 'Stop listening' : 'Start voice input'}
                        >
                            {isListening
                                ? <MicOff className="h-4.5 w-4.5 animate-pulse" />
                                : <Mic className="h-4.5 w-4.5" />
                            }
                        </button>
                    </div>

                    {/* Send / Voice button */}
                    <button
                        onClick={() => {
                            const hasInput = isImageGenMode
                                ? userSearchInput
                                : (userSearchInput || uploadedFiles.length > 0);
                            if (!hasInput && !loading) {
                                router.push('/voice-ai');
                                return;
                            }
                            if (loading) return;
                            if (isImageGenMode) {
                                if (userSearchInput) onImageGeneration();
                            } else {
                                if (userSearchInput || uploadedFiles.length > 0) onSearchQuery();
                            }
                        }}
                        disabled={loading || (isImageGenMode && !canGenerateImage && !planLoading)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                            (isImageGenMode ? userSearchInput : (userSearchInput || uploadedFiles.length > 0))
                                ? 'bg-foreground text-background hover:opacity-80'
                                : 'text-muted-foreground cursor-pointer'
                        }`}
                        title={
                            isImageGenMode && !canGenerateImage && !planLoading
                                ? (userPlan?.limits?.message || 'Daily limit reached')
                                : !(isImageGenMode ? userSearchInput : (userSearchInput || uploadedFiles.length > 0))
                                    ? 'Open Voice AI Assistant'
                                    : undefined
                        }
                    >
                        {loading ? (
                            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (isImageGenMode ? userSearchInput : (userSearchInput || uploadedFiles.length > 0)) ? (
                            <ArrowUp className="h-4 w-4" />
                        ) : (
                            <AudioLines className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Plan Status for Image Generation */}
            {isImageGenMode && !planLoading && userPlan && (
                <div className='w-full max-w-2xl mt-3'>
                    <div className={`p-3 rounded-xl border ${
                        isPro 
                            ? 'bg-linear-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/10 dark:to-orange-900/10 dark:border-yellow-600/30' 
                            : canGenerateImage
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-600/30'
                                : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-600/30'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isPro ? (
                                    <>
                                        <Crown className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                            Pro Plan - Unlimited Images
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className={`w-4 h-4 ${
                                            canGenerateImage ? 'text-green-600' : 'text-red-600'
                                        }`} />
                                        <span className={`text-sm font-medium ${
                                            canGenerateImage 
                                                ? 'text-green-700 dark:text-green-300' 
                                                : 'text-red-700 dark:text-red-300'
                                        }`}>
                                            Free Plan: {remainingImages} images remaining today
                                        </span>
                                    </>
                                )}
                            </div>
                            {!isPro && !canGenerateImage && (
                                <Button 
                                    size="sm"
                                    className="bg-linear-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
                                    onClick={() => router.push('/#pricing')}
                                >
                                    <Crown className="w-3 h-3 mr-1" />
                                    Upgrade
                                </Button>
                            )}
                        </div>
                        {!isPro && canGenerateImage && (
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${(remainingImages / (userPlan?.limits?.dailyLimit || 10)) * 100}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* File Upload Section */}
            {showFileUpload && !isImageGenMode && (
                <div className='w-full max-w-2xl mt-4'>
                    <div className='p-4 border border-border bg-card dark:bg-[oklch(0.3092_0_0)] rounded-2xl'>
                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                                    ? isDragAccept
                                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                        : 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                            <p className="text-sm font-medium text-foreground dark:text-white mb-1">
                                {isDragActive ? 'Drop files here...' : 'Drop files or click to browse'}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                Supports PDF, DOCX, TXT, CSV, JPG, PNG (max 10MB each)
                            </p>
                        </div>

                        {/* File Upload Error */}
                        {fileUploadError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">{fileUploadError}</p>
                            </div>
                        )}

                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-foreground dark:text-white mb-3">
                                    Uploaded Files ({uploadedFiles.length})
                                </h4>
                                <div className="space-y-2">
                                    {uploadedFiles.map((fileItem) => (
                                        <div
                                            key={fileItem.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                {getFileIcon(fileItem.file)}
                                                <div>
                                                    <p className="text-sm font-medium text-foreground dark:text-white">
                                                        {fileItem.file.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(fileItem.id)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                            >
                                                <X className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Progress */}
                        {Object.keys(uploadProgress).length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-foreground dark:text-white mb-3">
                                    Uploading...
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(uploadProgress).map(([fileId, progress]) => (
                                        <div key={fileId} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground dark:text-gray-400">Uploading file...</span>
                                                <span className="text-muted-foreground dark:text-gray-400">{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Upload Section for Image Generation */}
            {showImageUpload && isImageGenMode && (
                <div className='w-full max-w-2xl mt-4'>
                    <div className='p-4 border border-border bg-card dark:bg-[oklch(0.3092_0_0)] rounded-2xl'>
                        {/* Image Dropzone */}
                        <div
                            {...getImageRootProps()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isImageDragActive
                                    ? isImageDragAccept
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                        >
                            <input {...getImageInputProps()} />
                            <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                            <p className="text-sm font-medium text-foreground dark:text-white mb-1">
                                {isImageDragActive ? 'Drop reference image here...' : 'Drop reference image or click to browse'}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                Optional: Upload a reference image for style or composition (JPG, PNG, WebP - max 10MB)
                            </p>
                        </div>

                        {/* Image Upload Error */}
                        {imageUploadError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400">{imageUploadError}</p>
                            </div>
                        )}

                        {/* Uploaded Images List */}
                        {imageUploadedFiles.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-foreground dark:text-white mb-3">
                                    Reference Image
                                </h4>
                                <div className="space-y-2">
                                    {imageUploadedFiles.map((fileItem) => (
                                        <div
                                            key={fileItem.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                                    <img
                                                        src={URL.createObjectURL(fileItem.file)}
                                                        alt="Reference"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground dark:text-white">
                                                        {fileItem.file.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                                                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeImageFile(fileItem.id)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                            >
                                                <X className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image Upload Progress */}
                        {Object.keys(imageUploadProgress).length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-foreground dark:text-white mb-3">
                                    Uploading Image...
                                </h4>
                                <div className="space-y-2">
                                    {Object.entries(imageUploadProgress).map(([fileId, progress]) => (
                                        <div key={fileId} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground dark:text-gray-400">Uploading image...</span>
                                                <span className="text-muted-foreground dark:text-gray-400">{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ChatBoxAiInput
