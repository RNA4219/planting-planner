import { useCallback, useEffect, useRef } from 'react'

import { TOAST_AUTO_DISMISS_MS } from '../constants/toast'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastStackItem {
  readonly id: string
  readonly variant: ToastVariant
  readonly message: string
  readonly detail?: string | null
}

export interface ToastStackProps {
  readonly toasts: ReadonlyArray<ToastStackItem>
  readonly onDismiss?: (id: string) => void
  readonly autoCloseDurationMs?: number
}

export const ToastStack = ({
  toasts,
  onDismiss,
  autoCloseDurationMs = TOAST_AUTO_DISMISS_MS,
}: ToastStackProps) => {
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const prevDuration = useRef<number | undefined>(autoCloseDurationMs)

  const stopTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      stopTimer(id)
      onDismiss?.(id)
    },
    [onDismiss, stopTimer],
  )

  useEffect(() => {
    const duration = autoCloseDurationMs
    const timers = timersRef.current

    if (!onDismiss || duration == null || duration <= 0) {
      timers.forEach(clearTimeout)
      timers.clear()
      prevDuration.current = duration ?? undefined
      return
    }

    if (prevDuration.current !== duration) {
      timers.forEach(clearTimeout)
      timers.clear()
      prevDuration.current = duration
    }

    const active = new Set(toasts.map((toast) => toast.id))
    timers.forEach((timer, id) => {
      if (!active.has(id)) {
        clearTimeout(timer)
        timers.delete(id)
      }
    })

    toasts.forEach((toast) => {
      if (!timers.has(toast.id)) {
        const timer = setTimeout(() => {
          timers.delete(toast.id)
          onDismiss(toast.id)
        }, duration)
        timers.set(toast.id, timer)
      }
    })
  }, [autoCloseDurationMs, onDismiss, toasts])

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current.clear()
  }, [])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.variant}`} role="alert">
          <div>
            <div>{toast.message}</div>
            {toast.detail ? <div>{toast.detail}</div> : null}
          </div>
          {onDismiss ? (
            <button type="button" aria-label="閉じる" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
