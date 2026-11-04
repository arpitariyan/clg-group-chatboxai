import { useRef, useEffect, useCallback } from 'react'

/**
 * Custom hook for audio level reactivity in ParticlesOrb.
 *
 * Normalizes, clamps, applies a soft non-linear response curve,
 * and low-pass filters (smooths) incoming audio level values to prevent jitter.
 */
export function useOrbLevel(levelRef, options = {}) {
  const {
    smoothing = 0.15,
    curveExponent = 0.7, // Non-linear curve: boosts low levels smoothly without blowing out high peaks
    minLevel = 0,
    maxLevel = 1
  } = options

  const smoothedRef = useRef(0)
  const animFrameRef = useRef(null)

  const getLevel = useCallback(() => {
    const raw = typeof levelRef?.current === 'number' ? levelRef.current : 0
    const clamped = Math.max(minLevel, Math.min(maxLevel, raw))
    const normalized = (clamped - minLevel) / (maxLevel - minLevel || 1)
    
    // Soft response curve
    const target = Math.pow(normalized, curveExponent)
    
    // Exponential smoothing (low-pass filter)
    smoothedRef.current = smoothedRef.current + (target - smoothedRef.current) * smoothing
    
    return smoothedRef.current
  }, [levelRef, minLevel, maxLevel, curveExponent, smoothing])

  useEffect(() => {
    let active = true

    const updateLoop = () => {
      if (!active) return
      getLevel()
      animFrameRef.current = requestAnimationFrame(updateLoop)
    }

    updateLoop()

    return () => {
      active = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [getLevel])

  return {
    smoothedRef,
    getLevel
  }
}

export default useOrbLevel
