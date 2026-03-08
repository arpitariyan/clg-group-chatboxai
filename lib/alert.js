const ALERT_EVENT_NAME = "app-alert"
const DEFAULT_DURATION = 4200

function normalizePayload(type, message, options = {}) {
  const isObjectMessage = typeof message === "object" && message !== null
  const title = options.title || (isObjectMessage ? message.title : null) || (
    type === "success"
      ? "Success"
      : type === "error"
        ? "Error"
        : type === "warning"
          ? "Warning"
          : "Info"
  )

  const description = options.description
    || (isObjectMessage ? message.description : null)
    || (typeof message === "string" ? message : "")

  return {
    id: options.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    description,
    duration: typeof options.autoClose === "number"
      ? options.autoClose
      : (typeof options.duration === "number" ? options.duration : DEFAULT_DURATION),
  }
}

export function emitAlert(type, message, options = {}) {
  if (typeof window === "undefined") return null

  const payload = normalizePayload(type, message, options)
  window.dispatchEvent(new CustomEvent(ALERT_EVENT_NAME, { detail: payload }))
  return payload.id
}

export const toast = {
  success: (message, options) => emitAlert("success", message, options),
  error: (message, options) => emitAlert("error", message, options),
  info: (message, options) => emitAlert("info", message, options),
  warning: (message, options) => emitAlert("warning", message, options),
}

export { ALERT_EVENT_NAME }
