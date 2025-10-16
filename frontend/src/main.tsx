import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const isTestEnvironment = import.meta.env?.MODE === 'test'

const scheduleAfterIdle = (callback: () => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
  }

  let timeoutId: number | undefined

  const runCallback = () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timeoutId = undefined
    }
    callback()
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    globalWithIdle.requestIdleCallback(runCallback)
  }

  const shouldScheduleFallback =
    typeof globalWithIdle.requestIdleCallback !== 'function' || !isTestEnvironment || 'clock' in window.setTimeout

  if (shouldScheduleFallback) {
    timeoutId = window.setTimeout(runCallback, 0)
  }
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

if (!isTestEnvironment) {
  void import('./lib/webVitals').then(({ startWebVitalsTracking }) => {
    startWebVitalsTracking()
  })
}

let registrationScheduled = false

const scheduleServiceWorkerRegistration = () => {
  if (registrationScheduled) {
    return
  }
  registrationScheduled = true
  scheduleAfterIdle(() => {
    void registerServiceWorker()
  })
}

if (document.readyState === 'complete') {
  scheduleServiceWorkerRegistration()
} else {
  window.addEventListener('load', scheduleServiceWorkerRegistration, { once: true })
}
