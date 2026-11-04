'use client'

import React from 'react'
import ParticlesOrb from '@/components/ui/ParticlesOrb'
import { ORB_STATES } from '@/lib/orb-state'
import './voice-ai.css'

export default function StateCircle({
  state: stateProp = null,
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  isConnecting = false,
  isError = false,
  isDisabled = false,
  levelRef = null,
  size = 300,
  speed = 1.0,
  colorFrom = '#00E6C3',
  colorTo = '#66FFE5',
  onClick = () => {}
}) {
  // Map incoming flags to ORB_STATES
  let currentOrbState = ORB_STATES.IDLE

  if (stateProp) {
    currentOrbState = stateProp
  } else if (isError) {
    currentOrbState = ORB_STATES.ERROR
  } else if (isDisabled) {
    currentOrbState = ORB_STATES.DISABLED
  } else if (isSpeaking) {
    currentOrbState = ORB_STATES.SPEAKING
  } else if (isListening) {
    currentOrbState = ORB_STATES.LISTENING
  } else if (isProcessing) {
    currentOrbState = ORB_STATES.THINKING
  } else if (isConnecting) {
    currentOrbState = ORB_STATES.CONNECTING
  }

  return (
    <div className="state-circle-wrapper" onClick={onClick}>
      <ParticlesOrb
        state={currentOrbState}
        size={size}
        speed={speed}
        colorFrom={colorFrom}
        colorTo={colorTo}
        levelRef={levelRef}
        label="ChatBox AI Voice Core"
      />
    </div>
  )
}
