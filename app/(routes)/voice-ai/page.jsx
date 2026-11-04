'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, AlertCircle } from '@/components/ui/animated-icon'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/app/_components/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { useUser } from '@/contexts/UserContext'
import { getEmotionalVoiceParams, selectEmotionalVoice } from '@/lib/emotionUtils'
import { AudioController } from '@/lib/voice/audio-controller'
import { useVoicePreference } from '@/hooks/useVoicePreference'
import { loadGeneralPreferences, ORB_COLORS } from '@/lib/user-preferences'
import VoiceSelectorModal from '@/components/voice/VoiceSelectorModal'
import StateCircle from './StateCircle'
import './voice-ai.css'

// Utility: Detect if running on mobile device
const isMobileDevice = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Utility: Check if running on HTTPS or localhost
const isSecureContext = () => {
    if (typeof window === 'undefined') return true
    return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function VoiceAIPage() {
    const { currentUser } = useAuth()
    const { memoryEnabled } = useUser()
    const { selectedVoiceId, currentVoice, setVoicePreference } = useVoicePreference()
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

    const [orbColors, setOrbColors] = useState({ from: '#00E6C3', to: '#66FFE5' })

    // Voice states
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [recognition, setRecognition] = useState(null)
    const [synth, setSynth] = useState(null)
    const [currentUtterance, setCurrentUtterance] = useState(null)

    // Conversation states
    const [conversationHistory, setConversationHistory] = useState([])
    const [currentLanguage, setCurrentLanguage] = useState('en')
    const [aiResponse, setAiResponse] = useState('')

    // Emotion states
    const [currentEmotion, setCurrentEmotion] = useState('natural')
    const [emotionIntensity, setEmotionIntensity] = useState(0.5)

    // Mobile & Permission states
    const [isMobile, setIsMobile] = useState(false)
    const [micPermission, setMicPermission] = useState(null)
    const [permissionError, setPermissionError] = useState('')
    const [showPermissionHelp, setShowPermissionHelp] = useState(false)
    const [permissionDenialType, setPermissionDenialType] = useState(null) // 'blocked' | 'service' | 'not_found' | 'generic' | 'insecure_origin'

    const recognitionRef = useRef(null)
    const synthRef = useRef(null)
    const userInteractedRef = useRef(false)
    const micStreamRef = useRef(null)
    const audioLevelRef = useRef(0)
    const audioControllerRef = useRef(null)

    // Detect mobile device on mount
    useEffect(() => {
        setIsMobile(isMobileDevice())

        // Load Orb Color
        const prefs = loadGeneralPreferences()
        const colorOpt = ORB_COLORS.find(c => c.id === prefs.orbColor)
        if (colorOpt) {
            setOrbColors({ from: colorOpt.from, to: colorOpt.to })
        }

        // Check secure context (HTTPS)
        if (!isSecureContext() && isMobileDevice()) {
            setPermissionError('Microphone access requires HTTPS on mobile devices. Please use a secure connection.')
        }
    }, [])

    // Initialize ElevenLabs Client Audio Controller & Level Analyzer
    useEffect(() => {
        audioControllerRef.current = new AudioController({
            onStateChange: (state) => {
                if (state === 'playing') {
                    setIsSpeaking(true)
                    setIsProcessing(false)
                } else if (state === 'idle' || state === 'stopped' || state === 'error') {
                    setIsSpeaking(false)
                    audioLevelRef.current = 0
                } else if (state === 'loading') {
                    setIsProcessing(true)
                }
            },
            onLevelUpdate: (level) => {
                audioLevelRef.current = level
            },
            onError: (err) => {
                console.warn('ElevenLabs AudioController error:', err)
                setIsSpeaking(false)
                setIsProcessing(false)
            }
        })

        return () => {
            if (audioControllerRef.current) {
                audioControllerRef.current.stop()
            }
        }
    }, [])

    // Informational only — NEVER used to block starting recognition.
    // navigator.permissions.query('microphone') is inconsistent across
    // browsers/devices (unsupported in Firefox/older Safari, and on
    // Android it can reflect a blocked OS-level app permission even when
    // the per-site Chrome setting shows "Allow"). Treat it as a hint for
    // the UI only, never as a gatekeeper.
    const checkMicrophonePermission = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setMicPermission('not_supported')
                return 'not_supported'
            }

            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' })
                    setMicPermission(permissionStatus.state)

                    permissionStatus.onchange = () => {
                        setMicPermission(permissionStatus.state)
                        if (permissionStatus.state === 'granted') {
                            setPermissionError('')
                            setShowPermissionHelp(false)
                        }
                    }

                    return permissionStatus.state
                } catch (err) {
                    return 'unknown'
                }
            }

            return 'unknown'
        } catch (error) {
            console.warn('Error checking microphone permission:', error)
            return 'unknown'
        }
    }, [])

    // GROUND-TRUTH check. This is the only thing we trust to decide whether
    // the mic is really accessible — it works identically across Chrome,
    // Safari and Firefox, and (unlike the Permissions API) always reflects
    // reality, including OS-level app permission blocks on mobile.
    // We open the stream just long enough to confirm access, then release
    // it immediately so SpeechRecognition can take over the mic cleanly.
    const verifyMicrophoneAccess = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { ok: false, reason: 'not_supported' }
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop())
            return { ok: true }
        } catch (err) {
            return { ok: false, reason: err?.name || 'unknown', message: err?.message }
        }
    }, [])

    useEffect(() => {
        checkMicrophonePermission()
    }, [checkMicrophonePermission])

    // Initialize speech recognition and synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

            if (SpeechRecognition) {
                try {
                    const recognitionInstance = new SpeechRecognition()
                    // Mobile-friendly settings - continuous: false works better on mobile
                    recognitionInstance.continuous = false
                    recognitionInstance.interimResults = true
                    recognitionInstance.lang = 'en-US'
                    recognitionInstance.maxAlternatives = 1

                    let finalTranscript = ''

                    recognitionInstance.onresult = (event) => {
                        let interimTranscript = ''

                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript + ' '
                            } else {
                                interimTranscript += transcript
                            }
                        }

                        // No need to display transcript in minimal design
                    }

                    recognitionInstance.onstart = () => {
                        finalTranscript = ''
                        setIsListening(true)
                        // A successful start is itself proof the mic works — clear any stale banner.
                        setPermissionError('')
                        setShowPermissionHelp(false)
                        setPermissionDenialType(null)
                    }

                    recognitionInstance.onend = () => {
                        setIsListening(false)

                        if (finalTranscript.trim()) {
                            handleUserQuery(finalTranscript.trim())
                        }
                    }

                    recognitionInstance.onerror = async (event) => {
                        setIsListening(false)

                        if (event.error === 'not-allowed') {
                            // The Web Speech API (webkitSpeechRecognition) requires an
                            // actual HTTPS origin — unlike getUserMedia, Chrome does NOT
                            // exempt http://localhost for this API, because recognition
                            // audio is sent to Google's servers for processing. If we're
                            // not on https, this is ALWAYS the real cause of "not-allowed",
                            // no matter what the mic permission toggle shows — so check
                            // this first instead of accusing the user of a blocked mic.
                            if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
                                setPermissionError('Voice input needs a secure (HTTPS) connection to work — this is a browser requirement for the Web Speech API, not a mic permission problem.')
                                setShowPermissionHelp(false)
                                setPermissionDenialType('insecure_origin')
                                console.warn('SpeechRecognition not-allowed on insecure origin:', window.location.protocol, window.location.hostname)
                                return
                            }

                            // Verify against reality instead of trusting a possibly stale
                            // Permissions API read. This is the fix: we no longer take the
                            // browser's word for it — we actually try to open the mic.
                            const result = await verifyMicrophoneAccess()

                            if (result.ok) {
                                // Mic genuinely works — this was a one-off/transient failure
                                // (e.g. recognition started a beat too early). Say nothing scary.
                                setPermissionError('')
                                setShowPermissionHelp(false)
                                setPermissionDenialType(null)
                                console.warn('Transient not-allowed error suppressed — getUserMedia confirms mic access works.')
                            } else if (result.reason === 'NotFoundError' || result.reason === 'DevicesNotFoundError') {
                                setPermissionError('No microphone was found on this device.')
                                setShowPermissionHelp(false)
                                setPermissionDenialType('not_found')
                            } else {
                                // Genuinely blocked — could be site-level OR the device/app-level
                                // permission (very common on Android). Show both fixes.
                                setMicPermission('denied')
                                setPermissionError('Microphone access is blocked for this site.')
                                setShowPermissionHelp(true)
                                setPermissionDenialType('blocked')
                            }
                        } else if (event.error === 'service-not-allowed') {
                            // This is a speech-SERVICE error (network/quota/policy), not a mic
                            // permission problem — don't tell the user their mic is blocked.
                            setPermissionError('The speech recognition service is unavailable right now. Check your internet connection and try again.')
                            setShowPermissionHelp(false)
                            setPermissionDenialType('service')
                        } else if (event.error === 'audio-capture') {
                            setPermissionError('Unable to capture audio. Please close other apps using the microphone.')
                            setPermissionDenialType('generic')
                        } else if (event.error === 'network') {
                            setPermissionError('Network error. Please check your internet connection.')
                            setPermissionDenialType('generic')
                        } else if (
                            event.error === 'no-speech' ||
                            event.error === 'aborted'
                        ) {
                            // Silent — user just didn't speak or recognition was stopped
                            console.log('Speech recognition ended silently:', event.error)
                        } else {
                            console.error('Speech recognition error:', event.error)
                        }
                    }

                    setRecognition(recognitionInstance)
                    recognitionRef.current = recognitionInstance
                } catch (error) {
                    console.error('Failed to initialize speech recognition:', error)
                }
            } else if (isMobileDevice()) {
                setPermissionError('This mobile browser does not fully support voice recognition. Please use latest Chrome or Safari.')
            }

            if ('speechSynthesis' in window) {
                const synthInstance = window.speechSynthesis
                setSynth(synthInstance)
                synthRef.current = synthInstance

                // Load voices immediately (important for mobile)
                const loadVoices = () => {
                    try {
                        const voices = synthInstance.getVoices()
                        if (voices.length === 0) {
                            // Some browsers load voices asynchronously
                            synthInstance.addEventListener('voiceschanged', () => {
                                const loadedVoices = synthInstance.getVoices()
                                // console.log('Voices loaded:', loadedVoices.length)
                            }, { once: true })
                        }
                    } catch (error) {
                        console.warn('Error loading voices:', error)
                    }
                }

                // Try to load voices immediately
                loadVoices()

                // Also try after a short delay (for browsers that load voices asynchronously)
                setTimeout(loadVoices, 100)

                const handleUserInteraction = () => {
                    userInteractedRef.current = true
                    loadVoices() // Load voices on first interaction
                    document.removeEventListener('click', handleUserInteraction)
                    document.removeEventListener('touchstart', handleUserInteraction)
                }
                document.addEventListener('click', handleUserInteraction)
                document.addEventListener('touchstart', handleUserInteraction)
            }
        }

        return () => {
            if (recognitionRef.current && isListening) {
                recognitionRef.current.stop()
            }
            if (synthRef.current && isSpeaking) {
                synthRef.current.cancel()
            }
        }
    }, [])

    const startRecognitionSession = useCallback(() => {
        if (!recognition) {
            return false
        }

        try {
            recognition.lang = getLanguageCode(currentLanguage)
            recognition.start()
            return true
        } catch (error) {
            console.error('Speech recognition start error:', error)
            return false
        }
    }, [recognition, currentLanguage])

    // Language detection helper
    const detectLanguage = (text) => {
        if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'
        if (/[\u0600-\u06ff]/.test(text)) return 'ar'
        if (/[\u0900-\u097f]/.test(text)) return 'hi'
        if (/\b(qu[ií][eé]n|t[uú]|es|de|la|el)\b/i.test(text)) return 'es'
        if (/\b(qui|tu|est|de|la|le)\b/i.test(text)) return 'fr'
        if (/\b(wer|du|ist|der|die)\b/i.test(text)) return 'de'
        if (/\b(chi|tu|è|di|la|il)\b/i.test(text)) return 'it'
        if (/\b(quem|você|é|de|a|o)\b/i.test(text)) return 'pt'
        return 'en'
    }

    const getLanguageCode = (lang) => {
        const languageMap = {
            'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
            'it': 'it-IT', 'pt': 'pt-BR', 'zh': 'zh-CN', 'ja': 'ja-JP',
            'ar': 'ar-SA', 'hi': 'hi-IN'
        }
        return languageMap[lang] || 'en-US'
    }

    const getSpeechLanguageCode = (lang) => {
        const languageMap = {
            'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
            'it': 'it-IT', 'pt': 'pt-BR', 'zh': 'zh-CN', 'ja': 'ja-JP',
            'ar': 'ar-SA', 'hi': 'hi-IN'
        }
        return languageMap[lang] || 'en-US'
    }

    const handleUserQuery = async (query) => {
        if (!query || !query.trim()) return

        const detectedLanguage = detectLanguage(query)
        setCurrentLanguage(detectedLanguage)

        const newHistory = [
            ...conversationHistory,
            { role: 'user', content: query, language: detectedLanguage }
        ]
        setConversationHistory(newHistory)

        setIsProcessing(true)
        setAiResponse('')
        setCurrentEmotion('natural')

        try {
            const response = await authFetch('/api/voice-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    language: detectedLanguage,
                    conversationHistory: newHistory.slice(-5),
                    memoryEnabled
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to get AI response')
            }

            const data = await response.json()
            const aiReply = data.response || 'I apologize, but I couldn\'t process that request.'
            const responseLanguage = data.language || detectedLanguage
            const emotion = data.emotion || 'natural'
            const emotionLevel = data.emotionIntensity || 0.5

            // Store emotion for voice synthesis
            setCurrentEmotion(emotion)
            setEmotionIntensity(emotionLevel)

            setAiResponse(aiReply)
            setCurrentLanguage(responseLanguage)

            const updatedHistory = [
                ...newHistory,
                { role: 'assistant', content: aiReply, language: responseLanguage }
            ]
            setConversationHistory(updatedHistory)

            // Mark that we have user interaction (from the voice recognition)
            userInteractedRef.current = true

            // For mobile, ensure speech is triggered in the right context
            // Use emotionalText if available (text with natural pauses)
            const textToSpeak = data.emotionalText || aiReply
            setTimeout(() => {
                speakResponse(textToSpeak, responseLanguage, emotion, emotionLevel)
            }, 100)

        } catch (error) {
            console.error('Error processing voice query:', error)
            const errorMessage = 'Sorry, I encountered an error. Please try again.'
            setAiResponse(errorMessage)
            setCurrentEmotion('sad')
            setEmotionIntensity(0.4)

            userInteractedRef.current = true
            setTimeout(() => {
                speakResponse(errorMessage, currentLanguage, 'sad', 0.4)
            }, 100)
        } finally {
            setIsProcessing(false)
        }
    }

    const fallbackSpeak = useCallback((text, language, emotion = 'natural', emotionLevel = 0.5) => {
        const speechSynth = synth || (typeof window !== 'undefined' && window.speechSynthesis)
        if (!speechSynth) return

        speechSynth.cancel()
        const speakWithVoice = () => {
            try {
                const utterance = new SpeechSynthesisUtterance(text)
                const langCode = getSpeechLanguageCode(language)
                utterance.lang = langCode

                const emotionalParams = getEmotionalVoiceParams(emotion, emotionLevel)
                utterance.rate = emotionalParams.rate
                utterance.pitch = emotionalParams.pitch
                utterance.volume = emotionalParams.volume

                try {
                    const voices = speechSynth.getVoices()
                    if (voices.length > 0) {
                        const selectedVoice = selectEmotionalVoice(langCode, emotion, voices)
                        if (selectedVoice) {
                            utterance.voice = selectedVoice
                        } else {
                            const matchingVoice = voices.find(voice =>
                                voice.lang.startsWith(langCode.split('-')[0]) ||
                                voice.lang === langCode
                            )
                            if (matchingVoice) {
                                utterance.voice = matchingVoice
                            } else if (voices.length > 0) {
                                utterance.voice = voices[0]
                            }
                        }
                    }
                } catch (voiceError) {
                    console.warn('Could not select voice, using default:', voiceError)
                }

                utterance.onstart = () => setIsSpeaking(true)
                utterance.onend = () => {
                    setIsSpeaking(false)
                    setCurrentUtterance(null)
                }
                utterance.onerror = () => {
                    setIsSpeaking(false)
                    setCurrentUtterance(null)
                }

                setCurrentUtterance(utterance)
                speechSynth.speak(utterance)
            } catch (error) {
                console.error('Fallback speak error:', error)
                setIsSpeaking(false)
            }
        }

        const voices = speechSynth.getVoices()
        if (voices.length === 0) {
            const voicesChangedHandler = () => {
                speechSynth.removeEventListener('voiceschanged', voicesChangedHandler)
                speakWithVoice()
            }
            speechSynth.addEventListener('voiceschanged', voicesChangedHandler)
            setTimeout(() => {
                speechSynth.removeEventListener('voiceschanged', voicesChangedHandler)
                speakWithVoice()
            }, 500)
        } else {
            speakWithVoice()
        }
    }, [synth])

    const speakResponse = useCallback(async (text, language, emotion = 'natural', emotionLevel = 0.5) => {
        if (!text || !text.trim()) return

        // Stop any active ElevenLabs audio controller playback & browser speech
        if (audioControllerRef.current) {
            audioControllerRef.current.stop()
        }
        const speechSynth = synth || (typeof window !== 'undefined' && window.speechSynthesis)
        if (speechSynth) {
            speechSynth.cancel()
        }

        // Try ElevenLabs audio controller with user-selected voice
        if (audioControllerRef.current) {
            let authHeader = undefined
            if (currentUser) {
                try {
                    const token = await currentUser.getIdToken?.()
                    if (token) authHeader = `Bearer ${token}`
                } catch (_) {}
            }

            audioControllerRef.current.playText(text, selectedVoiceId, authHeader).catch((err) => {
                console.warn('ElevenLabs playText failed, falling back to browser TTS:', err)
                fallbackSpeak(text, language, emotion, emotionLevel)
            })
            return
        }

        fallbackSpeak(text, language, emotion, emotionLevel)
    }, [synth, fallbackSpeak, selectedVoiceId, currentUser])

    const toggleListening = useCallback(async () => {
        if (!recognition) {
            setPermissionError('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.')
            return
        }

        if (isListening) {
            try {
                recognition.stop()
            } catch (e) { }
            setIsListening(false)
            setPermissionError('')
            setShowPermissionHelp(false)
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop())
                micStreamRef.current = null
            }
            return
        }

        // Stop any ongoing speech
        if (audioControllerRef.current) {
            audioControllerRef.current.stop()
        }
        if (isSpeaking && synth) {
            synth.cancel()
            setIsSpeaking(false)
        }

        // Always clear previous banners before trying to start
        setPermissionError('')
        setShowPermissionHelp(false)
        setPermissionDenialType(null)

        if (startRecognitionSession()) {
            return
        }

        setPermissionError('Could not start voice capture. Please tap the mic button again.')
    }, [
        recognition,
        isListening,
        isSpeaking,
        synth,
        startRecognitionSession,
    ])

    const handleRetryPermission = useCallback(async () => {
        setPermissionError('')
        setShowPermissionHelp(false)
        setPermissionDenialType(null)
        const result = await verifyMicrophoneAccess()
        if (result.ok) {
            startRecognitionSession()
        } else {
            setPermissionError('Microphone access is still blocked for this site.')
            setShowPermissionHelp(true)
            setPermissionDenialType('blocked')
        }
    }, [verifyMicrophoneAccess, startRecognitionSession])

    const stopSpeaking = () => {
        if (audioControllerRef.current) {
            audioControllerRef.current.stop()
        }
        const speechSynth = synth || (typeof window !== 'undefined' && window.speechSynthesis)
        if (speechSynth && isSpeaking) {
            speechSynth.cancel()
            setIsSpeaking(false)
        }
        setIsSpeaking(false)
        audioLevelRef.current = 0
    }


    return (
        <AuthGuard>
            <div className="flex-1 flex flex-col w-full text-foreground relative overflow-hidden bg-background min-h-[calc(100vh-8rem)]">

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col justify-between w-full">

                    {/* Error Message Banner */}
                    {permissionError && (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4 mb-6 sm:mb-8">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm text-red-200 font-medium">{permissionError}</p>
                                    {permissionDenialType === 'insecure_origin' && (
                                        <div className="text-xs text-red-300/80 space-y-1 pl-2 border-l-2 border-red-500/30">
                                            <p>• This will work fine on your deployed HTTPS site (e.g. your production domain)</p>
                                            <p>• For local testing, run a local HTTPS tunnel (e.g. <code>ngrok http 3000</code>) or start Next.js with <code>next dev --experimental-https</code></p>
                                        </div>
                                    )}
                                    {showPermissionHelp && (
                                        <div className="text-xs text-red-300/80 space-y-2 pl-2 border-l-2 border-red-500/30">
                                            <div>
                                                <p className="font-semibold">1. Check the site permission:</p>
                                                {isMobile ? (
                                                    <>
                                                        <p>• <strong>Android Chrome:</strong> tap the lock icon in the address bar → Permissions → Microphone → Allow</p>
                                                        <p>• <strong>iOS Safari:</strong> Settings app → Safari → Camera & Microphone → Allow</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p>• Click the microphone/lock icon in your browser's address bar</p>
                                                        <p>• Select "Always allow" for this site</p>
                                                    </>
                                                )}
                                            </div>
                                            {isMobile && (
                                                <div>
                                                    <p className="font-semibold">2. Also check the device-level permission (the most common cause on phones):</p>
                                                    <p>• <strong>Android:</strong> Settings → Apps → Chrome (or your browser) → Permissions → Microphone → Allow</p>
                                                    <p>• <strong>iPhone:</strong> Settings → [Browser app] → Microphone → toggle on</p>
                                                    <p>Even when the site itself shows "Allowed", the browser app can still be blocked at the phone's OS level — that overrides the site setting.</p>
                                                </div>
                                            )}
                                            <p>• Refresh this page after changing anything</p>
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        {showPermissionHelp && (
                                            <Button
                                                onClick={handleRetryPermission}
                                                size="sm"
                                                variant="outline"
                                                className="text-xs border-red-400/40 text-red-200 hover:bg-red-500/20"
                                            >
                                                Try Again
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => {
                                                setPermissionError('')
                                                setShowPermissionHelp(false)
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs border-red-400/40 text-red-200 hover:bg-red-500/20"
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content - Centered */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8">
                        <div className="flex items-center justify-center w-full">
                            <StateCircle
                                isListening={isListening}
                                isSpeaking={isSpeaking}
                                isProcessing={isProcessing}
                                levelRef={audioLevelRef}
                                onClick={toggleListening}
                                colorFrom={orbColors.from}
                                colorTo={orbColors.to}
                            />
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-auto pb-2 sm:pb-4">
                        <button
                            onClick={() => setIsVoiceModalOpen(true)}
                            className="flex items-center gap-2 h-11 sm:h-12 px-4 sm:px-5 rounded-full bg-accent/40 hover:bg-accent border border-border/60 text-xs sm:text-sm font-medium text-foreground transition-all backdrop-blur-sm cursor-pointer shadow-sm hover:border-primary/50"
                            title="Change Assistant Voice"
                        >
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="hidden sm:inline-block">Voice: </span>
                            <strong className="text-primary font-semibold">{currentVoice.name}</strong>
                        </button>

                        <Button
                            onClick={toggleListening}
                            disabled={isProcessing || isSpeaking}
                            aria-label={isListening ? 'Stop listening' : 'Start listening'}
                            title={isListening ? 'Stop listening' : 'Start listening'}
                            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0 cursor-pointer transition-all duration-300 border ${isListening
                                    ? 'bg-rose-500/90 hover:bg-rose-600/90 text-white border-rose-400/40 shadow-lg shadow-rose-500/35'
                                    : 'bg-indigo-500/90 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-lg shadow-indigo-500/25'
                                }`}
                        >
                            {isListening ? (
                                <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                        </Button>

                        <Button
                            onClick={stopSpeaking}
                            disabled={!isSpeaking}
                            aria-label="Stop speaking"
                            title="Stop speaking"
                            variant="outline"
                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0 border-border text-foreground hover:bg-accent hover:text-accent-foreground backdrop-blur-sm transition-all duration-200"
                        >
                            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>

                        <Button
                            onClick={() => {
                                userInteractedRef.current = true
                                if (aiResponse) {
                                    speakResponse(aiResponse, currentLanguage, currentEmotion, emotionIntensity)
                                }
                            }}
                            disabled={!aiResponse || isSpeaking || isListening || isProcessing}
                            aria-label="Play response"
                            title="Play response"
                            variant="outline"
                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full p-0 border-indigo-500/40 text-foreground hover:bg-indigo-500/20 backdrop-blur-sm transition-all duration-200"
                        >
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </div>
                </div>

                {/* 5-Voice Selector Modal */}
                <VoiceSelectorModal
                    isOpen={isVoiceModalOpen}
                    onClose={() => setIsVoiceModalOpen(false)}
                    selectedVoiceId={selectedVoiceId}
                    onSelectVoice={(id) => {
                        setVoicePreference(id)
                        setIsVoiceModalOpen(false)
                    }}
                />
            </div>
        </AuthGuard>
    )
}

export default VoiceAIPage
