import { useCallback, useEffect, useRef } from 'react'

import type { RefreshToast } from '../hooks/useRefreshStatus'

const AUTO_DISMISS_MS = 5000

type ToastStackProps = {
  readonly toasts: ReadonlyArray<RefreshToast>
  readonly onDismiss: (id: string) => void
}

const formatDetail = (toast: RefreshToast): string | null => {
  if (!toast.detail) {
    return null
  }
  if (toast.variant === 'success' && toast.detail.startsWith('更新件数: ')) {
    return `${toast.detail}件`
  }
  return toast.detail
}

export const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const timers = timersRef.current
    const activeIds = new Set(toasts.map((toast) => toast.id))
    for (const [id, timer] of timers.entries()) {
      if (!activeIds.has(id)) {
        clearTimeout(timer)
        timers.delete(id)
      }
    }
    toasts.forEach((toast) => {
      if (timers.has(toast.id)) {
        return
      }
      const timer = setTimeout(() => {
        timers.delete(toast.id)
        onDismiss(toast.id)
      }, AUTO_DISMISS_MS)
      timers.set(toast.id, timer)
    })
  }, [onDismiss, toasts])

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => {
        clearTimeout(timer)
      })
      timersRef.current.clear()
    },
    [],
  )

  const handleDismiss = useCallback(
    (id: string) => {
      const timers = timersRef.current
      const timer = timers.get(id)
      if (timer) {
        clearTimeout(timer)
        timers.delete(id)
      }
      onDismiss(id)
    },
    [onDismiss],
  )

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" aria-live="assertive" aria-atomic="true">
      {toasts.map((toast) => {
        const detail = formatDetail(toast)
        return (
          <div key={toast.id} className={`toast toast--${toast.variant}`} role="alert">
            <div className="toast__content">
              <p className="toast__message">{toast.message}</p>
              {detail ? <p className="toast__detail">{detail}</p> : null}
            </div>
            <button
              type="button"
              className="toast__dismiss"
              aria-label="通知を閉じる"
              onClick={() => handleDismiss(toast.id)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastStack
