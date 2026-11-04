'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { ORB_STATES, ORB_PALETTES, createStateMix } from '@/lib/orb-state'
import { useOrbLevel } from '@/hooks/use-orb-level'
import '@/app/(routes)/voice-ai/voice-ai.css'

/**
 * Fibonacci sphere particle generator
 */
function createParticleField(count = 720) {
  const particles = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)

    const x0 = Math.sin(phi) * Math.cos(theta)
    const y0 = Math.sin(phi) * Math.sin(theta)
    const z0 = Math.cos(phi)

    // Assign brightness tier:
    // 5-10% bright cyan (#66FFE5)
    // 20-30% bright emerald (#00E6C3)
    // 40-50% medium emerald (#00BFA5)
    // 20-30% deep teal (#00483F)
    const rand = Math.random()
    let tier = 'medium'
    if (rand < 0.08) tier = 'highlight'
    else if (rand < 0.35) tier = 'bright'
    else if (rand < 0.75) tier = 'medium'
    else tier = 'deep'

    particles.push({
      x0, y0, z0,
      x: x0, y: y0, z: z0,
      baseRadius: 1.2 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.0,
      tier
    })
  }

  return particles
}

/**
 * Color hex to RGBA object converter
 */
function hexToRgb(hex) {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const num = parseInt(c, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

/**
 * Interpolate RGB colors
 */
function interpolateColor(c1, c2, factor) {
  const f = Math.max(0, Math.min(1, factor))
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * f),
    g: Math.round(c1.g + (c2.g - c1.g) * f),
    b: Math.round(c1.b + (c2.b - c1.b) * f)
  }
}

