'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Check, Play, Square, X, Volume2, Sparkles, User } from '@/components/ui/animated-icon'
import { Button } from '@/components/ui/button'
import { ASSISTANT_VOICES } from '@/lib/voice/voice-registry'

export default function VoiceSelectorModal({
  isOpen,
  onClose,
  selectedVoiceId,
  onSelectVoice,
}) {
  const [playingVoiceId, setPlayingVoiceId] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  if (!isOpen) return null

  const handleTogglePreview = (voice) => {
    // If playing the same voice, stop it
    if (playingVoiceId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlayingVoiceId(null)
      return
    }

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause()
    }

    // Play the new voice preview from static URL
    setPlayingVoiceId(voice.id)
    const audio = new Audio(voice.previewUrl)
    audioRef.current = audio
    
    audio.onended = () => {
      setPlayingVoiceId(null)
    }
    
    audio.onerror = (err) => {
      console.warn('Voice preview playback error:', err)
      setPlayingVoiceId(null)
    }

    audio.play().catch(err => {
      console.warn('Failed to play preview:', err)
      setPlayingVoiceId(null)
    })
  }

  const handleSelect = (voiceId) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    onSelectVoice(voiceId)
  }

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                Choose Assistant Voice
              </h2>
              <p className="text-xs text-muted-foreground">Select one of 5 distinct voice identities for your ChatBox AI assistant</p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full w-8 h-8 hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Voice Cards List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 my-1">
          {ASSISTANT_VOICES.map((voice) => {
            const isSelected = selectedVoiceId === voice.id
            const isPlayingThis = playingVoiceId === voice.id

            return (
              <div
                key={voice.id}
                onClick={() => handleSelect(voice.id)}
                className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/30'
                    : 'bg-accent/40 border-border/40 hover:bg-accent/70 hover:border-border'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 pr-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  }`}>
                    {voice.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{voice.name}</span>
                      <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/40">
                        {voice.gender}
                      </span>
                      {voice.isDefault && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{voice.description}</p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{voice.personality}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTogglePreview(voice)
                    }}
                    size="sm"
                    variant="outline"
                    className={`h-9 px-3 rounded-xl border text-xs gap-1.5 transition-all ${
                      isPlayingThis
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                        : 'border-border/60 hover:bg-accent text-foreground'
                    }`}
                  >
                    {isPlayingThis ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Preview
                      </>
                    )}
                  </Button>

                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border/60 group-hover:border-foreground/40 text-transparent'
                  }`}>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>Voice selection persists across sessions</span>
          <Button
            onClick={handleClose}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
