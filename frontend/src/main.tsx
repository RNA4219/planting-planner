import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'

import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/swClient'

const scheduleAfterIdle = (callback: () => void) => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number
  }

  if (typeof globalWithIdle.requestIdleCallback === 'function') {
    let fallbackTimeoutId: ReturnType<typeof globalThis.setTimeout> | null =
      globalThis.setTimeout(callback, 3000)

    globalWithIdle.requestIdleCallback(() => {
      if (fallbackTimeoutId !== null) {
        globalThis.clearTimeout(fallbackTimeoutId)
        fallbackTimeoutId = null
      }

      callback()
    })

    return
  }

  globalThis.setTimeout(callback, 1500)
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

startWebVitalsTracking()

const scheduleServiceWorkerRegistration = () => {
  const invokeRegistration = () => {
    void registerServiceWorker()
  }

  if (typeof window === 'undefined') {
    invokeRegistration()
    return
  }

  const runAfterWindowLoad = (callback: () => void) => {
    if (document.readyState === 'complete') {
      callback()
      return
    }

    window.addEventListener('load', () => callback(), { once: true })
  }

  runAfterWindowLoad(() => {
    scheduleAfterIdle(invokeRegistration)
  })
}

scheduleServiceWorkerRegistration()
