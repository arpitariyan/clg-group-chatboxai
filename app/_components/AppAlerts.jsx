"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2Icon, InfoIcon, AlertTriangleIcon, CircleXIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ALERT_EVENT_NAME, emitAlert } from "@/lib/alert"
import { isSoundEffectsEnabled } from "@/lib/user-preferences"

function getAlertVariant(type) {
  if (type === "success") return "success"
  if (type === "error") return "destructive"
  if (type === "warning") return "warning"
  if (type === "info") return "info"
  return "default"
}

function getAlertIcon(type) {
  if (type === "success") return <CheckCircle2Icon />
  if (type === "error") return <CircleXIcon />
  if (type === "warning") return <AlertTriangleIcon />
  return <InfoIcon />
}

export default function AppAlerts() {
  const [alerts, setAlerts] = useState([])

  const playAlertSound = () => {
    if (typeof window === "undefined") return
    if (!isSoundEffectsEnabled()) return

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return

      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "sine"
      oscillator.frequency.value = 740

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.02, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.11)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.12)
      oscillator.onended = () => {
        audioContext.close().catch(() => {})
      }
    } catch {
      // Audio feedback failure should never block alerts.
    }
  }

  useEffect(() => {
    const timers = new Map()

    const removeAlert = (id) => {
      setAlerts((prev) => prev.filter((item) => item.id !== id))
      const timer = timers.get(id)
      if (timer) {
        clearTimeout(timer)
        timers.delete(id)
      }
    }

    const onAlert = (event) => {
      const detail = event?.detail
      if (!detail?.id) return

      setAlerts((prev) => [detail, ...prev].slice(0, 5))
      playAlertSound()

      if (detail.duration > 0) {
        const timerId = setTimeout(() => removeAlert(detail.id), detail.duration)
        timers.set(detail.id, timerId)
      }
    }

    window.addEventListener(ALERT_EVENT_NAME, onAlert)

    // Route native alert() through the same shadcn alert UI.
    const originalAlert = window.alert
    window.alert = (message) => {
      emitAlert("warning", String(message || ""), {
        title: "Notice",
        autoClose: 5000,
      })
    }

    return () => {
      window.removeEventListener(ALERT_EVENT_NAME, onAlert)
      window.alert = originalAlert
      timers.forEach((timerId) => clearTimeout(timerId))
    }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-100 grid w-[min(92vw,28rem)] gap-3">
      {alerts.map((item) => (
        <Alert key={item.id} variant={getAlertVariant(item.type)} className="pointer-events-auto shadow-lg">
          {getAlertIcon(item.type)}
          <button
            type="button"
            onClick={() => setAlerts((prev) => prev.filter((entry) => entry.id !== item.id))}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition hover:opacity-100"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertTitle className="pr-6">{item.title}</AlertTitle>
          <AlertDescription>{item.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