const ParticlesOrb = forwardRef(function ParticlesOrb({
  state = ORB_STATES.IDLE,
  size = 300,
  speed = 1.0,
  colorFrom = '#00E6C3',
  colorTo = '#66FFE5',
  levelRef = null,
  label = 'AI Voice Core',
  className = ''
}, ref) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  // Expose canvas element through forwardRef
  useImperativeHandle(ref, () => canvasRef.current)

  // Audio level hook
  const { smoothedRef } = useOrbLevel(levelRef, { smoothing: 0.18 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let isVisible = true
    let isTabActive = true
    let prefersReducedMotion = false

    // Check reduced motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }

    // Initialize particles & state mix
    const particles = createParticleField(720)
    const stateMix = createStateMix(state)

    let rotX = 0
    let rotY = 0
    let lastTime = performance.now()

    // Visibility Observer
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    }, { threshold: 0.05 })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Palette Colors
    const emeraldPalette = ORB_PALETTES.emerald
    const errorPalette = ORB_PALETTES.error
    const disabledPalette = ORB_PALETTES.disabled

    const cPrimary = hexToRgb(colorFrom || emeraldPalette.primary)
    const cBright = hexToRgb(colorTo || emeraldPalette.bright)
    const cSecondary = hexToRgb(emeraldPalette.secondary)
    const cDeep = hexToRgb(emeraldPalette.deepTeal)
    const cError = hexToRgb(errorPalette.primary)
    const cDisabled = hexToRgb(disabledPalette.primary)

    function render(currentTime) {
      if (!isVisible || !isTabActive) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      const dt = Math.min(0.05, (currentTime - lastTime) / 1000)
      lastTime = currentTime

      // Handle Device Pixel Ratio
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = canvas.clientWidth || size
      const height = canvas.clientHeight || size

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Update State Interpolation
      stateMix.update(state, dt)

      const timeSec = currentTime * 0.001 * speed * (prefersReducedMotion ? 0.1 : 1.0)
      const audioLevel = (smoothedRef.current || 0) * stateMix.audioReactivity

      // 3D Rotations
      if (!prefersReducedMotion) {
        rotY += stateMix.rotationSpeedY * speed * (1 + audioLevel * 0.5)
        rotX += stateMix.rotationSpeedX * speed * (1 + audioLevel * 0.3)
      }

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY)
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX)

      const cx = width / 2
      const cy = height / 2
      const radius = (Math.min(width, height) * 0.36) * (1 + stateMix.disabledMix * -0.1)

      // Breathing scale
      const breath = 1.0 + Math.sin(timeSec * stateMix.breathFrequency) * stateMix.breathAmplitude

      // Transform and deform particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        let { x0, y0, z0 } = p

        // State Motion Deformations
        // 1. Idle / Floating Micro-drift
        let dx = Math.sin(timeSec * 1.5 + p.phase) * 0.02
        let dy = Math.cos(timeSec * 1.8 + p.phase) * 0.02
        let dz = Math.sin(timeSec * 2.1 + p.phase) * 0.02

        // 2. Ripple (Listening)
        if (stateMix.rippleAmplitude > 0.001) {
          const distFromCore = Math.sqrt(x0 * x0 + y0 * y0)
          const ripple = Math.sin(distFromCore * 5 - timeSec * 6) * (stateMix.rippleAmplitude + audioLevel * 0.18)
          dx += x0 * ripple
          dy += y0 * ripple
          dz += z0 * ripple
        }

        // 3. Pulse (Thinking)
        if (stateMix.pulseAmplitude > 0.001) {
          const pulse = Math.sin(y0 * 6 + timeSec * 5) * stateMix.pulseAmplitude
          dx += x0 * pulse
          dy += y0 * pulse
          dz += z0 * pulse
        }

        // 4. Flow (Speaking)
        if (stateMix.flowAmplitude > 0.001) {
          const flow = Math.sin(x0 * 4 + timeSec * 6) * Math.cos(y0 * 4 + timeSec * 5) * (stateMix.flowAmplitude + audioLevel * 0.2)
          dx += flow * 0.4
          dy += flow * 0.6
          dz += flow * 0.3
        }

        // 5. Orbital (Connecting)
        if (stateMix.motionType === 'orbital') {
          const orbitAngle = timeSec * 2 + z0 * 3
          dx += Math.sin(orbitAngle) * 0.05
          dy += Math.cos(orbitAngle) * 0.05
        }

        // Apply scale & 3D rotation
        let px = (x0 + dx) * breath
        let py = (y0 + dy) * breath
        let pz = (z0 + dz) * breath

        // Y-axis rotation
        let x1 = px * cosY - pz * sinY
        let z1 = px * sinY + pz * cosY

        // X-axis rotation
        let y1 = py * cosX - z1 * sinX
        let z2 = py * sinX + z1 * cosX

        p.x = x1
        p.y = y1
        p.z = z2
      }

      // Sort by Z depth for realistic 3D depth rendering
      particles.sort((a, b) => a.z - b.z)

      // ── Core Luminous Center Rendering ──────────────────────
      const coreRadius = radius * (0.65 + Math.sin(timeSec * 1.5) * 0.03 + audioLevel * 0.15)
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius)

      // Interpolate colors based on error / disabled mix
      let activePrimary = cPrimary
      let activeBright = cBright
      if (stateMix.colorMix > 0.01) {
        activePrimary = interpolateColor(cPrimary, cError, stateMix.colorMix)
        activeBright = interpolateColor(cBright, cError, stateMix.colorMix)
      } else if (stateMix.disabledMix > 0.01) {
        activePrimary = interpolateColor(cPrimary, cDisabled, stateMix.disabledMix)
        activeBright = interpolateColor(cBright, cDisabled, stateMix.disabledMix)
      }

      const coreAlpha = stateMix.coreIntensity * (1 - stateMix.disabledMix * 0.6)

      coreGradient.addColorStop(0, `rgba(${activeBright.r}, ${activeBright.g}, ${activeBright.b}, ${0.5 * coreAlpha})`)
      coreGradient.addColorStop(0.3, `rgba(${activePrimary.r}, ${activePrimary.g}, ${activePrimary.b}, ${0.25 * coreAlpha})`)
      coreGradient.addColorStop(0.7, `rgba(${cSecondary.r}, ${cSecondary.g}, ${cSecondary.b}, ${0.08 * coreAlpha})`)
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = coreGradient
      ctx.beginPath()
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2)
      ctx.fill()

      // ── Render Particles ────────────────────────────────────
      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Project 3D to 2D
        const screenX = cx + p.x * radius
        const screenY = cy + p.y * radius

        // Depth shading factor: front particles (z > 0) are larger & brighter
        const depthFactor = (p.z + 1.2) / 2.4 // 0 to 1
        const alphaDepth = Math.max(0.1, Math.min(1.0, depthFactor * 0.85 + 0.15))
        const sizeDepth = Math.max(0.6, depthFactor * 1.3 + 0.4)

        // Select color based on particle tier & depth
        let pColor = activePrimary
        let baseAlpha = 0.7

        if (p.tier === 'highlight') {
          pColor = activeBright
          baseAlpha = 0.95
        } else if (p.tier === 'bright') {
          pColor = activePrimary
          baseAlpha = 0.8
        } else if (p.tier === 'medium') {
          pColor = cSecondary
          baseAlpha = 0.6
        } else {
          pColor = cDeep
          baseAlpha = 0.35
        }

        const finalAlpha = baseAlpha * alphaDepth * (0.4 + stateMix.glowIntensity * 0.6) * (1 - stateMix.disabledMix * 0.7)
        const particleRadius = p.baseRadius * sizeDepth * (1 + audioLevel * 0.3)

        // Draw particle dot
        ctx.fillStyle = `rgba(${pColor.r}, ${pColor.g}, ${pColor.b}, ${finalAlpha})`
        ctx.beginPath()
        ctx.arc(screenX, screenY, Math.max(0.5, particleRadius), 0, Math.PI * 2)
        ctx.fill()

        // Highlight/front particles get a soft bloom halo
        if ((p.tier === 'highlight' || p.tier === 'bright') && p.z > 0.2 && !prefersReducedMotion) {
          ctx.fillStyle = `rgba(${activeBright.r}, ${activeBright.g}, ${activeBright.b}, ${finalAlpha * 0.3})`
          ctx.beginPath()
          ctx.arc(screenX, screenY, particleRadius * 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [size, speed, colorFrom, colorTo, state, levelRef])

  return (
    <div
      ref={containerRef}
      className={`particles-orb-container state-${state} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} - Status: ${state}`}
    >
      {/* Multi-layer atmospheric glow shells */}
      <div className="orb-atmosphere-glow" aria-hidden="true" />
      <div className="orb-emerald-halo" aria-hidden="true" />
      <div className="orb-cyan-bloom" aria-hidden="true" />

      {/* Canvas particle renderer */}
      <canvas
        ref={canvasRef}
        className="particles-orb-canvas"
        style={{ width: size, height: size }}
      />
    </div>
  )
})

export default ParticlesOrb
export { ParticlesOrb, ORB_STATES }
