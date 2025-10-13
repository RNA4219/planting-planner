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

const VARIANT_CLASS_NAMES: Record<ToastVariant, string> = {
  success: 'toast--success bg-market-success text-white',
  error: 'toast--error bg-market-error text-white',
  warning: 'toast--warning bg-market-warning text-white',
  info: 'toast--info bg-market-info text-white',
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
    <div
      className="toast-stack fixed inset-x-4 top-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-6 sm:top-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${VARIANT_CLASS_NAMES[toast.variant]} flex w-full items-start gap-3 rounded-xl px-4 py-3 font-semibold shadow-2xl sm:w-auto sm:min-w-[260px] sm:max-w-[360px]`}
          role="alert"
        >
          <div className="flex-1 space-y-1">
            <p>{toast.message}</p>
            {toast.detail ? <p className="text-sm font-normal text-white/80">{toast.detail}</p> : null}
          </div>
          {onDismiss ? (
            <button
              type="button"
              aria-label="閉じる"
              className="ml-2 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/30 text-lg text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
