/**
 * Orb State & Motion Architecture for ChatBox AI Voice Core
 *
 * Defines orb states, motion mappings, color palettes, and smooth state interpolation.
 */

export const ORB_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error',
  DISABLED: 'disabled'
}

// ChatBox AI Emerald/Teal Design System Colors
export const ORB_PALETTES = {
  emerald: {
    primary: '#00E6C3',      // Bright emerald/cyan primary
    bright: '#66FFE5',       // Bright cyan highlight (5-10%)
    secondary: '#00BFA5',    // Secondary emerald (40-50%)
    deepEmerald: '#008F78',  // Deep emerald (20-30%)
    deepTeal: '#00483F',     // Deep teal background/back particles
    atmosphere: '#00352F',   // Atmospheric background glow
  },
  error: {
    primary: '#fb7185',
    bright: '#fecdd3',
    secondary: '#f43f5e',
    deepEmerald: '#e11d48',
    deepTeal: '#881337',
    atmosphere: '#4c0519',
  },
  disabled: {
    primary: '#71717a',
    bright: '#a1a1aa',
    secondary: '#52525b',
    deepEmerald: '#3f3f46',
    deepTeal: '#27272a',
    atmosphere: '#18181b',
  }
}

// Motion configs per state
export const ORB_STATE_CONFIGS = {
  [ORB_STATES.IDLE]: {
    name: 'idle',
    speed: 0.25,
    rotationSpeedY: 0.003,
    rotationSpeedX: 0.001,
    breathAmplitude: 0.02,
    breathFrequency: 1.2,
    rippleAmplitude: 0.0,
    pulseAmplitude: 0.01,
    flowAmplitude: 0.01,
    coreIntensity: 0.5,
    glowIntensity: 0.4,
    audioReactivity: 0.0,
    motionType: 'none',
    palette: 'emerald'
  },
  [ORB_STATES.CONNECTING]: {
    name: 'connecting',
    speed: 0.5,
    rotationSpeedY: 0.008,
    rotationSpeedX: 0.004,
    breathAmplitude: 0.03,
    breathFrequency: 2.0,
    rippleAmplitude: 0.02,
    pulseAmplitude: 0.03,
    flowAmplitude: 0.03,
    coreIntensity: 0.7,
    glowIntensity: 0.6,
    audioReactivity: 0.1,
    motionType: 'orbital',
    palette: 'emerald'
  },
  [ORB_STATES.LISTENING]: {
    name: 'listening',
    speed: 0.7,
    rotationSpeedY: 0.006,
    rotationSpeedX: 0.003,
    breathAmplitude: 0.04,
    breathFrequency: 2.5,
    rippleAmplitude: 0.10,
    pulseAmplitude: 0.02,
    flowAmplitude: 0.04,
    coreIntensity: 0.9,
    glowIntensity: 0.85,
    audioReactivity: 0.8,
    motionType: 'ripple',
    palette: 'emerald'
  },
  [ORB_STATES.THINKING]: {
    name: 'thinking',
    speed: 0.45,
    rotationSpeedY: 0.012,
    rotationSpeedX: 0.006,
    breathAmplitude: 0.03,
    breathFrequency: 1.8,
    rippleAmplitude: 0.02,
    pulseAmplitude: 0.08,
    flowAmplitude: 0.03,
    coreIntensity: 0.75,
    glowIntensity: 0.7,
    audioReactivity: 0.2,
    motionType: 'pulse',
    palette: 'emerald'
  },
  [ORB_STATES.SPEAKING]: {
    name: 'speaking',
    speed: 0.85,
    rotationSpeedY: 0.007,
    rotationSpeedX: 0.004,
    breathAmplitude: 0.05,
    breathFrequency: 3.0,
    rippleAmplitude: 0.04,
    pulseAmplitude: 0.04,
    flowAmplitude: 0.12,
    coreIntensity: 0.95,
    glowIntensity: 0.9,
    audioReactivity: 1.0,
    motionType: 'flow',
    palette: 'emerald'
  },
  [ORB_STATES.ERROR]: {
    name: 'error',
    speed: 0.4,
    rotationSpeedY: 0.005,
    rotationSpeedX: 0.002,
    breathAmplitude: 0.03,
    breathFrequency: 2.0,
    rippleAmplitude: 0.05,
    pulseAmplitude: 0.06,
    flowAmplitude: 0.02,
    coreIntensity: 0.8,
    glowIntensity: 0.75,
    audioReactivity: 0.1,
    motionType: 'pulse',
    palette: 'error'
  },
  [ORB_STATES.DISABLED]: {
    name: 'disabled',
    speed: 0.05,
    rotationSpeedY: 0.001,
    rotationSpeedX: 0.0005,
    breathAmplitude: 0.005,
    breathFrequency: 0.5,
    rippleAmplitude: 0.0,
    pulseAmplitude: 0.0,
    flowAmplitude: 0.0,
    coreIntensity: 0.2,
    glowIntensity: 0.15,
    audioReactivity: 0.0,
    motionType: 'none',
    palette: 'disabled'
  }
}

