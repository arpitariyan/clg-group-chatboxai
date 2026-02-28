'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, AlertCircle } from 'lucide-react'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/app/_components/AuthGuard'
import { getEmotionalVoiceParams, selectEmotionalVoice, getEmotionalAnimation } from '@/lib/emotionUtils'

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

const VoiceOrb = ({
    intensity = 1.2,
    volume = 0,
    stateLabel,
    onToggle,
}) => {
    const containerRef = useRef(null)
    const rendererRef = useRef(null)
    const sceneRef = useRef(null)
    const groupRef = useRef(null)
    const cameraRef = useRef(null)
    const ballRef = useRef(null)
    const frameRef = useRef(null)
    const noise3D = useRef(createNoise3D()).current
    const volumeRef = useRef(volume)
    const intensityRef = useRef(intensity)

    useEffect(() => {
        volumeRef.current = volume
    }, [volume])

    useEffect(() => {
        intensityRef.current = intensity
    }, [intensity])

    useEffect(() => {
        if (!containerRef.current) return

        const scene = new THREE.Scene()
        const group = new THREE.Group()
        const camera = new THREE.PerspectiveCamera(18, 1, 1, 120)
        camera.position.set(0, 0, 80)
        camera.lookAt(scene.position)

        scene.add(camera)
        sceneRef.current = scene
        groupRef.current = group
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1)

        if (containerRef.current) {
            const { clientWidth } = containerRef.current
            renderer.setSize(clientWidth, clientWidth)
            containerRef.current.innerHTML = ''
            containerRef.current.appendChild(renderer.domElement)
            renderer.domElement.style.width = '100%'
            renderer.domElement.style.height = '100%'
            renderer.domElement.style.objectFit = 'contain'
        }

        rendererRef.current = renderer

        const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 8)
        const lambertMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, wireframe: true })

        const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial)
        ball.position.set(0, 0, 0)
        ballRef.current = ball
        group.add(ball)

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const spotLight = new THREE.SpotLight(0xffffff)
        spotLight.intensity = 1
        spotLight.position.set(-12, 36, 18)
        spotLight.lookAt(ball.position)
        spotLight.castShadow = true
        scene.add(spotLight)

        scene.add(group)

        const render = () => {
            if (!groupRef.current || !ballRef.current || !cameraRef.current || !rendererRef.current || !sceneRef.current) {
                return
            }

            groupRef.current.rotation.y += 0.005
            updateBallMorph(ballRef.current, Math.max(volumeRef.current, 0.05))

            rendererRef.current.render(sceneRef.current, cameraRef.current)
            frameRef.current = requestAnimationFrame(render)
        }

        render()

        const onWindowResize = () => {
            if (!cameraRef.current || !rendererRef.current || !containerRef.current) return
            const width = containerRef.current.clientWidth
            rendererRef.current.setSize(width, width)
            cameraRef.current.aspect = 1
            cameraRef.current.updateProjectionMatrix()
        }

        window.addEventListener('resize', onWindowResize)

        return () => {
            window.removeEventListener('resize', onWindowResize)
            if (frameRef.current) cancelAnimationFrame(frameRef.current)
            if (rendererRef.current) {
                rendererRef.current.dispose()
            }
            if (ballRef.current) {
                ballRef.current.geometry.dispose()
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
            }
        }
    }, [])

    const updateBallMorph = (mesh, volumeValue) => {
        const geometry = mesh.geometry
        const positionAttribute = geometry.getAttribute('position')

        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i),
            )

            const offset = 10
            const amp = 2.6
            const time = typeof window !== 'undefined' ? window.performance.now() : 0
            vertex.normalize()
            const rf = 0.00001
            const currentIntensity = intensityRef.current
            const distance =
                offset +
                volumeValue * 4 * currentIntensity +
                noise3D(
                    vertex.x + time * rf * 7,
                    vertex.y + time * rf * 8,
                    vertex.z + time * rf * 9,
                ) *
                    amp *
                    volumeValue *
                    currentIntensity
            vertex.multiplyScalar(distance)

            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
        }

        positionAttribute.needsUpdate = true
        geometry.computeVertexNormals()
    }

    return (
        <div className="relative w-full">
            <div
                ref={containerRef}
                className="aspect-square w-full max-w-[420px] mx-auto rounded-3xl border border-white/10 bg-linear-to-b cursor-pointer"
                onClick={onToggle}
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
                <div className="rounded-full bg-white/10 text-xs uppercase tracking-[0.2em] px-4 py-2 text-white/80 backdrop-blur">
                    {stateLabel}
                </div>
            </div>
        </div>
    )
}

