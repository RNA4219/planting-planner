import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const scheduleAfterIdle = (callback: () => void) => {
  let hasExecuted = false

  const runOnce = () => {
    if (hasExecuted) {
      return
    }
    hasExecuted = true
    callback()
  }

  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    const timerWithMetadata = setTimeout as typeof setTimeout & { clock?: unknown }
    const supportsTimerFallback = Object.prototype.hasOwnProperty.call(
      timerWithMetadata,
      'clock',
    )
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined

    const idleHandle = globalWithIdle.requestIdleCallback(() => {
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer)
      }
      runOnce()
    })

    if (supportsTimerFallback) {
      fallbackTimer = setTimeout(() => {
        if (typeof globalWithIdle.cancelIdleCallback === 'function') {
          globalWithIdle.cancelIdleCallback(idleHandle)
        }
        runOnce()
      }, 1000)
    }

    return
  }

  setTimeout(runOnce, 0)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root element not found')
}

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

let hasScheduledPostLoadTasks = false

const schedulePostLoadTasks = () => {
  if (hasScheduledPostLoadTasks) {
    return
  }
  hasScheduledPostLoadTasks = true

  scheduleAfterIdle(() => {
    void import('./lib/webVitals').then(({ startWebVitalsTracking }) => {
      startWebVitalsTracking()
    })
    void registerServiceWorker()

if (document.readyState === 'complete') {
  schedulePostLoadTasks()
} else {
  window.addEventListener('load', () => {
    schedulePostLoadTasks()
  })
}