/**
 * Exponential approach (lerp) utility for smooth state value transitions
 */
export function approach(current, target, factor) {
  return current + (target - current) * factor
}

/**
 * Creates and updates an interpolated state mix object between current and target state.
 */
export function createStateMix(initialState = ORB_STATES.IDLE) {
  const targetConfig = ORB_STATE_CONFIGS[initialState] || ORB_STATE_CONFIGS[ORB_STATES.IDLE]
  
  return {
    state: initialState,
    speed: targetConfig.speed,
    rotationSpeedY: targetConfig.rotationSpeedY,
    rotationSpeedX: targetConfig.rotationSpeedX,
    breathAmplitude: targetConfig.breathAmplitude,
    breathFrequency: targetConfig.breathFrequency,
    rippleAmplitude: targetConfig.rippleAmplitude,
    pulseAmplitude: targetConfig.pulseAmplitude,
    flowAmplitude: targetConfig.flowAmplitude,
    coreIntensity: targetConfig.coreIntensity,
    glowIntensity: targetConfig.glowIntensity,
    audioReactivity: targetConfig.audioReactivity,
    colorMix: targetConfig.palette === 'error' ? 1 : 0, // 0 = emerald, 1 = error
    disabledMix: targetConfig.palette === 'disabled' ? 1 : 0,

    update(targetStateName, dt = 0.016) {
      const target = ORB_STATE_CONFIGS[targetStateName] || ORB_STATE_CONFIGS[ORB_STATES.IDLE]
      const factor = Math.min(1, dt * 6) // ~180-300ms smooth transition

      this.state = targetStateName
      this.speed = approach(this.speed, target.speed, factor)
      this.rotationSpeedY = approach(this.rotationSpeedY, target.rotationSpeedY, factor)
      this.rotationSpeedX = approach(this.rotationSpeedX, target.rotationSpeedX, factor)
      this.breathAmplitude = approach(this.breathAmplitude, target.breathAmplitude, factor)
      this.breathFrequency = approach(this.breathFrequency, target.breathFrequency, factor)
      this.rippleAmplitude = approach(this.rippleAmplitude, target.rippleAmplitude, factor)
      this.pulseAmplitude = approach(this.pulseAmplitude, target.pulseAmplitude, factor)
      this.flowAmplitude = approach(this.flowAmplitude, target.flowAmplitude, factor)
      this.coreIntensity = approach(this.coreIntensity, target.coreIntensity, factor)
      this.glowIntensity = approach(this.glowIntensity, target.glowIntensity, factor)
      this.audioReactivity = approach(this.audioReactivity, target.audioReactivity, factor)

      const targetColorMix = target.palette === 'error' ? 1 : 0
      this.colorMix = approach(this.colorMix, targetColorMix, factor)

      const targetDisabled = target.palette === 'disabled' ? 1 : 0
      this.disabledMix = approach(this.disabledMix, targetDisabled, factor)
    }
  }
}