function VoiceAIPage() {
    const router = useRouter()
    
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
    const [userTranscript, setUserTranscript] = useState('')
    const [aiResponse, setAiResponse] = useState('')
    
    // Emotion states
    const [currentEmotion, setCurrentEmotion] = useState('natural')
    const [emotionIntensity, setEmotionIntensity] = useState(0.5)
    
    // Animation states
    const [audioLevel, setAudioLevel] = useState(0)
    const [orbIntensity, setOrbIntensity] = useState(1.2)
    const [orbVolume, setOrbVolume] = useState(0.05)
    const [orbColor, setOrbColor] = useState('rgb(255, 255, 255)')
    
    // Mobile & Permission states
    const [isMobile, setIsMobile] = useState(false)
    const [micPermission, setMicPermission] = useState(null) // null = unknown, 'granted', 'denied', 'prompt'
    const [permissionError, setPermissionError] = useState('')
    const [showPermissionHelp, setShowPermissionHelp] = useState(false)
    
    const recognitionRef = useRef(null)
    const synthRef = useRef(null)
    const audioLevelInterval = useRef(null)
    const userInteractedRef = useRef(false)
    const micStreamRef = useRef(null)
    
    // Detect mobile device on mount
    useEffect(() => {
        setIsMobile(isMobileDevice())
        
        // Check secure context (HTTPS)
        if (!isSecureContext() && isMobileDevice()) {
            setPermissionError('Microphone access requires HTTPS on mobile devices. Please use a secure connection.')
        }
    }, [])
    
    // Check microphone permission status
    const checkMicrophonePermission = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setMicPermission('not_supported')
                setPermissionError('Microphone is not supported on this device/browser.')
                return 'not_supported'
            }
            
            // Try to check permission status (not supported on all browsers)
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' })
                    setMicPermission(permissionStatus.state)
                    
                    // Listen for permission changes
                    permissionStatus.onchange = () => {
                        setMicPermission(permissionStatus.state)
                    }
                    
                    return permissionStatus.state
                } catch (err) {
                    // Permission API might not support microphone query
                    return 'unknown'
                }
            }
            
            return 'unknown'
        } catch (error) {
            console.warn('Error checking microphone permission:', error)
            return 'unknown'
        }
    }, [])
    
    // Request microphone permission explicitly
    const requestMicrophonePermission = useCallback(async () => {
        try {
            setPermissionError('')
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Microphone is not supported on this browser.')
            }
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            })
            
            // Store stream reference
            micStreamRef.current = stream
            setMicPermission('granted')
            setShowPermissionHelp(false)
            
            return true
        } catch (error) {
            console.error('Microphone permission error:', error)
            setMicPermission('denied')
            
            // Provide helpful error messages
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setPermissionError('Microphone access was denied. Please enable it in your browser settings.')
                setShowPermissionHelp(true)
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                setPermissionError('No microphone found. Please connect a microphone and try again.')
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                setPermissionError('Microphone is already in use by another application.')
            } else if (error.name === 'SecurityError') {
                setPermissionError('Microphone access blocked due to security restrictions. Please use HTTPS.')
            } else {
                setPermissionError('Failed to access microphone: ' + (error.message || 'Unknown error'))
            }
            
            return false
        }
    }, [])
    
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
                        
                        setUserTranscript(finalTranscript + interimTranscript)
                    }
                    
                    recognitionInstance.onstart = () => {
                        finalTranscript = ''
                        setIsListening(true)
                        setUserTranscript('')
                    }
                    
                    recognitionInstance.onend = () => {
                        setIsListening(false)
                        
                        if (finalTranscript.trim()) {
                            handleUserQuery(finalTranscript.trim())
                        }
                    }
                    
                    recognitionInstance.onerror = (event) => {
                        setIsListening(false)
                        
                        // Handle specific errors with state instead of alerts
                        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                            setPermissionError('Microphone access denied. Please enable microphone permissions.')
                            setShowPermissionHelp(true)
                        } else if (event.error === 'network') {
                            setPermissionError('Network error. Please check your internet connection.')
                        } else if (event.error === 'no-speech') {
                            // Silently handle no-speech error - it's normal when user doesn't speak
                            // Just stop listening without showing an error
                            if (audioLevelInterval.current) {
                                clearInterval(audioLevelInterval.current)
                                setAudioLevel(0)
                            }
                        } else {
                            // Log other errors for debugging but don't show alerts for minor issues
                            console.error('Speech recognition error:', event.error)
                        }
                    }
                    
                    setRecognition(recognitionInstance)
                    recognitionRef.current = recognitionInstance
                } catch (error) {
                    console.error('Failed to initialize speech recognition:', error)
                }
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
                                console.log('Voices loaded:', loadedVoices.length)
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
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
            }
            if (recognitionRef.current && isListening) {
                recognitionRef.current.stop()
            }
            if (synthRef.current && isSpeaking) {
                synthRef.current.cancel()
            }
        }
    }, [])
    
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
            const response = await fetch('/api/voice-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    language: detectedLanguage,
                    conversationHistory: newHistory.slice(-5)
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
            
            // Update orb animation based on emotion
            const emotionalAnim = getEmotionalAnimation(emotion, emotionLevel)
            setOrbIntensity(emotionalAnim.orbIntensity)
            setOrbVolume(emotionalAnim.orbVolume)
            
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
            
            // Update orb for sad emotion
            const sadAnimation = getEmotionalAnimation('sad', 0.4)
            setOrbIntensity(sadAnimation.orbIntensity)
            setOrbVolume(sadAnimation.orbVolume)
            
            userInteractedRef.current = true
            setTimeout(() => {
                speakResponse(errorMessage, currentLanguage, 'sad', 0.4)
            }, 100)
        } finally {
            setIsProcessing(false)
        }
    }
    
    const speakResponse = useCallback((text, language, emotion = 'natural', emotionLevel = 0.5) => {
        if (!text || !text.trim()) return
        
        const speechSynth = synth || (typeof window !== 'undefined' && window.speechSynthesis)
        if (!speechSynth) {
            console.error('Speech synthesis not available')
            return
        }
        
        // Cancel any ongoing speech immediately
        speechSynth.cancel()
        
        // For mobile browsers, we need to ensure voices are loaded
        const speakWithVoice = () => {
            try {
                const utterance = new SpeechSynthesisUtterance(text)
                const langCode = getSpeechLanguageCode(language)
                utterance.lang = langCode
                
                // Get emotional voice parameters
                const emotionalParams = getEmotionalVoiceParams(emotion, emotionLevel)
                utterance.rate = emotionalParams.rate
                utterance.pitch = emotionalParams.pitch
                utterance.volume = emotionalParams.volume
                
                // Try to get a voice for the language (important for mobile)
                try {
                    const voices = speechSynth.getVoices()
                    if (voices.length > 0) {
                        // Try to select an emotional voice
                        const selectedVoice = selectEmotionalVoice(langCode, emotion, voices)
                        if (selectedVoice) {
                            utterance.voice = selectedVoice
                        } else {
                            // Find a voice matching the language
                            const matchingVoice = voices.find(voice => 
                                voice.lang.startsWith(langCode.split('-')[0]) || 
                                voice.lang === langCode
                            )
                            if (matchingVoice) {
                                utterance.voice = matchingVoice
                            } else if (voices.length > 0) {
                                // Fallback to first available voice
                                utterance.voice = voices[0]
                            }
                        }
                    }
                } catch (voiceError) {
                    // If voice selection fails, continue with default
                    console.warn('Could not select voice, using default:', voiceError)
                }
                
                utterance.onstart = () => {
                    // console.log('Speech started with emotion:', emotion)
                    setIsSpeaking(true)
                }
                
                utterance.onend = () => {
                    console.log('Speech ended')
                    setIsSpeaking(false)
                    setCurrentUtterance(null)
                }
                
                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event.error, event)
                    setIsSpeaking(false)
                    setCurrentUtterance(null)
                }
                
                setCurrentUtterance(utterance)
                
                // For mobile browsers, we need to call speak() directly
                // Some mobile browsers require this to be in the same call stack as user interaction
                try {
                    speechSynth.speak(utterance)
                } catch (speakError) {
                    console.error('Error calling speak:', speakError)
                    // Retry with requestAnimationFrame as fallback
                    requestAnimationFrame(() => {
                        try {
                            speechSynth.speak(utterance)
                        } catch (retryError) {
                            console.error('Error on retry:', retryError)
                            setIsSpeaking(false)
                        }
                    })
                }
            } catch (error) {
                console.error('Error creating utterance:', error)
                setIsSpeaking(false)
            }
        }
        
        // Check if voices are loaded, if not wait a bit
        const voices = speechSynth.getVoices()
        if (voices.length === 0) {
            // Voices not loaded yet, wait for them
            const voicesChangedHandler = () => {
                speechSynth.removeEventListener('voiceschanged', voicesChangedHandler)
                speakWithVoice()
            }
            speechSynth.addEventListener('voiceschanged', voicesChangedHandler)
            
            // Fallback timeout in case voiceschanged doesn't fire
            setTimeout(() => {
                speechSynth.removeEventListener('voiceschanged', voicesChangedHandler)
                speakWithVoice()
            }, 500)
        } else {
            // Voices already loaded, speak immediately
            // For mobile, we need to call this synchronously to maintain user interaction context
            speakWithVoice()
        }
    }, [synth])
    
    const toggleListening = useCallback(async () => {
        if (!recognition) {
            setPermissionError('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.')
            return
        }
        
        if (isListening) {
            // Stop listening
            recognition.stop()
            setIsListening(false)
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
                setAudioLevel(0)
            }
            
            // Stop microphone stream
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(track => track.stop())
                micStreamRef.current = null
            }
        } else {
            // Stop any ongoing speech
            if (isSpeaking && synth) {
                synth.cancel()
                setIsSpeaking(false)
            }
            
            // Check/request microphone permission first
            const hasPermission = await requestMicrophonePermission()
            
            if (!hasPermission) {
                return // Error message already set by requestMicrophonePermission
            }
            
            try {
                // Start speech recognition
                recognition.lang = getLanguageCode(currentLanguage)
                recognition.start()
                
                // Audio level animation
                audioLevelInterval.current = setInterval(() => {
                    setAudioLevel(Math.random() * 80 + 20)
                }, 100)
            } catch (error) {
                console.error('Speech recognition error:', error)
                setPermissionError('Failed to start speech recognition. Please try again.')
            }
        }
    }, [recognition, isListening, isSpeaking, synth, currentLanguage, requestMicrophonePermission])
    
    const stopSpeaking = () => {
        const speechSynth = synth || (typeof window !== 'undefined' && window.speechSynthesis)
        if (speechSynth && isSpeaking) {
            speechSynth.cancel()
            setIsSpeaking(false)
        }
    }

    useEffect(() => {
        if (isSpeaking) {
            // Use emotional animation settings when available
            const emotionalAnim = getEmotionalAnimation(currentEmotion, emotionIntensity)
            setOrbIntensity(emotionalAnim.orbIntensity)
            setOrbVolume(emotionalAnim.orbVolume)
        } else if (isListening) {
            setOrbIntensity(2)
            setOrbVolume(Math.min(audioLevel / 100, 1))
        } else {
            setOrbIntensity(1.2)
            setOrbVolume(0.05)
        }
    }, [isSpeaking, isListening, audioLevel, currentEmotion, emotionIntensity])

    const stateLabel = isSpeaking
        ? 'AI speaking'
        : isListening
            ? 'Listening'
            : isProcessing
                ? 'Processing'
                : 'Tap to start'
    
    return (
        <AuthGuard>
            <div className="min-h-screen w-full text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-30" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-size-[22px_22px]" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12 lg:py-16 space-y-10">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => router.back()}
                                className="text-white/80 hover:text-white border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Voice Studio</p>
                                {/* <h1 className="text-2xl sm:text-3xl font-semibold">Sonic Conversation</h1> */}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/70 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-emerald-400' : isListening ? 'bg-sky-400' : 'bg-zinc-400'}`} />
                                {stateLabel}
                            </div>
                            {currentEmotion !== 'natural' && (
                                <>
                                    <span className="text-white/30">•</span>
                                    <span className="text-xs capitalize flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" style={{ 
                                            boxShadow: `0 0 4px currentColor` 
                                        }} />
                                        {currentEmotion}
                                        <span className="text-white/50">({Math.round(emotionIntensity * 100)}%)</span>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Error Message Banner */}
                    {permissionError && (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm text-red-200 font-medium">{permissionError}</p>
                                    {showPermissionHelp && (
                                        <div className="text-xs text-red-300/80 space-y-1 pl-2 border-l-2 border-red-500/30">
                                            <p className="font-semibold">How to enable microphone:</p>
                                            {isMobile ? (
                                                <>
                                                    <p>• <strong>iOS Safari:</strong> Settings → Safari → Camera & Microphone → Allow</p>
                                                    <p>• <strong>Android Chrome:</strong> Site Settings → Microphone → Allow</p>
                                                    <p>• Refresh this page after enabling permissions</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>• Click the microphone icon in your browser's address bar</p>
                                                    <p>• Select "Always allow" for this site</p>
                                                    <p>• Refresh the page if needed</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {showPermissionHelp && (
                                        <Button
                                            onClick={() => {
                                                setPermissionError('')
                                                setShowPermissionHelp(false)
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 text-xs border-red-400/40 text-red-200 hover:bg-red-500/20"
                                        >
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div className="space-y-6">
                            <div className="relative">
                                <div className="absolute inset-6 rounded-4xl bg-linear-to-b from-white/8 via-white/0 to-white/0 blur-3xl" />
                                <VoiceOrb
                                    intensity={orbIntensity}
                                    volume={orbVolume}
                                    stateLabel={stateLabel}
                                    onToggle={toggleListening}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">Live transcript</p>
                                    <span className="text-xs text-white/50">Lang: {getLanguageCode(currentLanguage)}</span>
                                </div>
                                <p className="text-lg font-medium text-white/90 min-h-[72px] leading-relaxed">
                                    {userTranscript || 'Say something and we will transcribe it here.'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 sm:p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">AI response</p>
                                    {isProcessing && <span className="text-xs text-amber-300">Processing…</span>}
                                </div>
                                <p className="text-lg font-medium text-white/90 min-h-[72px] leading-relaxed">
                                    {aiResponse || 'Responses will appear here once processed.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                        <Button
                            onClick={toggleListening}
                            disabled={isProcessing || isSpeaking}
                            size="lg"
                            className={`w-full h-14 text-base font-semibold cursor-pointer transition-all duration-300 ${
                                isListening
                                    ? 'bg-rose-500/90 hover:bg-rose-600/90 text-white shadow-lg shadow-rose-500/50'
                                    : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                            }`}
                        >
                            {isListening ? (
                                <>
                                    <MicOff className="w-5 h-5 mr-2" />
                                    Stop Listening
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5 mr-2" />
                                    Start Speaking
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={stopSpeaking}
                            disabled={!isSpeaking}
                            variant="outline"
                            size="lg"
                            className="w-full h-14 text-base font-semibold border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
                        >
                            <VolumeX className="w-5 h-5 mr-2" />
                            Stop Speaking
                        </Button>

                        <Button
                            onClick={() => {
                                userInteractedRef.current = true
                                if (aiResponse) {
                                    speakResponse(aiResponse, currentLanguage, currentEmotion, emotionIntensity)
                                }
                            }}
                            disabled={!aiResponse || isSpeaking || isListening || isProcessing}
                            variant="outline"
                            size="lg"
                            className="w-full h-14 text-base font-semibold border-indigo-400/40 text-white hover:bg-indigo-500/20 backdrop-blur-sm"
                        >
                            <Volume2 className="w-5 h-5 mr-2" />
                            Play Response
                        </Button>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}

export default VoiceAIPage
