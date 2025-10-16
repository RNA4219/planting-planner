import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'
import { startWebVitalsTracking } from './lib/webVitals'

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

startWebVitalsTracking()

const scheduleServiceWorkerRegistration = () => {
  const invokeRegistration = () => {
    void registerServiceWorker()
  }

  if (typeof window === 'undefined') {
    invokeRegistration()
    return
  }

  const { requestIdleCallback } = window as Window & {
    requestIdleCallback?: (callback: () => void) => number
  }

  if (typeof requestIdleCallback === 'function') {
    let fallbackTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

    const registerOnce = () => {
      if (fallbackTimeoutId !== null) {
        globalThis.clearTimeout(fallbackTimeoutId)
        fallbackTimeoutId = null
      }
      invokeRegistration()
    }

    requestIdleCallback(() => {
      registerOnce()
    })

    fallbackTimeoutId = globalThis.setTimeout(registerOnce, 1500)
    return
  }

  globalThis.setTimeout(invokeRegistration, 1500)
}

scheduleServiceWorkerRegistration()
